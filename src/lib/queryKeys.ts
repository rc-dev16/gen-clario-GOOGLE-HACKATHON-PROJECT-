export const queryKeys = {
  analyses: {
    all: ['analyses'] as const,
    user: (userId: string) => ['analyses', 'user', userId] as const,
    detail: (id: string) => ['analyses', 'detail', id] as const,
  },
  chat: {
    sessions: (analysisId: string, kind: string) =>
      ['chat', 'sessions', analysisId, kind] as const,
    messages: (analysisId: string, sessionId: string, kind: string) =>
      ['chat', 'messages', analysisId, sessionId, kind] as const,
  },
  negotiation: {
    state: (analysisId: string) => ['negotiation', 'state', analysisId] as const,
  },
  users: {
    contractsAnalyzed: (userId: string) =>
      ['users', 'contractsAnalyzed', userId] as const,
    quota: (userId: string) => ['users', 'quota', userId] as const,
  },
};
