'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SUPPLIER'>('BUYER');
  const [legalType, setLegalType] = useState<'TOO' | 'IP' | 'OTHER'>('TOO');
  const [legalName, setLegalName] = useState('');
  const [bin, setBin] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<{ access_token: string; user: any }>('/auth/register', {
        email,
        password,
        role,
        legalType,
        legalName,
        bin,
      });

      login(response.access_token, response.user);
    } catch (err: any) {
      let errorMessage = err.message || 'Ошибка регистрации';
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage
          .map((e) => (typeof e === 'object' ? JSON.stringify(e) : String(e)))
          .join(', ');
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>
            InTender
          </Link>
          <h1 className={styles.title}>Регистрация</h1>
          <p className={styles.subtitle}>Создайте аккаунт, чтобы начать работу</p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <input type="radio" checked={role === 'BUYER'} onChange={() => setRole('BUYER')} />Я
              закупщик
            </label>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <input
                type="radio"
                checked={role === 'SUPPLIER'}
                onChange={() => setRole('SUPPLIER')}
              />
              Я поставщик
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <select
              value={legalType}
              onChange={(e) => setLegalType(e.target.value as any)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="TOO">ТОО</option>
              <option value="IP">ИП</option>
              <option value="OTHER">Другое</option>
            </select>
            <Input
              label=""
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Название компании"
              required
              style={{ flex: 1 }}
            />
          </div>

          <Input
            label="БИН / ИИН"
            type="text"
            value={bin}
            onChange={(e) => setBin(e.target.value)}
            placeholder="12 цифр"
            required
            maxLength={12}
            minLength={12}
          />

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
            minLength={8}
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className={styles.submitBtn}
          >
            Зарегистрироваться
          </Button>
        </form>

        <p className={styles.footer}>
          Уже есть аккаунт?{' '}
          <Link href="/login" className={styles.link}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
