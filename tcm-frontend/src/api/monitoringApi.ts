import { axiosClient } from './axiosClient';
import type { BugMonitoring, TestCaseMonitoring } from '../types/entities';

export async function getTestCaseMonitoring(): Promise<TestCaseMonitoring[]> {
  const { data } = await axiosClient.get('/monitoring/test-cases');
  return data;
}

export async function getBugMonitoring(): Promise<BugMonitoring[]> {
  const { data } = await axiosClient.get('/monitoring/bugs');
  return data;
}
