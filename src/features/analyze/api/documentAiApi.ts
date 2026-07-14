import {
  DocumentAIResult,
  DocumentProcessingError
} from '../types/documentai';
import { apiFetch, ApiClientError } from './apiClient';

class DocumentAIService {
  public async analyzeDocument(file: File): Promise<DocumentAIResult> {
    try {
      const uploadUrl = await apiFetch<{
        uploadUrl: string;
        gcsUri: string;
        expiresAt: string;
      }>(
        `/api/storage/upload-url?${new URLSearchParams({
          filename: file.name,
          contentType: file.type,
          sizeBytes: String(file.size)
        })}`,
        { method: 'GET' }
      );

      const uploadResponse = await fetch(uploadUrl.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error(`Secure upload failed with status ${uploadResponse.status}.`);
      }

      return await apiFetch<DocumentAIResult>('/api/documentai/process', {
        method: 'POST',
        body: JSON.stringify({
          gcsUri: uploadUrl.gcsUri,
          mimeType: file.type,
          fileName: file.name
        })
      });
    } catch (error) {
      console.error('Document processing failed:', error);

      if (file.type === 'application/pdf' && error instanceof ApiClientError && error.status === 503) {
        throw {
          code: 'OCR_SERVICE_UNAVAILABLE',
          message: '503 OCR Service Unavailable',
          details: error
        } as DocumentProcessingError;
      }

      throw {
        code: 'DOCUMENT_PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process document',
        details: error
      } as DocumentProcessingError;
    }
  }
}

export default DocumentAIService;