import { useQuery } from '@tanstack/react-query';
import { getUserQuota } from '@/features/analyze/api/analysisApi';
import { queryKeys } from '@/lib/queryKeys';

export function useUserQuota(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.quota(userId ?? ''),
    queryFn: () => getUserQuota(userId!),
    enabled: Boolean(userId),
  });
}
