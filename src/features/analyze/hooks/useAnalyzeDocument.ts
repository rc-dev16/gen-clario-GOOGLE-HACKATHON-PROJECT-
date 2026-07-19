import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeDocument } from '@/features/analyze/api/analysisApi';
import { queryKeys } from '@/lib/queryKeys';

export function useAnalyzeDocument(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      if (!userId) {
        throw new Error('You must be signed in to analyze a document.');
      }
      return analyzeDocument(file, userId);
    },
    onSuccess: (result) => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.analyses.user(userId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.users.contractsAnalyzed(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.users.quota(userId),
      });
      queryClient.setQueryData(queryKeys.analyses.detail(result.id), result);
    },
  });
}
