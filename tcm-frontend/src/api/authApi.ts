import { axiosClient } from './axiosClient';
import type { AuthSession } from '../types/entities';

export async function login(username: string, password: string): Promise<AuthSession> {
  const { data } = await axiosClient.post<AuthSession>('/auth/login', { username, password });
  return data;
}

export async function getDevUsers() {
  const { data } = await axiosClient.get('/users', { params: { role: 'DEV' } });
  return data;
}
