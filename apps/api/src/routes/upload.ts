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
        filename: file.originalname,
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
  return buffer
    .toString('utf-8')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const countWords = (text: string) => {
  return text.split(/\s+/).filter(Boolean).length;
};

export const uploadRouter = router;
