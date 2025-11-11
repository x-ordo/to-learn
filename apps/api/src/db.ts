/**
 * 데이터 계층
 * -----------
 * 단일 모듈에서 SQLite(기본)와 메모리 저장소(폴백)를 모두 다룹니다.
 * - better-sqlite3를 사용할 수 없거나 설치가 실패하면 자동으로 메모리 모드로 전환됩니다.
 * - CRUD 헬퍼를 통해 라우터/서비스 레이어가 저장 방식에 의존하지 않도록 캡슐화합니다.
 *
 * 보안 메모: 파일 경로는 환경설정을 통해 주입되며, 사용자 입력은 SQL 파라미터 바인딩으로만 사용합니다.
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { config } from './env';
import type {
  Category,
  ConversationRecord,
  Difficulty,
  MessageRecord,
  SuggestionRecord
} from './types';

// ----------------------------------------------
// Storage bootstrap (SQLite w/ memory fallback)
// ----------------------------------------------
type StorageMode = 'sqlite' | 'memory';

interface MemoryStore {
  conversations: Map<string, ConversationRecord>;
  messages: MessageRecord[];
  suggestions: Map<string, SuggestionRecord>;
}

type SqliteDatabase = {
  prepare: (...args: any[]) => any;
  exec: (sql: string) => void;
  pragma: (pragma: string, options?: unknown) => unknown;
  transaction: (fn: (...args: any[]) => any) => (...args: any[]) => any;
};

const memoryStore: MemoryStore = {
  conversations: new Map(),
  messages: [],
  suggestions: new Map()
};

let storageMode: StorageMode = 'sqlite';
let db: SqliteDatabase | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BetterSqlite3 = require('better-sqlite3') as typeof import('better-sqlite3');
  const dbDir = path.dirname(config.sqlitePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new BetterSqlite3(config.sqlitePath) as SqliteDatabase;
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
} catch (error) {
  storageMode = 'memory';
  console.warn(
    '[to-learn] better-sqlite3 native 모듈을 불러오지 못했습니다. 재시작 시 초기화되는 메모리 저장소를 사용합니다.',
    (error as Error)?.message ?? error
  );
}

const ensureDb = (): SqliteDatabase => {
  if (!db) {
    throw new Error('SQLite database is not initialized.');
  }
  return db;
};

// 단순한 SQL 마이그레이션. 테이블이 없으면 생성합니다.
const migrations = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  model TEXT,
  difficulty TEXT,
  category TEXT,
  source TEXT,
  topic TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT,
  weight INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages(conversation_id, created_at);
`;

if (storageMode === 'sqlite' && db) {
  ensureDb().exec(migrations);
}

// 기본 추천 프롬프트 시드 데이터(처음 실행 시 한번만 저장)
const seedSuggestions: SuggestionRecord[] = [
  {
    id: 'suggest-risk',
    label: '리스크 관리 연습',
    prompt: 'PF 대출 리스크 요인을 짚어보고 완화 전략을 추천해줘.',
    category: '재무제표',
    weight: 10
  },
  {
    id: 'suggest-dcf',
    label: 'DCF 복습',
    prompt: 'DCF 모델의 핵심 가정을 정리해보고 민감도 분석 포인트를 알려줘.',
    category: '재무제표',
    weight: 8
  },
  {
    id: 'suggest-terms',
    label: '금융 용어 퀴즈',
    prompt: '최근 뉴스에서 자주 등장한 금융경제 용어 3개를 설명해줘.',
    category: '금융경제용어',
    weight: 6
  }
];

// 초기 추천 데이터를 한번만 주입하기 위한 헬퍼
const seedSuggestionsIfNeeded = () => {
  if (storageMode === 'memory') {
    if (memoryStore.suggestions.size === 0) {
      seedSuggestions.forEach((record) => memoryStore.suggestions.set(record.id, record));
    }
    return;
  }

  const database = ensureDb();
  const count = database.prepare('SELECT COUNT(1) as count FROM suggestions').get() as {
    count: number;
  };
  if (count.count === 0) {
    const insertSuggestion = database.prepare(
      `INSERT OR IGNORE INTO suggestions (id, label, prompt, category, weight)
       VALUES (@id, @label, @prompt, @category, @weight)`
    );
    const insertMany = database.transaction((records: SuggestionRecord[]) => {
      records.forEach((record) => insertSuggestion.run(record));
    });
    insertMany(seedSuggestions);
  }
};

seedSuggestionsIfNeeded();

const buildConversationRecord = (params: {
  id: string;
  createdAt: string;
  model?: string | null;
  difficulty?: Difficulty | null;
  category?: Category | null;
  source?: string | null;
  topic?: string | null;
}): ConversationRecord => ({
  id: params.id,
  createdAt: params.createdAt,
  model: params.model ?? null,
  difficulty: params.difficulty ?? null,
  category: params.category ?? null,
  source: params.source ?? null,
  topic: params.topic ?? null
});

// ------------------
// CRUD 헬퍼 함수들
// ------------------

// 대화가 없으면 생성하고, 있으면 전달된 메타데이터로 갱신합니다.
export const ensureConversation = (params: {
  conversationId?: string;
  model?: string;
  difficulty?: Difficulty;
  category?: Category;
  source?: string;
  topic?: string;
}): ConversationRecord => {
  const now = new Date().toISOString();
  const id = params.conversationId ?? uuid();

  if (storageMode === 'memory') {
    const existing = memoryStore.conversations.get(id);
    if (existing) {
      const merged: ConversationRecord = {
        ...existing,
        model: params.model ?? existing.model ?? null,
        difficulty: params.difficulty ?? existing.difficulty ?? null,
        category: params.category ?? existing.category ?? null,
        source: params.source ?? existing.source ?? null,
        topic: params.topic ?? existing.topic ?? null
      };
      memoryStore.conversations.set(id, merged);
      return merged;
    }

    const record = buildConversationRecord({
      id,
      createdAt: now,
      model: params.model ?? null,
      difficulty: params.difficulty ?? null,
      category: params.category ?? null,
      source: params.source ?? null,
      topic: params.topic ?? null
    });
    memoryStore.conversations.set(id, record);
    return record;
  }

  const existing = getConversation(id);
  if (existing) {
    const merged = {
      model: params.model ?? existing.model,
      difficulty: params.difficulty ?? (existing.difficulty as Difficulty | null),
      category: params.category ?? (existing.category as Category | null),
      source: params.source ?? existing.source ?? null,
      topic: params.topic ?? existing.topic ?? null
    };

    ensureDb()
      .prepare(
        `UPDATE conversations SET model=@model, difficulty=@difficulty, category=@category, source=@source, topic=@topic
         WHERE id=@id`
      )
      .run({ id, ...merged });

    return {
      id,
      createdAt: existing.createdAt,
      ...merged
    } as ConversationRecord;
  }

  ensureDb()
    .prepare(
      `INSERT INTO conversations (id, created_at, model, difficulty, category, source, topic)
       VALUES (@id, @createdAt, @model, @difficulty, @category, @source, @topic)`
    )
    .run({
      id,
      createdAt: now,
      model: params.model ?? null,
      difficulty: params.difficulty ?? null,
      category: params.category ?? null,
      source: params.source ?? null,
      topic: params.topic ?? null
    });

  return buildConversationRecord({
    id,
    createdAt: now,
    model: params.model ?? null,
    difficulty: params.difficulty ?? null,
    category: params.category ?? null,
    source: params.source ?? null,
    topic: params.topic ?? null
  });
};

// 단일 대화 조회(없으면 undefined)
export const getConversation = (id: string): ConversationRecord | undefined => {
  if (storageMode === 'memory') {
    return memoryStore.conversations.get(id);
  }

  const row = ensureDb()
    .prepare(
      `SELECT id, created_at as createdAt, model, difficulty, category, source, topic
       FROM conversations WHERE id = ?`
    )
    .get(id);
  return row as ConversationRecord | undefined;
};

// 메시지를 저장하고 저장된 레코드를 반환합니다.
export const saveMessage = (params: {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
}): MessageRecord => {
  const record: MessageRecord = {
    id: uuid(),
    conversationId: params.conversationId,
    role: params.role,
    content: params.content,
    createdAt: new Date().toISOString()
  };

  if (storageMode === 'memory') {
    memoryStore.messages.push(record);
    return record;
  }

  ensureDb()
    .prepare(
      `INSERT INTO messages (id, conversation_id, role, content, created_at)
       VALUES (@id, @conversationId, @role, @content, @createdAt)`
    )
    .run(record);

  return record;
};

// 특정 대화의 메시지들을 시간순으로 조회(최대 limit개)
export const listMessages = (conversationId: string, limit = 20): MessageRecord[] => {
  if (storageMode === 'memory') {
    return memoryStore.messages
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);
  }

  const rows = ensureDb()
    .prepare(
      `SELECT id, conversation_id as conversationId, role, content, created_at as createdAt
       FROM messages WHERE conversation_id = ?
       ORDER BY created_at ASC
       LIMIT ?`
    )
    .all(conversationId, limit);
  return rows as MessageRecord[];
};

// 카테고리별 추천 프롬프트 조회. 없으면 상위 가중치 순으로 반환합니다.
export const fetchSuggestions = (
  params: { category?: Category; limit?: number } = {}
): SuggestionRecord[] => {
  const { category, limit = 3 } = params;

  if (storageMode === 'memory') {
    const records = Array.from(memoryStore.suggestions.values());
    const filtered = category ? records.filter((record) => record.category === category) : records;
    return filtered
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, limit);
  }

  const database = ensureDb();
  if (category) {
    const rows = database
      .prepare(
        `SELECT id, label, prompt, category, weight
         FROM suggestions
         WHERE category = ?
         ORDER BY weight DESC
         LIMIT ?`
      )
      .all(category, limit);
    if (rows.length > 0) {
      return rows as SuggestionRecord[];
    }
  }

  const rows = database
    .prepare(
      `SELECT id, label, prompt, category, weight
       FROM suggestions
       ORDER BY weight DESC
       LIMIT ?`
    )
    .all(limit);
  return rows as SuggestionRecord[];
};

// 대화 + 메시지 묶음 조회. 대화가 없으면 빈 메시지 배열을 반환합니다.
export const getConversationWithMessages = (id: string): {
  conversation?: ConversationRecord;
  messages: MessageRecord[];
} => {
  const conversation = getConversation(id);
  if (!conversation) {
    return { messages: [] };
  }
  const messages = listMessages(id, 500);
  return { conversation, messages };
};
