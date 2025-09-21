import { protos } from '@google-cloud/documentai';

export type ProcessedDocument = protos.google.cloud.documentai.v1.IDocument;

export interface DocumentAIConfig {
  projectId: string;
  location: string;  // Format: 'us' or 'eu'
  processorId: string;
}

export interface DocumentAIResult {
  text: string;
  pages: number;
  mimeType: string;
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

