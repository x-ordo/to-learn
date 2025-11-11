declare module 'pdf-parse' {
  interface PDFMetadata {
    title?: string;
    author?: string;
  }

  interface PDFParseResult {
    text: string;
    info?: PDFMetadata;
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFParseResult>;

  export = pdfParse;
}
