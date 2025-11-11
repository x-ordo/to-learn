import pdfParse from 'pdf-parse';

/**
 * PDF Parser (Deployment-safe)
 * ----------------------------
 * 1) 1차: pdf-parse (간편, 빠름)
 * 2) 2차: pdfjs-dist 직접 호출 (일부 런타임에서 pdf-parse가 실패하는 경우 폴백)
 *
 * 두 경로 모두 파일은 메모리 버퍼로만 처리하며, 출력은 안전하게 정규화합니다.
 */
export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  // Fast path: pdf-parse
  try {
    const result = await pdfParse(buffer);
    const text = normalizeText(result.text || '');
    if (text.length > 0) return text;
  } catch {
    // ignore — try fallback
  }

  // Fallback: pdfjs-dist (legacy build) — worker 비활성화로 서버 환경 호환성 향상
  try {
    const text = await extractWithPdfJs(buffer);
    if (text.length > 0) return text;
  } catch {
    // swallow and return empty below
  }

  return '';
};

const extractWithPdfJs = async (buffer: Buffer): Promise<string> => {
  const pdfjs = await import('pdfjs-dist');
  // 일부 런타임에서 워커/폰트 로딩 이슈가 있으므로 워커/폰트 처리를 비활성화합니다.
  const loadingTask = (pdfjs as any).getDocument({
    data: buffer,
    isEvalSupported: false,
    disableFontFace: true
  });

  const doc = await loadingTask.promise;
  try {
    const parts: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      // eslint-disable-next-line no-await-in-loop
      const page = await doc.getPage(pageNum);
      // eslint-disable-next-line no-await-in-loop
      const content = await page.getTextContent();
      const rows = (content.items || [])
        .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
        .filter((s: string) => s && s.trim().length > 0)
        .join(' ');
      if (rows) parts.push(rows);
    }
    return normalizeText(parts.join('\n'));
  } finally {
    await doc.destroy();
  }
};

const normalizeText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
