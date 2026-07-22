import type { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthenticatedRequestContext {
  uid: string;
  token: DecodedIdToken;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  gcsUri: string;
  expiresAt: string;
}

export interface GcsPointer {
  bucket: string;
  object: string;
}

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

export type AnalysisPayload = Record<string, unknown>;
