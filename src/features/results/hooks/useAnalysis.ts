import { useQuery } from '@tanstack/react-query';
import { getAnalysisById } from '@/features/analyze/api/analysisApi';
import { queryKeys } from '@/lib/queryKeys';

export function useAnalysis(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.analyses.detail(id ?? ''),
    queryFn: async () => {
      const analysis = await getAnalysisById(id!);
      if (!analysis) {
        throw new Error('Analysis result not found.');
      }
      return analysis;
    },
    enabled: Boolean(id),
  });
}
