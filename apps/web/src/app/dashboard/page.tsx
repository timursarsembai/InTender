'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Сводка</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Добро пожаловать, {user?.email}!</p>

      <div
        style={{
          marginTop: '2rem',
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Моя Организация</h3>
          {user?.organizationId ? (
            <p style={{ color: 'var(--success)' }}>Профиль заполнен</p>
          ) : (
            <p style={{ color: 'var(--warning)' }}>
              Пожалуйста,{' '}
              <Link href="/dashboard/settings" style={{ textDecoration: 'underline' }}>
                заполните профиль организации в настройках
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
