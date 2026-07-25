import { axiosClient } from './axiosClient';
import type { TestCaseHeader, TestCaseItem } from '../types/entities';
import { triggerBlobDownload, sanitizeFilenamePart, currentUserName, todayDateStr } from '../utils/downloadFile';

// import { triggerBlobDownload, sanitizeFilenamePart, currentUserName, todayDateStr } from '../utils/downloadFile';

export async function downloadTemplate(): Promise<void> {
  const response = await axiosClient.get('/test-case-headers/template', { responseType: 'blob' });
  triggerBlobDownload(response.data, 'Test_Case_Template.xlsx');
}

export async function downloadReport(): Promise<void> {
  const response = await axiosClient.get('/test-case-headers/report', { responseType: 'blob' });
  const filename = `Laporan Test Case - ${todayDateStr()} - ${sanitizeFilenamePart(currentUserName())}.xlsx`;
  triggerBlobDownload(response.data, filename);
}

export async function exportItems(headerId: string, headerCode: string, namaTestCase: string): Promise<void> {
  const response = await axiosClient.get(`/test-case-headers/${headerId}/items/export`, { responseType: 'blob' });
  const filename = `${sanitizeFilenamePart(headerCode)} - ${sanitizeFilenamePart(namaTestCase)}.xlsx`;
  triggerBlobDownload(response.data, filename);
}

export async function listHeaders(): Promise<TestCaseHeader[]> {
  const { data } = await axiosClient.get('/test-case-headers');
  return data;
}

export async function createHeader(payload: {
  // namaTestCase: string; sprint?: string; jiraUrl: string; namaMenu: string;
  namaTestCase: string; sprint?: number | null; jiraUrl: string; namaMenu: string;
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

export async function updateHeader(id: string, payload: Partial<{
  // namaTestCase: string; sprint: string; jiraUrl: string; namaMenu: string;
  namaTestCase: string; sprint: number | null; jiraUrl: string; namaMenu: string;
}>): Promise<TestCaseHeader> {
  const { data } = await axiosClient.patch(`/test-case-headers/${id}`, payload);
  return data;
}

export async function uploadCapture(itemId: string, file: File): Promise<TestCaseItem> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post(`/test-case-items/${itemId}/attachments`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data;
}

export async function bulkUpdateItems(items: Array<{ id: string; payload: Partial<TestCaseItem> }>): Promise<void> {
  await axiosClient.put('/test-case-items/bulk', { items });
}


// excel
export interface ImportResult {
  inserted: number;
  skipped: Array<{ rowNumber: number; message: string }>;
}

export async function importItems(headerId: string, file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post(`/test-case-headers/${headerId}/items/import`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data;
}

// // download template excel
// export async function downloadTemplate(): Promise<void> {
//   const response = await axiosClient.get('/test-case-headers/template', { responseType: 'blob' });
//   const url = window.URL.createObjectURL(new Blob([response.data]));
//   const link = document.createElement('a');
//   link.href = url;
//   link.download = 'Test_Case_Template.xlsx';
//   document.body.appendChild(link);
//   link.click();
//   link.remove();
//   window.URL.revokeObjectURL(url);
// }
// // download report
// export async function downloadReport(): Promise<void> {
//   const response = await axiosClient.get('/test-case-headers/report', { responseType: 'blob' });
//   const url = window.URL.createObjectURL(new Blob([response.data]));
//   const link = document.createElement('a');
//   link.href = url;
//   link.download = 'Laporan_Test_Case.xlsx';
//   document.body.appendChild(link);
//   link.click();
//   link.remove();
//   window.URL.revokeObjectURL(url);
// }

// export async function exportItems(headerId: string, headerCode: string): Promise<void> {
//   const response = await axiosClient.get(`/test-case-headers/${headerId}/items/export`, { responseType: 'blob' });
//   const url = window.URL.createObjectURL(new Blob([response.data]));
//   const link = document.createElement('a');
//   link.href = url;
//   link.download = `TestCase_${headerCode}.xlsx`;
//   document.body.appendChild(link);
//   link.click();
//   link.remove();
//   window.URL.revokeObjectURL(url);
// }