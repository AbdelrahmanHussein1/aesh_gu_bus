'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Role, User } from '@/lib/types';
import { API_URL } from '@/lib/api';

const MOCK_USERS: Record<string, User> = {
  'supervisor@gu.edu.eg': { id: 'supervisor-id', email: 'supervisor@gu.edu.eg', fullName: 'Supervisor Aesh', role: 'supervisor' },
  'admin@gu.edu.eg': { id: 'admin-id', email: 'admin@gu.edu.eg', fullName: 'System Administrator', role: 'admin' },
};

export function useAuth() {
  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('rider');
  const [isOffline, setIsOffline] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('aesh_web_token');
    const savedUser = localStorage.getItem('aesh_web_user');
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.id === 'user-default-id') {
          localStorage.removeItem('aesh_web_token');
          localStorage.removeItem('aesh_web_user');
          setToken('');
          setUser(null);
          setRole('rider');
        } else {
          setToken(savedToken);
          setUser(parsed);
          setRole(parsed.role);
        }
      } catch {
        setToken('');
        setUser(null);
        setRole('rider');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (isOffline) {
      await new Promise(r => setTimeout(r, 800));
      const mockUser = MOCK_USERS[email] || { id: 'mock-rider', email, fullName: 'Student Rider', role: 'rider' as Role };
      localStorage.setItem('aesh_web_token', 'mock-offline-token');
      localStorage.setItem('aesh_web_user', JSON.stringify(mockUser));
      setToken('mock-offline-token');
      setUser(mockUser);
      setRole(mockUser.role);
      return;
    }
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Authentication failed');
    }
    const data = await res.json();
    localStorage.setItem('aesh_web_token', data.token);
    localStorage.setItem('aesh_web_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setRole(data.user.role);
  }, [isOffline]);

  const logout = useCallback(() => {
    localStorage.removeItem('aesh_web_token');
    localStorage.removeItem('aesh_web_user');
    setToken('');
    setUser(null);
    setRole('rider');
  }, []);

  const switchRole = useCallback((newRole: Role) => {
    if (!isOffline) {
      logout();
      return;
    }
    setRole(newRole);
    const mockUser = MOCK_USERS[newRole === 'rider' ? 'student@gu.edu.eg' : newRole === 'supervisor' ? 'supervisor@gu.edu.eg' : 'admin@gu.edu.eg'] || { id: 'mock-rider', email: 'student@gu.edu.eg', fullName: 'Student Rider', role: 'rider' as Role };
    setUser(mockUser);
  }, [isOffline, logout]);

  return { token, user, role, isOffline, loading, login, logout, switchRole, setIsOffline };
}
