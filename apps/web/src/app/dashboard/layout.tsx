'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/Button/Button';
import styles from './layout.module.css';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout, refreshUser, impersonating, stopImpersonation } = useAuth();
  const router = useRouter();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const handleSwitchRole = async () => {
    if (!user || user.role === 'ADMIN') return;
    setIsSwitchingRole(true);
    try {
      const { access_token } = await api.post<{ access_token: string }>('/auth/switch-role');
      localStorage.setItem('access_token', access_token);
      await refreshUser();
      router.push('/dashboard/orders');
    } catch (err) {
      console.error('Ошибка смены роли', err);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'ADMIN';
  const isModerator = user.role === 'MODERATOR';
  const isStaff = isAdmin || isModerator;

  const formatBalance = (minor: number) => {
    return (minor / 100).toLocaleString('ru-RU') + ' ₸';
  };

  return (
    <div className={styles.container}>
      {impersonating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#7c3aed',
          color: '#fff',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}>
          <span>Вы просматриваете от имени: <strong>{impersonating.email}</strong></span>
          <button
            onClick={stopImpersonation}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
          >
            Выйти из режима
          </button>
        </div>
      )}
      <aside className={styles.sidebar} style={impersonating ? { top: '36px' } : undefined}>
        <div className={styles.logo}>
          <Link href="/dashboard/orders">InTender</Link>
        </div>

        <nav className={styles.nav}>
          {user.role === 'BUYER' && (
            <Link href="/dashboard/orders/new" className={styles.navItem}>
              Создать заказ
            </Link>
          )}
          <Link href="/dashboard/orders" className={styles.navItem}>
            {user.role === 'BUYER' ? 'Мои заказы' : 'Лента заказов'}
          </Link>
          {user.role === 'SUPPLIER' && (
            <Link href="/dashboard/offers" className={styles.navItem}>
              Мои отклики
            </Link>
          )}
          {!isAdmin && (
            <Link href="/dashboard/messages" className={styles.navItem}>
              Сообщения
            </Link>
          )}
          {!isStaff && (
            <Link href="/dashboard/wallet" className={styles.navItem}>
              Кошелек
            </Link>
          )}
          {!isStaff && (
            <Link href="/dashboard/help" className={styles.navItem}>
              Помощь
            </Link>
          )}
          <Link href="/dashboard/notifications" className={styles.navItem}>
            Уведомления
          </Link>
          <Link href="/dashboard/settings" className={styles.navItem}>
            Настройки
          </Link>
          {isStaff && (
            <Link href="/dashboard/admin/support" className={styles.navItem}>
              Поддержка
            </Link>
          )}
          {isAdmin && (
            <Link href="/dashboard/admin/users" className={styles.navItem}>
              Пользователи
            </Link>
          )}
          {isAdmin && (
            <Link href="/dashboard/admin" className={styles.navItem} style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              ⚙ Администратор
            </Link>
          )}
        </nav>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{user.email}</span>
            <span className={styles.userRole}>
              {user.role === 'BUYER'
                ? 'Закупщик'
                : user.role === 'SUPPLIER'
                  ? 'Поставщик'
                  : user.role === 'MODERATOR'
                    ? 'Модератор'
                    : 'Админ'}
            </span>
            {!isStaff && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchRole}
                isLoading={isSwitchingRole}
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  alignSelf: 'flex-start',
                }}
              >
                Сменить на {user.role === 'BUYER' ? 'Поставщика' : 'Закупщика'}
              </Button>
            )}
          </div>
          {!isStaff && user.wallet && (
            <div className={styles.wallet}>
              <span className={styles.walletLabel}>Баланс:</span>
              <span className={styles.walletBalance}>
                {formatBalance(user.wallet.availableBalanceMinor)}
              </span>
            </div>
          )}
          <Button variant="ghost" className={styles.logoutBtn} onClick={logout}>
            Выйти
          </Button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
