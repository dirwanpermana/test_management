import type { ReactNode } from 'react';
import type { Role } from '../types/entities';
import { useAuth } from './useAuth';

export function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return null;
  return <>{children}</>;
}
