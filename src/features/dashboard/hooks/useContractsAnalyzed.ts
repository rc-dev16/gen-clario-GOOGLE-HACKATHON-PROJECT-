import { useQuery } from '@tanstack/react-query';
import { getContractsAnalyzed } from '@/features/analyze/api/analysisApi';
import { queryKeys } from '@/lib/queryKeys';

/** Prefers shared quota cache when present; falls back to contractsAnalyzed fetch. */
export function useContractsAnalyzed(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.contractsAnalyzed(userId ?? ''),
    queryFn: () => getContractsAnalyzed(userId!),
    enabled: Boolean(userId),
  });
}
