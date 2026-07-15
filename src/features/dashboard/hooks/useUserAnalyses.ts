import { useQuery } from '@tanstack/react-query';
import { getUserAnalyses } from '@/features/analyze/api/analysisApi';
import { queryKeys } from '@/lib/queryKeys';

export function useUserAnalyses(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.analyses.user(userId ?? ''),
    queryFn: () => getUserAnalyses(userId!),
    enabled: Boolean(userId),
  });
}
