'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import {
  LocationAutocomplete,
  LocationData,
} from '@/components/ui/LocationAutocomplete/LocationAutocomplete';
import { Map } from '@/components/ui/Map';

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [price, setPrice] = useState('');
  const [comment, setComment] = useState('');
  const [departureStr, setDepartureStr] = useState('');
  const [departureData, setDepartureData] = useState<LocationData | null>(null);

  useEffect(() => {
    fetchData();
  }, [params.id, params.offerId]);

  const fetchData = async () => {
    try {
      const orderData = await api.get<any>(`/orders/${params.id}`);
      setOrder(orderData);

      const offerData = await api.get<any>(`/offers/${params.offerId}`);
      setOffer(offerData);

      if (offerData && offerData.versions && offerData.versions.length > 0) {
        const latestVersion = offerData.versions[0];
        setPrice((latestVersion.pricePerUnitMinor / 100).toString());
        setComment(latestVersion.comment || '');

        const parts = [
          latestVersion.departureCity,
          latestVersion.departureDistrict,
          latestVersion.departureRegion,
        ].filter(Boolean);
        setDepartureStr(parts.join(', '));

        setDepartureData({
          region: latestVersion.departureRegion || '',
          district: latestVersion.departureDistrict || '',
          city: latestVersion.departureCity || '',
          lat: latestVersion.departureLat || 0,
          lng: latestVersion.departureLng || 0,
        });
      }
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить данные отклика');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const pricePerUnitMinor = parseInt(price, 10) * 100;
      const goodsTotalMinor = pricePerUnitMinor * order.quantity;
      const deliveryCostMinor = 0;
      const grandTotalMinor = goodsTotalMinor + deliveryCostMinor;

      await api.patch(`/offers/${params.offerId}`, {
        pricePerUnitMinor,
        goodsTotalMinor,
        deliveryCostMinor,
        grandTotalMinor,
        vatStatus: 'PRICE_EXCLUDES_VAT',
        deliveryDays: 3,
        departureRegion: departureData?.region,
        departureDistrict: departureData?.district,
        departureCity: departureData?.city,
        departureLat: departureData?.lat,
        departureLng: departureData?.lng,
        paymentTerms: order.paymentTerms || 'По договоренности',
        comment,
      });

      router.push(`/dashboard/orders/${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления отклика');
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div>Загрузка...</div>;
  if (!order || !offer) return <div>Данные не найдены</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Button
        variant="ghost"
        onClick={() => router.back()}
        style={{ marginBottom: '1rem', paddingLeft: 0 }}
      >
        &larr; Назад
      </Button>

      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Редактирование предложения
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Вы редактируете свое предложение для заказа <strong>{order.title}</strong>.
        </p>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger-color)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <LocationAutocomplete
            label="Пункт отправки (Область, Город, Район)"
            placeholder="Если отличается от адреса компании..."
            value={departureStr}
            onChange={(address, locationData) => {
              setDepartureStr(address);
              setDepartureData(locationData);
            }}
            required
          />

          {departureData && departureData.lat && departureData.lng && (
            <div style={{ height: '300px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <Map
                center={[departureData.lat, departureData.lng]}
                zoom={13}
                markerPosition={[departureData.lat, departureData.lng]}
                onMarkerChange={(pos) =>
                  setDepartureData((prev) => (prev ? { ...prev, lat: pos[0], lng: pos[1] } : null))
                }
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label={`Цена за 1 ${order.unit} (в тенге)`}
              type="number"
              min="1"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              Сообщение / Дополнительные условия
            </label>
            <textarea
              rows={4}
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Напишите здесь детали вашего предложения, сроки доставки, условия оплаты..."
            />
          </div>

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}
          >
            <Button variant="ghost" type="button" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Сохранить изменения
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
