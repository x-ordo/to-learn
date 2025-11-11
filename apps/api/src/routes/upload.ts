import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../utils/asyncHandler';
import { extractTextFromPdf } from '../services/pdfParser';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file;

    if (!file) {
      throw new ApiError(422, 'FILE_REQUIRED', 'file 필드에 PDF 또는 텍스트 파일을 첨부해주세요.');
    }

    const text = await extractText(file);

    if (!text.length) {
      throw new ApiError(422, 'EMPTY_DOCUMENT', '본문을 추출할 수 없습니다.');
    }

    res.json({
      text,
      meta: {
        // 한글/비ASCII 파일명이 브라우저 업로드 시 latin1로 넘어오는 경우가 있어
        // UTF-8로 복구를 시도합니다. 실패 시 원본을 그대로 사용합니다.
        filename: decodeFilename(file.originalname),
        mimeType: file.mimetype,
        wordCount: countWords(text)
      }
    });
  })
);

const extractText = async (file: Express.Multer.File): Promise<string> => {
  if (isPdf(file)) {
    return await extractTextFromPdf(file.buffer);
  }

  if (isText(file)) {
    return bufferToText(file.buffer);
  }

  throw new ApiError(422, 'UNSUPPORTED_FILE_TYPE', 'PDF(.pdf) 또는 텍스트(.txt)만 지원합니다.');
};

const isPdf = (file: Express.Multer.File) => {
  return file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
};

const isText = (file: Express.Multer.File) => {
  return file.mimetype.startsWith('text/') || file.originalname.toLowerCase().endsWith('.txt');
};

const bufferToText = (buffer: Buffer) => {
  const utf8 = buffer.toString('utf8');
  const best = selectBestDecoded(utf8, buffer);
  return best
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const countWords = (text: string) => {
  return text.split(/\s+/).filter(Boolean).length;
};

export const uploadRouter = router;

// ---------- helpers (encoding) ----------
function decodeFilename(input: string): string {
  try {
    const decoded = Buffer.from(input, 'latin1').toString('utf8');
    // Heuristic: if decoded contains more Hangul/CJK, prefer it
    return scoreKorean(decoded) >= scoreKorean(input) ? decoded : input;
  } catch {
    return input;
  }
}

function selectBestDecoded(utf8Text: string, buf: Buffer): string {
  // If the utf8 decode shows typical mojibake, try cp949/euc-kr via iconv-lite
  if (!looksMojibake(utf8Text)) return utf8Text;
  try {
    // Lazy load to avoid cost when not needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const iconv = require('iconv-lite') as typeof import('iconv-lite');
    const cp949 = iconv.decode(buf, 'cp949');
    const euckr = iconv.decode(buf, 'euc-kr');
    const candidates = [utf8Text, cp949, euckr];
    // Choose the one with best Korean/CJK score
    return candidates.sort((a, b) => scoreKorean(b) - scoreKorean(a))[0];
  } catch {
    return utf8Text;
  }
}

function looksMojibake(text: string): boolean {
  // Common mojibake signs for UTF-8→latin1: Ã, Â, ¢, ¥, ©, ®, á, í, ó, ú
  return /[ÃÂ¢¥©®áéíóú]/.test(text) && scoreKorean(text) < 2;
}

function scoreKorean(text: string): number {
  // Count Hangul syllables + CJK as a rough correctness metric
  const matches = text.match(/[\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]/g);
  return matches ? matches.length : 0;
}
