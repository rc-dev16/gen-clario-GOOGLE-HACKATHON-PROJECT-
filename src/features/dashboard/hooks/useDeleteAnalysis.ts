import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAnalysis } from '@/features/analyze/api/analysisApi';
import { queryKeys } from '@/lib/queryKeys';

export function useDeleteAnalysis(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (analysisId: string) => deleteAnalysis(analysisId),
    onSuccess: (_data, analysisId) => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.analyses.user(userId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.users.contractsAnalyzed(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.users.quota(userId),
      });
      queryClient.removeQueries({ queryKey: queryKeys.analyses.detail(analysisId) });
    },
  });
}
