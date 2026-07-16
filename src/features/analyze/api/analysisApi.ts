/**
 * Analysis API — Firestore reads/writes and analyze pipeline entrypoints.
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
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { apiFetch } from '@/lib/apiClient';
import { validateDocumentFile } from '@/lib/validation/file';

const db = getFirestore(app);

export const getContractsAnalyzed = async (userId: string): Promise<number> => {
  try {
    if (!userId) {
      console.warn('No userId provided to getContractsAnalyzed');
      return 0;
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return 0;
    }

    const data = userDoc.data();
    return data?.contractsAnalyzed || 0;
  } catch (error) {
    console.error('Error getting contracts analyzed:', error);
    return 0;
  }
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

export const deleteAnalysis = async (analysisId: string): Promise<void> => {
  await deleteDoc(doc(db, 'analyses', analysisId));
};

export { validateDocumentFile as validateFile };
