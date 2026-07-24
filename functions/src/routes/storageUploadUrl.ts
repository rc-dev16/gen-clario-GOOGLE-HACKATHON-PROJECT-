import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  SIGNED_URL_TTL_MS,
  requireUploadBucket
} from '../config.js';
import { HttpError } from '../http/errors.js';
import { getRequestUrl } from '../http/request.js';
import { getStorage, sanitizeFilename } from '../services/gcs.js';
import { assertWithinQuota } from '../services/usersRepo.js';
import type { AuthenticatedRequestContext, UploadUrlResponse } from '../types.js';

export async function handleUploadUrl(
  req: Request,
  user: AuthenticatedRequestContext
): Promise<UploadUrlResponse> {
  if (req.method !== 'GET') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use GET for this endpoint.');
  }

  await assertWithinQuota(user.uid, user.token);

  const url = getRequestUrl(req);
  const filename = url.searchParams.get('filename') || undefined;
  const contentType = url.searchParams.get('contentType') || undefined;
  const sizeBytesRaw = url.searchParams.get('sizeBytes') || undefined;
  const sizeBytes = Number(sizeBytesRaw);

  if (!filename || !contentType || !Number.isFinite(sizeBytes)) {
    throw new HttpError(400, 'INVALID_UPLOAD_REQUEST', 'filename, contentType, and sizeBytes are required.');
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(contentType)) {
    throw new HttpError(400, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, and plain text uploads are supported.');
  }

  if (sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, 'FILE_TOO_LARGE', 'Files must be greater than 0 bytes and no larger than 10MB.');
  }

  const bucketName = requireUploadBucket();
  const safeFilename = sanitizeFilename(filename);
  const objectName = `uploads/${user.uid}/${randomUUID()}-${safeFilename}`;
  const expiresAtMs = Date.now() + SIGNED_URL_TTL_MS;

  let uploadUrl: string;
  try {
    [uploadUrl] = await getStorage().bucket(bucketName).file(objectName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAtMs,
      contentType
    });
  } catch (error) {
    console.error('[storage] signed URL failed', error);
    throw new HttpError(
      500,
      'SIGNED_URL_FAILED',
      'Could not create upload URL. For local dev, set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON with client_email.'
    );
  }

  return {
    uploadUrl,
    gcsUri: `gs://${bucketName}/${objectName}`,
    expiresAt: new Date(expiresAtMs).toISOString()
  };
}
