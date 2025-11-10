import pdfParse from 'pdf-parse';

/**
 * PDF Parser
 * ----------
 * pdf-parse는 내부적으로 pdf.js를 사용하여 텍스트층을 추출합니다.
 * 업로드된 PDF는 메모리 버퍼로만 다루고, 결과 텍스트는 줄바꿈을 정규화합니다.
 */
export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  const result = await pdfParse(buffer);
  return normalizeText(result.text || '');
};

const normalizeText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
