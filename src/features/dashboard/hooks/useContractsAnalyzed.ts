import { useQuery } from '@tanstack/react-query';
import { getContractsAnalyzed } from '@/features/analyze/api/analysisApi';
import { queryKeys } from '@/lib/queryKeys';

export function useContractsAnalyzed(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.contractsAnalyzed(userId ?? ''),
    queryFn: () => getContractsAnalyzed(userId!),
    enabled: Boolean(userId),
  });
}
