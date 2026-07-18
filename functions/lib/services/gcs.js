import { Storage } from '@google-cloud/storage';
import { requireUploadBucket } from '../config.js';
import { HttpError } from '../http/errors.js';
const storage = new Storage();
export function getStorage() {
    return storage;
}
export function sanitizeFilename(filename) {
    const normalized = filename.trim().replace(/[/\\]/g, '_').replace(/[^\w. -]/g, '_');
    if (!normalized || normalized === '.' || normalized === '..') {
        throw new HttpError(400, 'INVALID_FILENAME', 'A valid filename is required.');
    }
    return normalized.slice(0, 128);
}
export function parseGcsUri(gcsUri) {
    const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) {
        throw new HttpError(400, 'INVALID_GCS_URI', 'Expected a gs:// bucket pointer.');
    }
    return { bucket: match[1], object: match[2] };
}
export function assertUserOwnedGcsUri(gcsUri, uid, allowedPrefixes) {
    const pointer = parseGcsUri(gcsUri);
    const expectedBucket = requireUploadBucket();
    if (pointer.bucket !== expectedBucket) {
        throw new HttpError(403, 'FORBIDDEN_GCS_URI', 'The GCS object is outside the Clario upload boundary.');
    }
    if (!allowedPrefixes.some((prefix) => pointer.object.startsWith(`${prefix}/${uid}/`))) {
        throw new HttpError(403, 'FORBIDDEN_GCS_URI', 'The GCS object is not owned by the authenticated user.');
    }
    return pointer;
}
export async function readUserTextObject(textGcsUri, uid) {
    const pointer = assertUserOwnedGcsUri(textGcsUri, uid, ['texts']);
    const [buffer] = await storage.bucket(pointer.bucket).file(pointer.object).download();
    return buffer.toString('utf8');
}
export async function writeTextObject(objectName, text, sourceGcsUri) {
    const bucketName = requireUploadBucket();
    await storage.bucket(bucketName).file(objectName).save(text, {
        resumable: false,
        contentType: 'text/plain; charset=utf-8',
        metadata: {
            cacheControl: 'no-store',
            metadata: {
                sourceGcsUri
            }
        }
    });
    return `gs://${bucketName}/${objectName}`;
}
