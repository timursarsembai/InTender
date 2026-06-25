'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';

interface AiConfig {
  aiProvider: string;
  deepseekApiKeySet: boolean;
  anthropicApiKeySet: boolean;
  geminiApiKeySet: boolean;
}

const PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek', docsUrl: 'https://platform.deepseek.com' },
  { value: 'claude', label: 'Claude (Anthropic)', docsUrl: 'https://console.anthropic.com' },
  { value: 'gemini', label: 'Gemini (Google)', docsUrl: 'https://aistudio.google.com' },
];

export default function AdminPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const data = await api.get<AiConfig>('/admin/config');
      setConfig(data);
      setSelectedProvider(data.aiProvider);
    } catch {
      setMessage({ type: 'error', text: 'Ошибка загрузки конфигурации' });
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const body: Record<string, string> = { aiProvider: selectedProvider };
      if (deepseekKey) body.deepseekApiKey = deepseekKey;
      if (anthropicKey) body.anthropicApiKey = anthropicKey;
      if (geminiKey) body.geminiApiKey = geminiKey;

      const data = await api.patch<AiConfig>('/admin/config', body);
      setConfig(data);
      setDeepseekKey('');
      setAnthropicKey('');
      setGeminiKey('');
      setMessage({ type: 'success', text: 'Настройки сохранены' });
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сохранения' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Панель администратора
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Настройки AI-провайдера и API-ключей
      </p>

      {message && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            backgroundColor: message.type === 'success' ? 'var(--success-light, #dcfce7)' : 'var(--error-light, #fee2e2)',
            color: message.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {message.text}
        </div>
      )}

      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Активный AI-провайдер
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {PROVIDERS.map((p) => (
            <label
              key={p.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${selectedProvider === p.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                backgroundColor: selectedProvider === p.value ? 'var(--accent-light)' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="provider"
                value={p.value}
                checked={selectedProvider === p.value}
                onChange={() => setSelectedProvider(p.value)}
              />
              <span style={{ fontWeight: 500 }}>{p.label}</span>
              {config && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor:
                      (p.value === 'deepseek' && config.deepseekApiKeySet) ||
                      (p.value === 'claude' && config.anthropicApiKeySet) ||
                      (p.value === 'gemini' && config.geminiApiKeySet)
                        ? '#dcfce7'
                        : '#fee2e2',
                    color:
                      (p.value === 'deepseek' && config.deepseekApiKeySet) ||
                      (p.value === 'claude' && config.anthropicApiKeySet) ||
                      (p.value === 'gemini' && config.geminiApiKeySet)
                        ? '#166534'
                        : '#991b1b',
                  }}
                >
                  {(p.value === 'deepseek' && config.deepseekApiKeySet) ||
                  (p.value === 'claude' && config.anthropicApiKeySet) ||
                  (p.value === 'gemini' && config.geminiApiKeySet)
                    ? '✓ Ключ задан'
                    : '✗ Нет ключа'}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          API-ключи
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Ключи хранятся в базе данных. Оставьте поле пустым, чтобы не менять текущий ключ.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.4rem' }}>
              DeepSeek API Key
              {config?.deepseekApiKeySet && (
                <span style={{ marginLeft: '0.5rem', color: '#166534', fontSize: '0.75rem' }}>✓ задан</span>
              )}
            </label>
            <Input
              type="password"
              placeholder={config?.deepseekApiKeySet ? '••••••••' : 'sk-...'}
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.4rem' }}>
              Anthropic API Key (Claude)
              {config?.anthropicApiKeySet && (
                <span style={{ marginLeft: '0.5rem', color: '#166534', fontSize: '0.75rem' }}>✓ задан</span>
              )}
            </label>
            <Input
              type="password"
              placeholder={config?.anthropicApiKeySet ? '••••••••' : 'sk-ant-...'}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.4rem' }}>
              Gemini API Key (Google)
              {config?.geminiApiKeySet && (
                <span style={{ marginLeft: '0.5rem', color: '#166534', fontSize: '0.75rem' }}>✓ задан</span>
              )}
            </label>
            <Input
              type="password"
              placeholder={config?.geminiApiKeySet ? '••••••••' : 'AIza...'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} isLoading={isSaving} style={{ width: '100%' }}>
        Сохранить настройки
      </Button>
    </div>
  );
}
