import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../../api/bugApi';
import { getDevUsers } from '../../api/authApi';
import type { BugStatus } from '../../types/entities';

export function useBugs() {
  return useQuery({ queryKey: ['bugs'], queryFn: api.listBugs });
}

export function useBugDetail(id?: string) {
  return useQuery({
    queryKey: ['bugs', id],
    queryFn: () => api.getBugDetail(id as string),
    enabled: !!id,
  });
}

export function useDevUsers() {
  return useQuery({ queryKey: ['users', 'DEV'], queryFn: getDevUsers });
}

export function useCreateBug() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createBug,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bugs'] }),
  });
}

export function useChangeBugStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BugStatus }) => api.changeBugStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['bugs'] });
      qc.invalidateQueries({ queryKey: ['bugs', variables.id] });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => api.addComment(id, comment),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['bugs', variables.id] }),
  });
}
