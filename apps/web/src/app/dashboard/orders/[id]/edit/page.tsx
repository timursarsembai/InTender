'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>('');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  const showInfo = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message });
  };

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
    deadline: '',
    logistics: 'EITHER',
    vatOption: 'VAT_ANY',
  });

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      const order = await api.get<any>(`/orders/${params.id}`);
      setOrderStatus(order.status);
      setFormData({
        title: order.title || '',
        quantity: order.quantity?.toString() || '1',
        unit: order.unit || 'шт',
        specification: order.specification || '',
        deliveryAddress: order.deliveryAddress || '',
        deliveryRegion: order.deliveryRegion || '',
        deliveryDistrict: order.deliveryDistrict || '',
        deliveryCity: order.deliveryCity || '',
        deliveryLat: order.deliveryLat || null,
        deliveryLng: order.deliveryLng || null,
        deadline: order.deadline ? new Date(order.deadline).toISOString().split('T')[0] : '',
        logistics: order.logistics || 'EITHER',
        vatOption: order.vatOption || 'VAT_ANY',
      });
    } catch (err) {
      console.error(err);
      showInfo('Ошибка', 'Не удалось загрузить данные заказа');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    const isPublishing = submitter?.name === 'publish';

    setIsSaving(true);

    try {
      await api.patch(`/orders/${params.id}`, {
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
        await api.post(`/orders/${params.id}/publish`, {
          idempotencyKey: `publish-${Date.now()}`,
        });
      }

      router.push(`/dashboard/orders/${params.id}`);
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка обновления заказа');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Загрузка...</div>;

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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Редактирование заказа</h1>
          <Button variant="ghost" onClick={() => router.back()}>
            Отмена
          </Button>
        </div>

        {/* Manual Form */}
        <form
          id="edit-order-form"
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

          {orderStatus === 'DRAFT' ? (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button
                type="submit"
                name="draft"
                variant="outline"
                size="lg"
                isLoading={isSaving}
                style={{ flex: 1 }}
              >
                Сохранить черновик
              </Button>
              <Button
                type="submit"
                name="publish"
                variant="primary"
                size="lg"
                isLoading={isSaving}
                style={{ flex: 1 }}
              >
                Опубликовать заказ (50 ₸)
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              style={{ marginTop: '1rem' }}
            >
              Сохранить изменения
            </Button>
          )}
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

      {/* Info Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        footer={
          <Button
            variant="primary"
            onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
          >
            ОК
          </Button>
        }
      >
        <p>{modalState.message}</p>
      </Modal>
    </div>
  );
}
