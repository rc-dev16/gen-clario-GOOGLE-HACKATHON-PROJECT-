import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  analyzeDocument,
  type AnalysisProgressStage
} from '@/features/analyze/api/analysisApi';
import { queryKeys } from '@/lib/queryKeys';

export function useAnalyzeDocument(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [progressStage, setProgressStage] = useState<AnalysisProgressStage | null>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => {
      if (!userId) {
        throw new Error('You must be signed in to analyze a document.');
      }
      setProgressStage('uploading');
      return analyzeDocument(file, userId, setProgressStage);
    },
    onSuccess: (result) => {
      setProgressStage('ready');
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
    onError: () => {
      setProgressStage('failed');
    },
    onSettled: () => {
      // Keep last stage briefly for UI; page clears file/error on its own.
    },
  });

  return {
    ...mutation,
    progressStage: mutation.isPending ? progressStage : mutation.isError ? progressStage : null,
    resetProgress: () => setProgressStage(null),
  };
}
