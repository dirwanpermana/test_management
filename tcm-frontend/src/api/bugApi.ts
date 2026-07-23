import { axiosClient } from './axiosClient';
import type { Bug, BugComment, BugStatus, BugStatusHistory } from '../types/entities';

export async function listBugs(): Promise<Bug[]> {
  const { data } = await axiosClient.get('/bugs');
  return data;
}

export async function getBugDetail(id: string): Promise<{ bug: Bug; comments: BugComment[]; history: BugStatusHistory[] }> {
  const { data } = await axiosClient.get(`/bugs/${id}`);
  return data;
}

export async function createBug(payload: {
  testCaseNo?: string; scenario: string; stepsToReproduce: string;
  expectedResult: string; actualResult: string; assignedTo?: string;
}): Promise<Bug> {
  const { data } = await axiosClient.post('/bugs', payload);
  return data;
}

export async function changeBugStatus(id: string, status: BugStatus): Promise<Bug> {
  const { data } = await axiosClient.patch(`/bugs/${id}/status`, { status });
  return data;
}

export async function addComment(id: string, comment: string): Promise<BugComment> {
  const { data } = await axiosClient.post(`/bugs/${id}/comments`, { comment });
  return data;
}
