import { axiosClient } from './axiosClient';
import type { TestCaseHeader, TestCaseItem } from '../types/entities';

export async function listHeaders(): Promise<TestCaseHeader[]> {
  const { data } = await axiosClient.get('/test-case-headers');
  return data;
}

export async function createHeader(payload: {
  namaTestCase: string; sprint?: string; jiraUrl: string; namaMenu: string;
}): Promise<TestCaseHeader> {
  const { data } = await axiosClient.post('/test-case-headers', payload);
  return data;
}

export async function deleteHeader(id: string): Promise<void> {
  await axiosClient.delete(`/test-case-headers/${id}`);
}

export async function listItems(headerId?: string): Promise<TestCaseItem[]> {
  const { data } = await axiosClient.get('/test-case-items', { params: headerId ? { headerId } : {} });
  return data;
}

export async function createItem(headerId: string, payload: Partial<TestCaseItem>): Promise<TestCaseItem> {
  const { data } = await axiosClient.post(`/test-case-headers/${headerId}/items`, payload);
  return data;
}

export async function updateItem(id: string, payload: Partial<TestCaseItem>): Promise<TestCaseItem> {
  const { data } = await axiosClient.put(`/test-case-items/${id}`, payload);
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  await axiosClient.delete(`/test-case-items/${id}`);
}
