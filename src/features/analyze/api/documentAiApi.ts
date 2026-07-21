import {
  DocumentAIResult,
  DocumentProcessingError
} from '@/lib/types/documentai';
import { apiFetch, ApiClientError } from '@/lib/apiClient';

export interface UploadedObject {
  gcsUri: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

class DocumentAIService {
  public async uploadDocument(file: File): Promise<UploadedObject> {
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

      return {
        gcsUri: uploadUrl.gcsUri,
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size
      };
    } catch (error) {
      console.error('Document upload failed:', error);

      if (file.type === 'application/pdf' && error instanceof ApiClientError && error.status === 503) {
        throw {
          code: 'OCR_SERVICE_UNAVAILABLE',
          message: '503 OCR Service Unavailable',
          details: error
        } as DocumentProcessingError;
      }

      throw {
        code: 'DOCUMENT_PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to upload document',
        details: error
      } as DocumentProcessingError;
    }
  }

  /** @deprecated Prefer upload + async /api/analyses job pipeline. */
  public async analyzeDocument(file: File): Promise<DocumentAIResult> {
    const uploaded = await this.uploadDocument(file);
    return apiFetch<DocumentAIResult>('/api/documentai/process', {
      method: 'POST',
      body: JSON.stringify({
        gcsUri: uploaded.gcsUri,
        mimeType: uploaded.mimeType,
        fileName: uploaded.fileName
      })
    });
  }
}

export default DocumentAIService;
