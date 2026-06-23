'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    legalType: 'TOO',
    legalName: '',
    bin: '',
    cityId: '',
  });

  useEffect(() => {
    if (user) {
      api.get<any>('/me/organization').then((org) => {
        if (org) {
          setFormData({
            legalType: org.legalType || 'TOO',
            legalName: org.legalName || '',
            bin: org.bin || '',
            cityId: org.cityId || '',
          });
        }
      }).catch(console.error);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(false);
    setError('');

    try {
      await api.post('/organizations', formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения профиля');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>Настройки профиля</h1>
      
      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Организация</h2>
        
        {success && <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>Профиль организации успешно сохранен!</div>}
        {error && <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Select
            label="Форма собственности"
            value={formData.legalType}
            onChange={(e) => setFormData({ ...formData, legalType: e.target.value })}
            options={[
              { label: 'ТОО', value: 'TOO' },
              { label: 'ИП', value: 'IP' },
              { label: 'Прочее', value: 'OTHER' },
            ]}
          />
          <Input
            label="Юридическое название"
            placeholder="Например, Ромашка"
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            required
          />
          <Input
            label="БИН / ИИН"
            placeholder="123456789012"
            value={formData.bin}
            onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
            maxLength={12}
            minLength={12}
            required
          />
          <Input
            label="Город"
            placeholder="Алматы, Астана..."
            value={formData.cityId}
            onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
          />

          <Button type="submit" isLoading={isLoading} style={{ marginTop: '1rem' }}>
            Сохранить профиль
          </Button>
        </form>
      </div>
    </div>
  );
}
