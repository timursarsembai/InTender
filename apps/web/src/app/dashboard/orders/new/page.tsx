'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import {
  LocationAutocomplete,
  LocationData,
} from '@/components/ui/LocationAutocomplete/LocationAutocomplete';
import { Map } from '@/components/ui/Map';

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
    deliveryRegion: '',
    deliveryDistrict: '',
    deliveryCity: '',
    deliveryLat: null as number | null,
    deliveryLng: null as number | null,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
    logistics: 'EITHER',
    vatOption: 'VAT_ANY',
  });

  // Polling for AI Job
  useEffect(() => {
    if (!aiJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const job = await api.get<any>(`/ai/jobs/${aiJobId}`);

        if (job.status === 'COMPLETED') {
          clearInterval(pollInterval);
          setIsAiLoading(false);
          setAiJobId(null);

          // Apply parsed data to form
          if (job.resultJson && job.resultJson.items && job.resultJson.items.length > 0) {
            // Merge all items into specification text
            const mergedSpec = job.resultJson.items
              .map(
                (item: any) =>
                  `${item.name} | ${item.quantity} ${item.unit} | ${item.specification || ''}`,
              )
              .join('\n\n');

            setFormData((prev) => ({
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

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const region = addr.state || addr.region || '';
        const district = addr.county || addr.district || '';
        const city =
          addr.city || addr.town || addr.village || addr.settlement || addr.municipality || '';

        const parts = [city, district, region].filter(Boolean);
        const fullAddress = parts.join(', ');

        setFormData((prev) => ({
          ...prev,
          deliveryAddress: fullAddress || data.display_name,
          deliveryRegion: region,
          deliveryDistrict: district,
          deliveryCity: city,
          deliveryLat: lat,
          deliveryLng: lng,
        }));
      }
    } catch (err) {
      console.error('Failed to reverse geocode', err);
    }
  };

  const startAiParsing = async () => {
    if (!selectedFile) return;
    setShowAiConfirmModal(false);
    setIsAiLoading(true);

    try {
      // 1. Upload file
      const intentRes = await api.post<any>('/files/upload-intent', {
        originalName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
      });

      // Upload to S3 directly
      await fetch(intentRes.uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
        },
      });

      // Complete upload
      const fileRes = await api.post<any>(`/files/${intentRes.fileId}/complete`);

      // 2. Start AI parsing (costs 1000 KZT)
      const parseRes = await api.post<any>('/ai/jobs', {
        fileId: intentRes.fileId,
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

    // Check which button submitted the form
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    const isPublishing = submitter?.name === 'publish';

    setIsLoading(true);

    try {
      // 1. Create Draft
      const draft = await api.post<any>('/orders', {
        title: formData.title,
        quantity: parseInt(formData.quantity, 10),
        unit: formData.unit,
        specification: formData.specification,
        deliveryAddress: formData.deliveryAddress,
        deliveryRegion: formData.deliveryRegion,
        deliveryDistrict: formData.deliveryDistrict,
        deliveryCity: formData.deliveryCity,
        deliveryLat: formData.deliveryLat,
        deliveryLng: formData.deliveryLng,
        deadline: new Date(formData.deadline).toISOString(),
        logistics: formData.logistics,
        vatOption: formData.vatOption,
      });

      if (isPublishing) {
        // 2. Publish immediately (costs 50 KZT)
        await api.post(`/orders/${draft.id}/publish`, {
          idempotencyKey: `publish-${Date.now()}`,
        });
      }

      router.push('/dashboard/orders');
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка сохранения заказа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '2rem',
        minHeight: 'calc(100vh - 4rem)',
      }}
    >
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>
          Создать новый заказ
        </h1>

        {/* AI Parsing Section */}
        <div
          style={{
            backgroundColor: 'var(--accent-light)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
            border: '1px dashed var(--accent-primary)',
          }}
        >
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--accent-hover)',
              marginBottom: '0.5rem',
            }}
          >
            Умное предзаполнение (AI)
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Загрузите файл спецификации в формате PDF или Excel, и наш ИИ автоматически извлечет
            список товаров и требования. Стоимость: <strong>1 000 ₸</strong>.
          </p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAiLoading}
            >
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
        <form
          id="new-order-form"
          onSubmit={handleSubmit}
          style={{
            backgroundColor: 'var(--bg-elevated)',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <Input
            label="Название тендера"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Например: Поставка офисной бумаги А4"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Количество"
              type="number"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              min="1"
            />
            <Input
              label="Единица измерения"
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="шт, кг, литр"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Спецификация
            </label>
            <textarea
              required
              rows={6}
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              value={formData.specification}
              onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
              placeholder="Опишите требования к товару или вставьте текст..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <Input
              label="Дедлайн"
              type="date"
              required
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />

            <Select
              label="Логистика"
              value={formData.logistics}
              onChange={(e) => setFormData({ ...formData, logistics: e.target.value })}
              options={[
                { label: 'Любая', value: 'EITHER' },
                { label: 'Самовывоз', value: 'BUYER_PICKUP' },
                { label: 'Доставка', value: 'SUPPLIER_DELIVERY' },
              ]}
            />

            <Select
              label="НДС"
              value={formData.vatOption}
              onChange={(e) => setFormData({ ...formData, vatOption: e.target.value })}
              options={[
                { label: 'Не важно', value: 'VAT_ANY' },
                { label: 'С НДС', value: 'VAT_REQUIRED' },
                { label: 'Без НДС', value: 'VAT_NOT_REQUIRED' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button
              type="submit"
              name="draft"
              variant="outline"
              size="lg"
              isLoading={isLoading}
              style={{ flex: 1 }}
            >
              Сохранить в черновиках
            </Button>
            <Button
              type="submit"
              name="publish"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              style={{ flex: 1 }}
            >
              Опубликовать заказ (50 ₸)
            </Button>
          </div>
        </form>
      </div>

      {/* Right Column: Full Height Map */}
      <div style={{ position: 'relative', margin: '-2rem -2rem -2rem 0' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', width: '100%' }}>
          {/* Floating Autocomplete over the map */}
          <div
            style={{
              position: 'absolute',
              top: '1.5rem',
              left: '1.5rem',
              right: '1.5rem',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-elevated)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid var(--border-color)',
              }}
            >
              <LocationAutocomplete
                label="Адрес доставки (Область, Город, Район)"
                value={formData.deliveryAddress}
                onChange={(address, locationData) => {
                  setFormData((prev) => {
                    const next = { ...prev, deliveryAddress: address };
                    if (locationData) {
                      next.deliveryRegion = locationData.region;
                      next.deliveryDistrict = locationData.district;
                      next.deliveryCity = locationData.city;
                      next.deliveryLat = locationData.lat;
                      next.deliveryLng = locationData.lng;
                    }
                    return next;
                  });
                }}
                required
              />
            </div>
          </div>

          <Map
            center={
              formData.deliveryLat && formData.deliveryLng
                ? [formData.deliveryLat, formData.deliveryLng]
                : [48.0196, 66.9237]
            }
            zoom={formData.deliveryLat ? 13 : 5}
            markerPosition={
              formData.deliveryLat && formData.deliveryLng
                ? [formData.deliveryLat, formData.deliveryLng]
                : null
            }
            onMarkerChange={(pos) => {
              setFormData((prev) => ({ ...prev, deliveryLat: pos[0], deliveryLng: pos[1] }));
              fetchAddressFromCoords(pos[0], pos[1]);
            }}
            style={{ height: '100%', borderRadius: 0, border: 'none' }}
          />
        </div>
      </div>

      {/* AI Confirmation Modal */}
      <Modal
        isOpen={showAiConfirmModal}
        onClose={() => setShowAiConfirmModal(false)}
        title="Подтверждение списания"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAiConfirmModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={startAiParsing}>
              Подтвердить (1 000 ₸)
            </Button>
          </>
        }
      >
        <p>
          Вы собираетесь запустить автоматический разбор файла спецификации с помощью ИИ. С вашего
          баланса будет немедленно списано <strong>1 000 ₸</strong>.
        </p>
        <p style={{ marginTop: '1rem' }}>
          Если система не сможет обработать файл, средства будут возвращены.
        </p>
      </Modal>

      {/* Info/Confirm Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        footer={
          <>
            {modalState.type === 'confirm' && (
              <Button
                variant="ghost"
                onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
              >
                Отмена
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => {
                setModalState((prev) => ({ ...prev, isOpen: false }));
                if (modalState.type === 'confirm' && modalState.onConfirm) {
                  modalState.onConfirm();
                }
              }}
            >
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
