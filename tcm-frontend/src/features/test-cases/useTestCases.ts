import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../../api/testCaseApi';
import type { TestCaseItem } from '../../types/entities';

export function useHeaders() {
  return useQuery({ queryKey: ['test-case-headers'], queryFn: api.listHeaders });
}

export function useCreateHeader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createHeader,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-headers'] }),
  });
}

export function useDeleteHeader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteHeader(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-headers'] }),
  });
}

export function useItems(headerId?: string) {
  return useQuery({
    queryKey: ['test-case-items', headerId ?? 'all'],
    queryFn: () => api.listItems(headerId),
  });
}

export function useCreateItem(headerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<TestCaseItem>) => api.createItem(headerId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-items'] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TestCaseItem> }) => api.updateItem(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-items'] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-items'] }),
  });
}
