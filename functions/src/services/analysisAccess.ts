import { getFirestore } from 'firebase-admin/firestore';
import { HttpError } from '../http/errors.js';
import { readUserTextObject } from './gcs.js';
import type { AnalysisPayload } from '../types.js';

const MAX_DOCUMENT_CHARS = 120_000;

export async function getOwnedAnalysis(
  uid: string,
  analysisId: string
): Promise<AnalysisPayload> {
  if (!analysisId.trim()) {
    throw new HttpError(400, 'INVALID_REQUEST', 'analysisId is required.');
  }

  const snapshot = await getFirestore().collection('analyses').doc(analysisId).get();

  if (!snapshot.exists) {
    throw new HttpError(404, 'NOT_FOUND', 'Analysis not found.');
  }

  const data = snapshot.data() || {};

  if (data.userId !== uid) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not have access to this analysis.');
  }

  return {
    ...data,
    id: snapshot.id
  };
}

export async function loadAnalysisDocumentText(
  uid: string,
  analysis: AnalysisPayload
): Promise<string> {
  const gcsTextUri = analysis.gcsTextUri;

  if (typeof gcsTextUri !== 'string' || !gcsTextUri.trim()) {
    throw new HttpError(400, 'MISSING_DOCUMENT_TEXT', 'This analysis has no stored document text.');
  }

  const text = await readUserTextObject(gcsTextUri, uid);

  if (text.length <= MAX_DOCUMENT_CHARS) {
    return text;
  }

  return `${text.slice(0, MAX_DOCUMENT_CHARS)}\n\n[Document truncated for model context.]`;
}
