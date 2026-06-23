'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/Card/Card';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';

export default function OrdersFeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const endpoint = user?.role === 'BUYER' ? '/me/orders' : '/orders';
        const data = await api.get<any[]>(endpoint);
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const formatMoney = (minor?: number) => {
    if (!minor) return 'Договорная';
    return (minor / 100).toLocaleString('ru-RU') + ' ₸';
  };

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'Черновик',
      PUBLISHED: 'Актуально',
      CLOSED_ACCEPTED: 'Завершен (Принят)',
      CLOSED_WITHOUT_SELECTION: 'Закрыт без выбора',
      CANCELLED: 'Отменен',
    };
    return map[status] || status;
  };

  const filteredOrders = user?.role === 'BUYER' ? orders.filter(order => {
    if (activeTab === 'ACTIVE') return ['DRAFT', 'PUBLISHED'].includes(order.status);
    if (activeTab === 'COMPLETED') return ['CLOSED_ACCEPTED', 'CLOSED_WITHOUT_SELECTION'].includes(order.status);
    if (activeTab === 'CANCELLED') return order.status === 'CANCELLED';
    return true;
  }) : orders;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>
          {user?.role === 'BUYER' ? 'Мои заказы' : 'Лента заказов'}
        </h1>
        {user?.role === 'BUYER' && (
          <Link href="/dashboard/orders/new">
            <Button variant="primary">Создать заказ</Button>
          </Link>
        )}
      </div>

      {user?.role === 'BUYER' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('ACTIVE')}
            style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'ACTIVE' ? '2px solid var(--accent-primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', color: activeTab === 'ACTIVE' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'ACTIVE' ? 600 : 400 }}
          >
            Активные
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'COMPLETED' ? '2px solid var(--accent-primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', color: activeTab === 'COMPLETED' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'COMPLETED' ? 600 : 400 }}
          >
            Завершенные
          </button>
          <button
            onClick={() => setActiveTab('CANCELLED')}
            style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'CANCELLED' ? '2px solid var(--accent-primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', color: activeTab === 'CANCELLED' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'CANCELLED' ? 600 : 400 }}
          >
            Отмененные
          </button>
        </div>
      )}

      {isLoading ? (
        <p>Загрузка...</p>
      ) : filteredOrders.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Заказов пока нет.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOrders.map((order) => (
            <Card key={order.id} onClick={() => router.push(`/dashboard/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>
                    {order.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Объем: {order.quantity} {order.unit}
                  </p>
                </div>
                <Badge variant={order.status === 'PUBLISHED' ? 'success' : order.status === 'DRAFT' ? 'warning' : 'neutral'}>
                  {translateStatus(order.status)}
                </Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div>
                  <strong>Логистика: </strong> 
                  {order.logistics === 'BUYER_PICKUP' ? 'Самовывоз' : order.logistics === 'SUPPLIER_DELIVERY' ? 'Доставка поставщика' : 'Любая'}
                </div>
                <div>
                  <strong>Желаемая цена: </strong> {formatMoney(order.desiredPriceMinor)}
                </div>
                <div>
                  <strong>Дедлайн: </strong> {new Date(order.deadline).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
