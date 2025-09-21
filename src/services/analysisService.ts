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
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { app } from '../firebase-config';

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
        const userData = {
        contractsAnalyzed: 0,
        maxContracts: 5,
        plan: 'free',
        createdAt: new Date().toISOString()
      };
      
      try {
        await setDoc(userRef, userData);
      } catch (setError) {
        console.error('Error initializing user document:', setError);
      }
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

export const incrementContractsAnalyzed = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      contractsAnalyzed: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing contracts analyzed:', error);
  }
};

export const analyzeDocument = async (file: File, userId: string): Promise<AnalysisResult> => {
  try {
    const result = await analyzeDocumentWithGemini(file);
    
    const analysesRef = collection(db, 'analyses');
    const analysisData = {
      ...result,
      userId,
      createdAt: new Date().toISOString(),
      status: 'completed',
      fileName: file.name,
      fileSize: file.size
    };
    
    const docRef = await addDoc(analysesRef, analysisData);
    await incrementContractsAnalyzed(userId);
    
    return {
      ...result,
      id: docRef.id
    };
  } catch (error) {
    console.error('Document analysis failed:', error);
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
  const ALLOWED_TYPES = ['application/pdf', 'text/plain'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Error('Invalid file type. Please upload a PDF or TXT file. Word document support coming soon.');
  }

  if (file.size > MAX_SIZE) {
    return new Error('File too large. Maximum size is 10MB.');
  }

  return null;
};