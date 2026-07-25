import { axiosClient } from './axiosClient';
import type { Note } from '../types/entities';

export async function listNotes(): Promise<Note[]> {
  const { data } = await axiosClient.get('/notes');
  return data;
}
export async function getNote(id: string): Promise<Note> {
  const { data } = await axiosClient.get(`/notes/${id}`);
  return data;
}
export async function createNote(): Promise<Note> {
  const { data } = await axiosClient.post('/notes', {});
  return data;
}
export async function updateNote(
  id: string,
  payload: Partial<{ title: string; content: string }>,
): Promise<Note> {
  const { data } = await axiosClient.patch(`/notes/${id}`, payload);
  return data;
}
export async function deleteNote(id: string): Promise<void> {
  await axiosClient.delete(`/notes/${id}`);
}