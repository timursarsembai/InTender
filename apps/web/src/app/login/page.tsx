'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<{ access_token: string; user: any }>('/auth/login', {
        email,
        password,
      });
      
      login(response.access_token, response.user);
    } catch (err: any) {
      let errorMessage = err.message || 'Ошибка входа';
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.map(e => typeof e === 'object' ? JSON.stringify(e) : String(e)).join(', ');
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>InTender</Link>
          <h1 className={styles.title}>С возвращением</h1>
          <p className={styles.subtitle}>Войдите в свой аккаунт, чтобы продолжить</p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
          />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          
          <Button type="submit" variant="primary" isLoading={isLoading} className={styles.submitBtn}>
            Войти
          </Button>
        </form>

        <p className={styles.footer}>
          Нет аккаунта?{' '}
          <Link href="/register" className={styles.link}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
