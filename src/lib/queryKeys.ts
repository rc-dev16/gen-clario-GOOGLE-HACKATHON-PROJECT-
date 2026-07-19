export const queryKeys = {
  analyses: {
    all: ['analyses'] as const,
    user: (userId: string) => ['analyses', 'user', userId] as const,
    detail: (id: string) => ['analyses', 'detail', id] as const,
  },
  users: {
    contractsAnalyzed: (userId: string) =>
      ['users', 'contractsAnalyzed', userId] as const,
    quota: (userId: string) => ['users', 'quota', userId] as const,
  },
};
