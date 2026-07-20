import { apiFetch } from '@/lib/apiClient';
import type { NegotiationSuggestion } from '@/features/analyze/api/geminiApi';

export type ChatKind = 'document' | 'negotiation';

export interface ServerChatMessage {
  id: string;
  sessionId: string;
  kind: ChatKind;
  role: 'user' | 'assistant';
  content: string;
  party?: string;
  createdAt: string;
  timestamp: number;
}

export interface ChatSessionSummary {
  sessionId: string;
  kind: ChatKind;
  preview: string;
  lastTime: number;
  name: string;
  party?: string;
}

export interface NegotiationState {
  party: string;
  suggestions: NegotiationSuggestion[];
  updatedAt: string;
}

export async function listChatSessions(
  analysisId: string,
  kind: ChatKind = 'document'
): Promise<ChatSessionSummary[]> {
  const response = await apiFetch<{ sessions: ChatSessionSummary[] }>(
    `/api/analysis/${encodeURIComponent(analysisId)}/chat-sessions?${new URLSearchParams({ kind })}`
  );
  return response.sessions;
}

export async function listChatMessages(
  analysisId: string,
  sessionId: string,
  kind: ChatKind = 'document'
): Promise<ServerChatMessage[]> {
  const response = await apiFetch<{ messages: ServerChatMessage[] }>(
    `/api/analysis/${encodeURIComponent(analysisId)}/chats?${new URLSearchParams({
      sessionId,
      kind
    })}`
  );
  return response.messages;
}

export async function sendDocumentChatMessage(
  analysisId: string,
  message: string,
  sessionId?: string
): Promise<{ response: string; sessionId: string; messages: ServerChatMessage[] }> {
  return apiFetch(`/api/analysis/${encodeURIComponent(analysisId)}/chat`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...(sessionId ? { sessionId } : {})
    })
  });
}

export async function getNegotiationState(
  analysisId: string
): Promise<NegotiationState | null> {
  const response = await apiFetch<{ state: NegotiationState | null }>(
    `/api/analysis/${encodeURIComponent(analysisId)}/negotiation`
  );
  return response.state;
}

export async function generateNegotiationSuggestionsForAnalysis(
  analysisId: string,
  party: string
): Promise<{ suggestions: NegotiationSuggestion[]; party: string }> {
  return apiFetch(`/api/analysis/${encodeURIComponent(analysisId)}/negotiation/suggestions`, {
    method: 'POST',
    body: JSON.stringify({ party })
  });
}

export async function sendNegotiationChatMessage(
  analysisId: string,
  message: string,
  party: string,
  sessionId?: string
): Promise<{ response: string; sessionId: string; messages: ServerChatMessage[] }> {
  return apiFetch(`/api/analysis/${encodeURIComponent(analysisId)}/negotiation/chat`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      party,
      ...(sessionId ? { sessionId } : {})
    })
  });
}
