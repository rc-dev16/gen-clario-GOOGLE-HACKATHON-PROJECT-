import type { Request } from 'express';
import { ALLOWED_UPLOAD_MIME_TYPES } from '../config.js';
import { HttpError } from '../http/errors.js';
import { assertJsonObject, requireString } from '../http/request.js';
import { createAnalysisJob } from '../services/jobsRepo.js';
import type { AuthenticatedRequestContext } from '../types.js';

export async function handleAnalysesCreate(
  req: Request,
  user: AuthenticatedRequestContext
): Promise<{ analysisId: string; jobId: string; status: 'pending' }> {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
  }

  const body = assertJsonObject(req.body);
  const gcsUri = requireString(body, 'gcsUri');
  const mimeType = requireString(body, 'mimeType');
  const fileName = requireString(body, 'fileName');
  const fileSize = body.fileSize;

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    throw new HttpError(400, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, and plain text uploads are supported.');
  }

  return createAnalysisJob(
    user.uid,
    {
      gcsUri,
      mimeType,
      fileName,
      fileSize: typeof fileSize === 'number' || typeof fileSize === 'string' ? fileSize : undefined
    },
    user.token
  );
}
