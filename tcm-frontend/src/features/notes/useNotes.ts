import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../../api/noteApi';

export function useNotes() {
  return useQuery({ queryKey: ['notes'], queryFn: api.listNotes });
}

export function useNote(id?: string) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => api.getNote(id as string),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<{ title: string; content: string }> }) =>
      api.updateNote(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['notes', variables.id] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });
}