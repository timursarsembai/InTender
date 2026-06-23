'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';

export default function NewOrderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'confirm';
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info' });

  const showInfo = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: 'info' });
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    quantity: '1',
    unit: 'шт',
    specification: '',
    deliveryAddress: '',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
    logistics: 'EITHER',
    vatOption: 'VAT_ANY',
  });

  // Polling for AI Job
  useEffect(() => {
    if (!aiJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const job = await api.get<any>(`/ai/specifications/jobs/${aiJobId}`);
        
        if (job.status === 'COMPLETED') {
          clearInterval(pollInterval);
          setIsAiLoading(false);
          setAiJobId(null);
          
          // Apply parsed data to form
          if (job.resultJson && job.resultJson.items && job.resultJson.items.length > 0) {
            // Merge all items into specification text
            const mergedSpec = job.resultJson.items.map((item: any) => 
              `${item.name} | ${item.quantity} ${item.unit} | ${item.specification || ''}`
            ).join('\n\n');
            
            setFormData(prev => ({
              ...prev,
              title: job.resultJson.items[0].name || prev.title,
              specification: mergedSpec,
            }));
            showInfo('Успех', 'Спецификация успешно распознана!');
          }
        } else if (job.status === 'FAILED') {
          clearInterval(pollInterval);
          setIsAiLoading(false);
          setAiJobId(null);
          showInfo('Ошибка', 'Ошибка ИИ-парсинга. Средства будут возвращены.');
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [aiJobId]);


  const startAiParsing = async () => {
    if (!selectedFile) return;
    setShowAiConfirmModal(false);
    setIsAiLoading(true);

    try {
      // 1. Upload file
      const uploadData = new FormData();
      uploadData.append('file', selectedFile);
      uploadData.append('visibility', 'OWNER_ONLY_AI_SOURCE');
      
      const fileRes = await api.post<any>('/files/upload', uploadData);
      
      // 2. Start AI parsing (costs 1000 KZT)
      const parseRes = await api.post<any>('/ai/specifications/parse', {
        fileId: fileRes.id,
        idempotencyKey: `ai-${Date.now()}`,
      });

      setAiJobId(parseRes.id);
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка запуска ИИ');
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Create Draft
      const draft = await api.post<any>('/orders', {
        title: formData.title,
        quantity: parseInt(formData.quantity, 10),
        unit: formData.unit,
        specification: formData.specification,
        deliveryAddress: formData.deliveryAddress,
        deadline: new Date(formData.deadline).toISOString(),
        logistics: formData.logistics,
        vatOption: formData.vatOption,
      });

      // 2. Publish immediately (costs 50 KZT)
      await api.post(`/orders/${draft.id}/publish`, {
        idempotencyKey: `publish-${Date.now()}`
      });

      router.push('/dashboard/orders');
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка публикации заказа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>Создать новый заказ</h1>

      {/* AI Parsing Section */}
      <div style={{ backgroundColor: 'var(--accent-light)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', border: '1px dashed var(--accent-primary)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-hover)', marginBottom: '0.5rem' }}>Умное предзаполнение (AI)</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Загрузите файл спецификации в формате PDF или Excel, и наш ИИ автоматически извлечет список товаров и требования. Стоимость: <strong>1 000 ₸</strong>.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isAiLoading}>
            Выбрать файл
          </Button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {selectedFile ? selectedFile.name : 'Файл не выбран'}
          </span>
          
          {selectedFile && (
            <Button 
              variant="primary" 
              isLoading={isAiLoading}
              onClick={() => setShowAiConfirmModal(true)}
            >
              {isAiLoading ? 'Распознаем...' : 'Запустить ИИ (1 000 ₸)'}
            </Button>
          )}
        </div>
      </div>

      {/* Manual Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-elevated)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <Input label="Название тендера" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Например: Поставка офисной бумаги А4" />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="Количество" type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} min="1" />
          <Input label="Единица измерения" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="шт, кг, литр" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>Спецификация</label>
          <textarea 
            required
            rows={6}
            style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
            value={formData.specification} 
            onChange={e => setFormData({...formData, specification: e.target.value})}
            placeholder="Опишите требования к товару или вставьте текст..."
          />
        </div>

        <Input label="Адрес доставки" required value={formData.deliveryAddress} onChange={e => setFormData({...formData, deliveryAddress: e.target.value})} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <Input label="Дедлайн" type="date" required value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
          
          <Select 
            label="Логистика" 
            value={formData.logistics} 
            onChange={e => setFormData({...formData, logistics: e.target.value})}
            options={[
              { label: 'Любая', value: 'EITHER' },
              { label: 'Самовывоз', value: 'BUYER_PICKUP' },
              { label: 'Доставка', value: 'SUPPLIER_DELIVERY' },
            ]}
          />
          
          <Select 
            label="НДС" 
            value={formData.vatOption} 
            onChange={e => setFormData({...formData, vatOption: e.target.value})}
            options={[
              { label: 'Не важно', value: 'VAT_ANY' },
              { label: 'С НДС', value: 'VAT_REQUIRED' },
              { label: 'Без НДС', value: 'VAT_NOT_REQUIRED' },
            ]}
          />
        </div>

        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ marginTop: '1rem' }}>
          Опубликовать заказ (50 ₸)
        </Button>
      </form>

      {/* AI Confirmation Modal */}
      <Modal 
        isOpen={showAiConfirmModal} 
        onClose={() => setShowAiConfirmModal(false)}
        title="Подтверждение списания"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAiConfirmModal(false)}>Отмена</Button>
            <Button variant="primary" onClick={startAiParsing}>Подтвердить (1 000 ₸)</Button>
          </>
        }
      >
        <p>Вы собираетесь запустить автоматический разбор файла спецификации с помощью ИИ. С вашего баланса будет немедленно списано <strong>1 000 ₸</strong>.</p>
        <p style={{ marginTop: '1rem' }}>Если система не сможет обработать файл, средства будут возвращены.</p>
      </Modal>

      {/* Info/Confirm Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        footer={
          <>
            {modalState.type === 'confirm' && (
              <Button variant="ghost" onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}>Отмена</Button>
            )}
            <Button variant="primary" onClick={() => {
              setModalState(prev => ({ ...prev, isOpen: false }));
              if (modalState.type === 'confirm' && modalState.onConfirm) {
                modalState.onConfirm();
              }
            }}>
              ОК
            </Button>
          </>
        }
      >
        <p>{modalState.message}</p>
      </Modal>
    </div>
  );
}
