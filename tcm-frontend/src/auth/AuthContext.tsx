// import { createContext, useEffect, useState, type ReactNode } from 'react';
// import type { User } from '../types/entities';
// import { login as loginApi } from '../api/authApi';

// interface AuthContextValue {
//   user: User | null;
//   isLoading: boolean;
//   login: (username: string, password: string) => Promise<void>;
//   logout: () => void;
// }

// export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   // useEffect(() => {
//   //   const storedUser = localStorage.getItem('tcm_user');
//   //   const storedToken = localStorage.getItem('tcm_token');
//   //   if (storedUser && storedToken) {
//   //     setUser(JSON.parse(storedUser));
//   //   }
//   //   setIsLoading(false);
//   // }, []);

//   useEffect(() => {
//   if (isLoading || !headerId || readOnly) return;
//   if (items.length > 0) return;
//   if (seededHeaderRef.current === headerId) return;
//   seededHeaderRef.current = headerId;

//   (async () => {
//     try {
//       for (let i = 0; i < DEFAULT_ROW_COUNT; i += 1) {
//         // eslint-disable-next-line no-await-in-loop
//         await createItem.mutateAsync(blankRowPayload());
//       }
//     } catch (err) {
//       console.error('Auto-seed gagal:', err);
//       seededHeaderRef.current = null; // allow retry instead of a permanently half-seeded header
//     }
//   })();
//   // eslint-disable-next-line react-hooks/exhaustive-deps
// }, [headerId, isLoading, items.length, readOnly]);

//   async function login(username: string, password: string) {
//     const session = await loginApi(username, password);
//     localStorage.setItem('tcm_token', session.token);
//     localStorage.setItem('tcm_user', JSON.stringify(session.user));
//     setUser(session.user);
//   }

//   function logout() {
//     localStorage.removeItem('tcm_token');
//     localStorage.removeItem('tcm_user');
//     setUser(null);
//   }

//   return (
//     <AuthContext.Provider value={{ user, isLoading, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }


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

  // Listener untuk 401 dari axiosClient — logout secara deklaratif,
  // biar PrivateRoute yang redirect ke /login, bukan hard window.location.href.
  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem('tcm_token');
      localStorage.removeItem('tcm_user');
      setUser(null);
    }
    window.addEventListener('tcm:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('tcm:unauthorized', handleUnauthorized);
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