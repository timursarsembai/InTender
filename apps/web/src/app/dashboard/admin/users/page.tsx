'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

interface UserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  organization: { legalName: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  BUYER: 'Закупщик',
  SUPPLIER: 'Поставщик',
  ADMIN: 'Админ',
  MODERATOR: 'Модератор',
};

export default function AdminUsersPage() {
  const { startImpersonation } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async (q?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ skip: '0', take: '50' });
      if (q) params.set('search', q);
      const data = await api.get<{ users: UserRow[]; total: number }>(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      setActionMsg({ type: 'error', text: 'Ошибка загрузки пользователей' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const setRole = async (userId: string, role: string) => {
    try {
      await api.post(`/admin/users/${userId}/set-role`, { role });
      setActionMsg({ type: 'success', text: 'Роль обновлена' });
      load(search || undefined);
    } catch {
      setActionMsg({ type: 'error', text: 'Ошибка изменения роли' });
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      await startImpersonation(userId);
    } catch {
      setActionMsg({ type: 'error', text: 'Не удалось войти в аккаунт' });
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Пользователи</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Всего: {total}
      </p>

      {actionMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          backgroundColor: actionMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: actionMsg.type === 'success' ? '#166534' : '#991b1b',
        }}>
          {actionMsg.text}
        </div>
      )}

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Input
          placeholder="Поиск по email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button type="submit" isLoading={isLoading}>Найти</Button>
      </form>

      <div style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
              {['Email', 'Роль', 'Статус', 'Организация', 'Дата', 'Действия'].map((h) => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{u.email}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: u.role === 'MODERATOR' ? '#dbeafe' : u.role === 'ADMIN' ? '#fef3c7' : '#f3f4f6',
                    color: u.role === 'MODERATOR' ? '#1e40af' : u.role === 'ADMIN' ? '#92400e' : '#374151',
                  }}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: u.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)' }}>
                  {u.status}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {u.organization?.legalName ?? '—'}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {u.role !== 'ADMIN' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {u.role === 'MODERATOR' ? (
                        <button
                          onClick={() => setRole(u.id, 'BUYER')}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: 'transparent' }}
                        >
                          Снять модератора
                        </button>
                      ) : (
                        <button
                          onClick={() => setRole(u.id, 'MODERATOR')}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid #3b82f6', color: '#3b82f6', cursor: 'pointer', backgroundColor: 'transparent' }}
                        >
                          Сделать модератором
                        </button>
                      )}
                      <button
                        onClick={() => handleImpersonate(u.id)}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid #7c3aed', color: '#7c3aed', cursor: 'pointer', backgroundColor: 'transparent' }}
                      >
                        Войти как
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Пользователи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
