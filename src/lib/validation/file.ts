export const MAX_DOCUMENT_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
] as const;

export const DOCUMENT_FILE_ACCEPT =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

export const DOCUMENT_FILE_SUPPORT_LABEL = 'PDF, DOCX, TXT';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateDocumentFile(file: File): Error | null {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as typeof ALLOWED_DOCUMENT_MIME_TYPES[number])) {
    return new Error(`Invalid file type. Please upload a ${DOCUMENT_FILE_SUPPORT_LABEL} file.`);
  }

  if (file.size <= 0) {
    return new Error('File is empty. Please upload a document with content.');
  }

  if (file.size > MAX_DOCUMENT_FILE_BYTES) {
    return new Error(
      `File too large. Maximum size is ${formatFileSize(MAX_DOCUMENT_FILE_BYTES)}.`
    );
  }

  return null;
}
