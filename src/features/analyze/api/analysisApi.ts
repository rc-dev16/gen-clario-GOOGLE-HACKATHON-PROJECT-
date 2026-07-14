/**
 * Analysis Service
 * 
 * Manages document analysis workflow and data:
 * - Document validation and processing
 * - Analysis tracking and storage
 * - User analysis limits
 * - Results management
 * 
 * Integrates with:
 * - Document AI for text extraction
 * - Gemini for AI analysis
 * - Firestore for data persistence
 */

import { analyzeDocumentWithGemini } from './geminiService';
import { AnalysisResult } from '../types';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../firebase-config';
import { apiFetch } from './apiClient';

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
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    return 0;
  }
};

export const analyzeDocument = async (file: File, userId: string): Promise<AnalysisResult> => {
  try {
    console.log('[AnalysisService] analyzeDocument called:', {
      userId,
      fileName: file.name,
      fileSize: file.size
    });

    const validationError = validateFile(file);
    if (validationError) {
      throw validationError;
    }

    // Call Gemini - this will throw if it fails (no incomplete results)
    const result = await analyzeDocumentWithGemini(file);
    
    // Validate result before saving - ensure it's not empty/incomplete
    if (!result || !result.documentType || result.documentType === 'Document') {
      console.warn('[AnalysisService] Result appears incomplete, checking...');
    }
    
    console.log('[AnalysisService] Gemini analysis completed successfully, persisting server-side');

    const { analysis: finalResult } = await apiFetch<{ analysis: AnalysisResult }>('/api/analysis/persist', {
      method: 'POST',
      body: JSON.stringify({
        analysis: {
          ...result,
          userId,
          fileName: file.name,
          fileSize: file.size
        }
      })
    });

    console.log('[AnalysisService] Returning final analysis result for id:', finalResult.id);
    return finalResult;
  } catch (error) {
    console.error('[AnalysisService] Document analysis failed - NOT saving incomplete results:', error);
    // Re-throw to prevent incomplete results from being shown
    throw error;
  }
};

export const getUserAnalyses = async (userId: string): Promise<AnalysisResult[]> => {
  try {
    const analysesRef = collection(db, 'analyses');
    const q = query(
      analysesRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as AnalysisResult[];
    
    return results.sort((a, b) => 
      new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()
    );
  } catch (error) {
    console.error('Error fetching user analyses:', error);
    return [];
  }
};

export const validateFile = (file: File): Error | null => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Error('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
  }

  if (file.size > MAX_SIZE) {
    return new Error('File too large. Maximum size is 10MB.');
  }

  return null;
};