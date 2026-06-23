'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/Card/Card';
import { Badge } from '@/components/ui/Badge/Badge';

export default function MyOffersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const data = await api.get<any[]>('/me/offers');
        setOffers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.role === 'SUPPLIER') {
      fetchOffers();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'Активен',
      WITHDRAWN: 'Отозван',
      ACCEPTED: 'Принят',
      REJECTED: 'Отклонен',
    };
    return map[status] || status;
  };

  if (user?.role !== 'SUPPLIER') {
    return <p>У вас нет доступа к этой странице.</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Мои отклики</h1>
      </div>

      {isLoading ? (
        <p>Загрузка...</p>
      ) : offers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Вы еще не подавали отклики.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {offers.map((offer) => (
            <Card key={offer.id} onClick={() => router.push(`/dashboard/orders/${offer.orderId}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>
                    Заказ: {offer.order?.title || 'Без названия'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Ваша цена: {offer.versions?.[0] ? (offer.versions[0].pricePerUnitMinor / 100).toLocaleString('ru-RU') + ' ₸ / шт' : 'Не указана'}
                  </p>
                </div>
                <Badge variant={offer.status === 'ACCEPTED' ? 'success' : offer.status === 'REJECTED' ? 'danger' : 'primary'}>
                  {translateStatus(offer.status)}
                </Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div>
                  <strong>Статус заказа: </strong> {offer.order?.status === 'CLOSED_ACCEPTED' ? 'Завершен' : 'Актуально'}
                </div>
                <div>
                  <strong>Общая сумма: </strong> {offer.versions?.[0] ? (offer.versions[0].grandTotalMinor / 100).toLocaleString('ru-RU') + ' ₸' : '-'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
