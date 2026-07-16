import DocumentAIService from './documentAiApi';
import { AnalysisResult } from '@/lib/types';
import { apiFetch } from '@/lib/apiClient';
import { validateDocumentFile } from '@/lib/validation/file';

const documentAIService = new DocumentAIService();

export interface NegotiationSuggestion {
  id: string;
  type: 'improvement' | 'risk-mitigation' | 'cost-optimization' | 'clarity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
}

export const validateFile = validateDocumentFile;

export const extractFileContent = async (file: File): Promise<string> => {
  try {
    const result = await documentAIService.analyzeDocument(file);
    return result.text;
  } catch (error) {
    throw new Error('Failed to extract file content');
  }
};

export const analyzeDocumentWithGemini = async (file: File): Promise<AnalysisResult> => {
  const validationError = validateDocumentFile(file);
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