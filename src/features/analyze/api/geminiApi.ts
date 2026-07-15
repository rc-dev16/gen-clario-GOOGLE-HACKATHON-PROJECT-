import DocumentAIService from './documentAiApi';
import { AnalysisResult } from '@/lib/types';
import { apiFetch } from '@/lib/apiClient';

const documentAIService = new DocumentAIService();
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export interface NegotiationSuggestion {
  id: string;
  type: 'improvement' | 'risk-mitigation' | 'cost-optimization' | 'clarity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
}

export const validateFile = (file: File): Error | null => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Error('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
  }

  if (file.size > MAX_SIZE) {
    return new Error('File too large. Maximum size is 10MB.');
  }

  return null;
};

export const extractFileContent = async (file: File): Promise<string> => {
  try {
    const result = await documentAIService.analyzeDocument(file);
    return result.text;
  } catch (error) {
    throw new Error('Failed to extract file content');
  }
};

export const analyzeDocumentWithGemini = async (file: File): Promise<AnalysisResult> => {
  const validationError = validateFile(file);
  if (validationError) {
    throw validationError;
  }

  try {
    const docAIResult = await documentAIService.analyzeDocument(file);

    const response = await apiFetch<{ analysis: AnalysisResult }>('/api/ai/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'analyze',
        textGcsUri: docAIResult.textGcsUri,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      })
    });

    return response.analysis;
  } catch (error) {
    console.error('[GeminiService] Secure analysis failed:', error);
    throw error;
  }
};

export const askDocumentQuestion = async (prompt: string): Promise<string> => {
  const response = await apiFetch<{ response: string }>('/api/ai/orchestrate', {
    method: 'POST',
    body: JSON.stringify({
      operation: 'chat',
      prompt
    })
  });

  return response.response;
};

export const generateNegotiationSuggestions = async (prompt: string): Promise<NegotiationSuggestion[]> => {
  const response = await apiFetch<{ suggestions: NegotiationSuggestion[] }>('/api/ai/orchestrate', {
    method: 'POST',
    body: JSON.stringify({
      operation: 'negotiationSuggestions',
      prompt
    })
  });

  return response.suggestions;
};

export const askNegotiationQuestion = async (prompt: string): Promise<string> => {
  const response = await apiFetch<{ response: string }>('/api/ai/orchestrate', {
    method: 'POST',
    body: JSON.stringify({
      operation: 'negotiationAdvice',
      prompt
    })
  });

  return response.response;
};