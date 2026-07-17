export interface DocumentAIResult {
  text: string;
  pages: number;
  mimeType: string;
  textGcsUri: string;
  entities: Array<{
    type: string;
    content: string;
    confidence: number;
  }>;
  tables: Array<{
    headerRows: string[];
    bodyRows: string[][];
  }>;
  paragraphs: Array<{
    text: string;
    confidence: number;
  }>;
}

export interface DocumentProcessingError {
  code: string;
  message: string;
  details?: unknown;
}
