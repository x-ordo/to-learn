import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { Suggestion } from './types';

/**
 * 경량 SQLite 래퍼
 * ----------------
 * Next.js 서버 번들에서도 재사용 가능한 SQLite 초기화 코드입니다.
 * 단일 커넥션(better-sqlite3)과 간단한 DAO 함수를 노출합니다.
 */

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'tolearn.db');

const ensureDir = () => {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir();

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
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

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
`);

export function insertConversation(row: {
  id: string;
  created_at: string;
  model?: string;
  difficulty?: string;
  category?: string;
  source?: string;
  topic?: string;
}) {
  const stmt = db.prepare(
    `INSERT INTO conversations (id, created_at, model, difficulty, category, source, topic)
     VALUES (@id, @created_at, @model, @difficulty, @category, @source, @topic)`
  );
  stmt.run(row);
}

export function insertMessage(row: {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}) {
  const stmt = db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, created_at)
     VALUES (@id, @conversation_id, @role, @content, @created_at)`
  );
  stmt.run(row);
}

export function fetchSuggestions(limit = 3): Suggestion[] {
  const stmt = db.prepare(`SELECT id, label, prompt, category FROM suggestions ORDER BY weight DESC LIMIT ?`);
  return stmt.all(limit) as Suggestion[];
}
