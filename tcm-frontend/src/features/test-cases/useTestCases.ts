import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../../api/testCaseApi';
import type { TestCaseItem } from '../../types/entities';
import { listUsersByRole } from '../../api/userApi';

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

export function useUpdateHeader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Parameters<typeof api.createHeader>[0]> }) =>
      api.updateHeader(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-headers'] }),
  });
}

export function useUploadCapture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, file }: { itemId: string; file: File }) => api.uploadCapture(itemId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-items'] }),
  });
}

export function useQaUsers() {
  return useQuery({
    queryKey: ['users', 'QA'],
    queryFn: () => listUsersByRole('QA'),
    staleTime: 5 * 60 * 1000, // daftar QA jarang berubah, tidak perlu refetch tiap fokus
  });
}

export function useBulkUpdateItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; payload: Partial<TestCaseItem> }>) => api.bulkUpdateItems(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-items'] }),
  });
}


// excel
export function useImportItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ headerId, file }: { headerId: string; file: File }) => api.importItems(headerId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-case-items'] }),
  });
}