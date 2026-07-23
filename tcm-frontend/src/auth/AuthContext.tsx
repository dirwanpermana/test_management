import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types/entities';
import { login as loginApi } from '../api/authApi';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('tcm_user');
    const storedToken = localStorage.getItem('tcm_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const session = await loginApi(username, password);
    localStorage.setItem('tcm_token', session.token);
    localStorage.setItem('tcm_user', JSON.stringify(session.user));
    setUser(session.user);
  }

  function logout() {
    localStorage.removeItem('tcm_token');
    localStorage.removeItem('tcm_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
