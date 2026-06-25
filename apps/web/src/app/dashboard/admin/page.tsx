'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';

interface AiConfig {
  aiProvider: string;
  deepseekApiKeySet: boolean;
  deepseekModel: string;
  anthropicApiKeySet: boolean;
  anthropicModel: string;
  geminiApiKeySet: boolean;
  geminiModel: string;
}

const PROVIDERS = [
  {
    value: 'deepseek',
    label: 'DeepSeek',
    color: '#3b82f6',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek V3 (deepseek-chat) — стандартная' },
      { value: 'deepseek-reasoner', label: 'DeepSeek R1 (deepseek-reasoner) — рассуждения' },
    ],
    keyPlaceholder: 'sk-...',
    keyLabel: 'DeepSeek API Key',
    docsUrl: 'https://platform.deepseek.com',
  },
  {
    value: 'claude',
    label: 'Claude (Anthropic)',
    color: '#d97706',
    models: [
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — рекомендуется' },
      { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 — максимальный' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — быстрый' },
    ],
    keyPlaceholder: 'sk-ant-...',
    keyLabel: 'Anthropic API Key',
    docsUrl: 'https://console.anthropic.com',
  },
  {
    value: 'gemini',
    label: 'Gemini (Google)',
    color: '#16a34a',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — рекомендуется' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — максимальный' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — стабильная' },
    ],
    keyPlaceholder: 'AIza...',
    keyLabel: 'Gemini API Key',
    docsUrl: 'https://aistudio.google.com',
  },
] as const;

type ProviderValue = (typeof PROVIDERS)[number]['value'];

const keySetMap: Record<ProviderValue, keyof AiConfig> = {
  deepseek: 'deepseekApiKeySet',
  claude: 'anthropicApiKeySet',
  gemini: 'geminiApiKeySet',
};

const modelMap: Record<ProviderValue, keyof AiConfig> = {
  deepseek: 'deepseekModel',
  claude: 'anthropicModel',
  gemini: 'geminiModel',
};

export default function AdminPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [activeTab, setActiveTab] = useState<ProviderValue>('deepseek');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Per-provider form state
  const [keys, setKeys] = useState({ deepseek: '', claude: '', gemini: '' });
  const [models, setModels] = useState({
    deepseek: 'deepseek-chat',
    claude: 'claude-sonnet-4-6',
    gemini: 'gemini-2.0-flash',
  });
  const [activeProvider, setActiveProvider] = useState<ProviderValue>('deepseek');

  const loadConfig = useCallback(async () => {
    try {
      const data = await api.get<AiConfig>('/admin/config');
      setConfig(data);
      setActiveProvider(data.aiProvider as ProviderValue);
      setModels({
        deepseek: data.deepseekModel,
        claude: data.anthropicModel,
        gemini: data.geminiModel,
      });
    } catch {
      setMessage({ type: 'error', text: 'Ошибка загрузки конфигурации' });
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const body: Record<string, string> = {
        aiProvider: activeProvider,
        deepseekModel: models.deepseek,
        anthropicModel: models.claude,
        geminiModel: models.gemini,
      };
      if (keys.deepseek) body.deepseekApiKey = keys.deepseek;
      if (keys.claude) body.anthropicApiKey = keys.claude;
      if (keys.gemini) body.geminiApiKey = keys.gemini;

      const data = await api.patch<AiConfig>('/admin/config', body);
      setConfig(data);
      setKeys({ deepseek: '', claude: '', gemini: '' });
      setMessage({ type: 'success', text: 'Настройки сохранены' });
    } catch {
      setMessage({ type: 'error', text: 'Ошибка сохранения' });
    } finally {
      setIsSaving(false);
    }
  };

  const tab = PROVIDERS.find((p) => p.value === activeTab)!;
  const tabKeySet = config ? !!config[keySetMap[activeTab]] : false;
  const tabModel = models[activeTab];

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Панель администратора
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Настройки AI-провайдера и API-ключей
      </p>

      {message && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
        }}>
          {message.text}
        </div>
      )}

      {/* Active provider selector */}
      <div style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Активный провайдер
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {PROVIDERS.map((p) => {
            const keySet = config ? !!config[keySetMap[p.value]] : false;
            const isActive = activeProvider === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setActiveProvider(p.value)}
                style={{
                  flex: 1,
                  minWidth: 160,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${isActive ? p.color : 'var(--border-color)'}`,
                  backgroundColor: isActive ? `${p.color}15` : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.25rem',
                }}
              >
                <span style={{ fontWeight: 600, color: isActive ? p.color : 'var(--text-primary)' }}>
                  {isActive ? '● ' : '○ '}{p.label}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: keySet ? '#dcfce7' : '#fee2e2',
                  color: keySet ? '#166534' : '#991b1b',
                }}>
                  {keySet ? '✓ Ключ задан' : '✗ Нет ключа'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-provider tabs */}
      <div style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.5rem',
        overflow: 'hidden',
      }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => setActiveTab(p.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                borderBottom: activeTab === p.value ? `3px solid ${p.color}` : '3px solid transparent',
                backgroundColor: activeTab === p.value ? `${p.color}10` : 'transparent',
                fontWeight: activeTab === p.value ? 600 : 400,
                color: activeTab === p.value ? p.color : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* API Key */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.4rem' }}>
              {tab.keyLabel}
              {tabKeySet && <span style={{ marginLeft: '0.5rem', color: '#166534', fontSize: '0.75rem' }}>✓ задан</span>}
            </label>
            <Input
              type="password"
              placeholder={tabKeySet ? '••••••••  (оставьте пустым, чтобы не менять)' : tab.keyPlaceholder}
              value={keys[activeTab]}
              onChange={(e) => setKeys((prev) => ({ ...prev, [activeTab]: e.target.value }))}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Документация:{' '}
              <a href={tab.docsUrl} target="_blank" rel="noreferrer" style={{ color: tab.color }}>
                {tab.docsUrl}
              </a>
            </p>
          </div>

          {/* Model selector */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>
              Модель
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tab.models.map((m) => (
                <label
                  key={m.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${tabModel === m.value ? tab.color : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    backgroundColor: tabModel === m.value ? `${tab.color}10` : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name={`model-${activeTab}`}
                    value={m.value}
                    checked={tabModel === m.value}
                    onChange={() => setModels((prev) => ({ ...prev, [activeTab]: m.value }))}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Current config info */}
          {config && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
            }}>
              Текущая модель в базе: <strong>{String(config[modelMap[activeTab]])}</strong>
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleSave} isLoading={isSaving} style={{ width: '100%' }}>
        Сохранить настройки
      </Button>
    </div>
  );
}
