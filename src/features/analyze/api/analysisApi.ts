/**
 * Analysis API — Firestore reads (owner-scoped) and BFF mutations.
 */

import { analyzeDocumentWithGemini } from './geminiApi';
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

export const analyzeDocument = async (file: File, userId: string): Promise<AnalysisResult> => {
  const validationError = validateDocumentFile(file);
  if (validationError) {
    throw validationError;
  }

  const result = await analyzeDocumentWithGemini(file);

  const { analysis: finalResult } = await apiFetch<{ analysis: AnalysisResult }>(
    '/api/analysis/persist',
    {
      method: 'POST',
      body: JSON.stringify({
        analysis: {
          ...result,
          userId,
          fileName: file.name,
          fileSize: file.size
        }
      })
    }
  );

  return finalResult;
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

    return results.sort(
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

export { validateDocumentFile as validateFile };
