/**
 * Analysis API — Firestore reads (owner-scoped) and async BFF job pipeline.
 */

import DocumentAIService from './documentAiApi';
import { AnalysisResult } from '@/lib/types';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { apiFetch, ApiClientError } from '@/lib/apiClient';
import { validateDocumentFile } from '@/lib/validation/file';

const db = getFirestore(app);
const documentAIService = new DocumentAIService();

export type AnalysisProgressStage =
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed';

export interface UserQuota {
  contractsAnalyzed: number;
  maxContracts: number;
  plan: string;
}

const DEFAULT_QUOTA: UserQuota = {
  contractsAnalyzed: 0,
  maxContracts: 5,
  plan: 'free'
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export const getUserQuota = async (userId: string): Promise<UserQuota> => {
  try {
    if (!userId) {
      return DEFAULT_QUOTA;
    }

    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return DEFAULT_QUOTA;
    }

    const data = userDoc.data();
    return {
      contractsAnalyzed:
        typeof data?.contractsAnalyzed === 'number' ? data.contractsAnalyzed : 0,
      maxContracts: typeof data?.maxContracts === 'number' ? data.maxContracts : 5,
      plan: typeof data?.plan === 'string' ? data.plan : 'free'
    };
  } catch (error) {
    console.error('Error getting user quota:', error);
    return DEFAULT_QUOTA;
  }
};

export const getContractsAnalyzed = async (userId: string): Promise<number> => {
  const quota = await getUserQuota(userId);
  return quota.contractsAnalyzed;
};

export async function createAnalysisJob(input: {
  gcsUri: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
}): Promise<{ analysisId: string; jobId: string; status: 'pending' }> {
  return apiFetch('/api/analyses', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function waitForAnalysisReady(
  analysisId: string,
  onStage?: (stage: AnalysisProgressStage) => void
): Promise<AnalysisResult> {
  const started = Date.now();

  while (Date.now() - started < POLL_TIMEOUT_MS) {
    const analysis = await getAnalysisById(analysisId);

    if (!analysis) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const status = (analysis as AnalysisResult & { status?: string; error?: string }).status;

    if (status === 'processing') {
      onStage?.('processing');
    } else if (status === 'pending') {
      onStage?.('queued');
    } else if (status === 'ready' || status === 'completed') {
      onStage?.('ready');
      return analysis;
    } else if (status === 'failed') {
      onStage?.('failed');
      const errorMessage =
        typeof (analysis as { error?: string }).error === 'string'
          ? (analysis as { error: string }).error
          : 'Analysis failed.';
      throw new ApiClientError(500, 'ANALYSIS_FAILED', errorMessage);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new ApiClientError(
    504,
    'ANALYSIS_TIMEOUT',
    'Analysis is taking longer than expected. Please try again.'
  );
}

export const analyzeDocument = async (
  file: File,
  _userId: string,
  onStage?: (stage: AnalysisProgressStage) => void
): Promise<AnalysisResult> => {
  const validationError = validateDocumentFile(file);
  if (validationError) {
    throw validationError;
  }

  onStage?.('uploading');
  const uploaded = await documentAIService.uploadDocument(file);

  onStage?.('queued');
  const job = await createAnalysisJob({
    gcsUri: uploaded.gcsUri,
    mimeType: uploaded.mimeType,
    fileName: uploaded.fileName,
    fileSize: uploaded.fileSize
  });

  return waitForAnalysisReady(job.analysisId, onStage);
};

export const getUserAnalyses = async (userId: string): Promise<AnalysisResult[]> => {
  try {
    const analysesRef = collection(db, 'analyses');
    const q = query(analysesRef, where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map((snap) => ({
      ...snap.data(),
      id: snap.id
    })) as AnalysisResult[];

    return results
      .filter((item) => {
        const status = (item as AnalysisResult & { status?: string }).status;
        return !status || status === 'ready' || status === 'completed';
      })
      .sort(
        (a, b) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
      );
  } catch (error) {
    console.error('Error fetching user analyses:', error);
    return [];
  }
};

export const getAnalysisById = async (id: string): Promise<AnalysisResult | null> => {
  const snap = await getDoc(doc(db, 'analyses', id));
  if (!snap.exists()) {
    return null;
  }
  return { ...snap.data(), id: snap.id } as AnalysisResult;
};

export const deleteAnalysis = async (
  analysisId: string
): Promise<{ deleted: true; contractsAnalyzed: number }> => {
  return apiFetch<{ deleted: true; contractsAnalyzed: number }>(
    `/api/analysis/${encodeURIComponent(analysisId)}`,
    { method: 'DELETE' }
  );
};

export function getAnalysisErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'QUOTA_EXCEEDED') {
      return error.message;
    }
    return error.message || 'Request failed. Please try again.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Analysis failed. Please try again or contact support.';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { validateDocumentFile as validateFile };
