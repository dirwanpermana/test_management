import { axiosClient } from './axiosClient';

export interface UserOption {
  id: string;
  fullName: string;
}

export async function listUsersByRole(role: 'QA' | 'DEV'): Promise<UserOption[]> {
  const { data } = await axiosClient.get('/users', { params: { role } });
  return data;
}