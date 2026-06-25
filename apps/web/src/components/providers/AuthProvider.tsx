'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: 'BUYER' | 'SUPPLIER' | 'ADMIN' | 'MODERATOR';
  organizationId?: string;
  wallet?: {
    availableBalanceMinor: number;
  };
}

interface ImpersonatingInfo {
  userId: string;
  email: string;
  originalToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  impersonating: ImpersonatingInfo | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [impersonating, setImpersonating] = useState<ImpersonatingInfo | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('impersonation');
    return raw ? (JSON.parse(raw) as ImpersonatingInfo) : null;
  });
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const data = await api.get<User>('/auth/me');
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user', error);
      setUser(null);
      localStorage.removeItem('access_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      setUser(null);
      if (pathname !== '/login' && pathname !== '/register' && pathname !== '/') {
        router.push('/login');
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [pathname, router]);

  const login = (token: string, userData: User) => {
    localStorage.setItem('access_token', token);
    setUser(userData);
    router.push('/dashboard/orders');
  };

  const logout = () => {
    if (impersonating) {
      stopImpersonation();
      return;
    }
    localStorage.removeItem('access_token');
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const startImpersonation = async (userId: string) => {
    const originalToken = localStorage.getItem('access_token');
    if (!originalToken) return;

    const { access_token, user: targetUser } = await api.post<{
      access_token: string;
      user: { id: string; email: string; role: string };
    }>(`/admin/impersonate/${userId}`);

    const info: ImpersonatingInfo = { userId, email: targetUser.email, originalToken };
    setImpersonating(info);
    localStorage.setItem('impersonation', JSON.stringify(info));
    localStorage.setItem('access_token', access_token);
    await fetchUser();
    router.push('/dashboard/orders');
  };

  const stopImpersonation = () => {
    if (!impersonating) return;
    localStorage.setItem('access_token', impersonating.originalToken);
    localStorage.removeItem('impersonation');
    setImpersonating(null);
    fetchUser().then(() => router.push('/dashboard/admin/users'));
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, impersonating, login, logout, refreshUser, startImpersonation, stopImpersonation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
