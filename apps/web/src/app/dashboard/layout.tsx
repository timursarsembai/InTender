'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/Button/Button';
import styles from './layout.module.css';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!user) {
    // If not user and not loading, we redirect to login in AuthProvider, but just in case
    return null; 
  }

  const formatBalance = (minor: number) => {
    return (minor / 100).toLocaleString('ru-RU') + ' ₸';
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Link href="/dashboard">InTender</Link>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navItem}>Сводка</Link>
          {user.role === 'BUYER' && (
            <Link href="/dashboard/orders/new" className={styles.navItem}>Создать заказ</Link>
          )}
          <Link href="/dashboard/orders" className={styles.navItem}>
            {user.role === 'BUYER' ? 'Мои заказы' : 'Лента заказов'}
          </Link>
          {user.role === 'SUPPLIER' && (
            <Link href="/dashboard/offers" className={styles.navItem}>Мои отклики</Link>
          )}
          <Link href="/dashboard/wallet" className={styles.navItem}>Кошелек</Link>
          <Link href="/dashboard/notifications" className={styles.navItem}>Уведомления</Link>
          <Link href="/dashboard/settings" className={styles.navItem}>Настройки</Link>
        </nav>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{user.email}</span>
            <span className={styles.userRole}>
              {user.role === 'BUYER' ? 'Закупщик' : user.role === 'SUPPLIER' ? 'Поставщик' : 'Админ'}
            </span>
          </div>
          {user.wallet && (
            <div className={styles.wallet}>
              <span className={styles.walletLabel}>Баланс:</span>
              <span className={styles.walletBalance}>{formatBalance(user.wallet.availableBalanceMinor)}</span>
            </div>
          )}
          <Button variant="ghost" className={styles.logoutBtn} onClick={logout}>Выйти</Button>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
