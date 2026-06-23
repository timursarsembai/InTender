'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/Button/Button';
import { Badge } from '@/components/ui/Badge/Badge';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Card } from '@/components/ui/Card/Card';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isOfferLoading, setIsOfferLoading] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingVal, setRatingVal] = useState('5');
  const [ratingComment, setRatingComment] = useState('');
  const [isRatingLoading, setIsRatingLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const orderData = await api.get<any>(`/orders/${params.id}`);
      setOrder(orderData);

      // Fetch offers if buyer
      if (user?.role === 'BUYER') {
        try {
          const offersData = await api.get<any[]>(`/orders/${params.id}/offers`);
          setOffers(offersData);
        } catch (e) {
          console.error('No offers fetched');
        }
      }

      // Fetch contacts if CLOSED_ACCEPTED
      if (orderData.status === 'CLOSED_ACCEPTED') {
        try {
          const contactsData = await api.get<any>(`/orders/${params.id}/disclosed-contacts`);
          setContacts(contactsData);
        } catch (e) {
          console.error('No contacts available');
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOfferLoading(true);

    try {
      await api.post(`/orders/${order.id}/offers`, {
        pricePerUnitMinor: parseInt(offerPrice, 10) * 100,
        deliveryCostMinor: 0,
        vatStatus: 'PRICE_EXCLUDES_VAT',
        deliveryDays: 3,
        idempotencyKey: `offer-${Date.now()}`
      });
      
      alert('Отклик успешно подан!');
      setShowOfferModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Ошибка подачи отклика');
    } finally {
      setIsOfferLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!confirm('Вы уверены, что хотите принять этот оффер?')) return;
    try {
      await api.post(`/offers/${offerId}/accept`, {
        idempotencyKey: `accept-${Date.now()}`
      });
      alert('Оффер принят!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Ошибка принятия оффера');
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRatingLoading(true);
    try {
      // Create rating
      await api.post('/ratings', {
        targetOrganizationId: contacts?.organizationId || '',
        orderId: order.id,
        score: parseInt(ratingVal, 10),
        comment: ratingComment
      });
      alert('Рейтинг успешно сохранен!');
      setShowRatingModal(false);
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения рейтинга');
    } finally {
      setIsRatingLoading(false);
    }
  };

  if (isLoading) return <p>Загрузка...</p>;
  if (!order) return <p>Заказ не найден</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Button variant="ghost" onClick={() => router.back()} style={{ marginBottom: '1rem', paddingLeft: 0 }}>
        &larr; Назад
      </Button>
      
      <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{order.title}</h1>
          <Badge variant={order.status === 'PUBLISHED' ? 'success' : 'neutral'}>{order.status}</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Требуемый объем</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{order.quantity} {order.unit}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Дедлайн</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{new Date(order.deadline).toLocaleDateString('ru-RU')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Логистика</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{order.logistics}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Адрес доставки</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{order.deliveryAddress}</div>
          </div>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Спецификация</h3>
        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          {order.specification}
        </div>

        {user?.role === 'SUPPLIER' && order.status === 'PUBLISHED' && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="lg" variant="primary" onClick={() => setShowOfferModal(true)}>
              Подать отклик (50 ₸)
            </Button>
          </div>
        )}
      </div>

      {/* Disclosed Contacts Section */}
      {contacts && (
        <div style={{ backgroundColor: 'var(--accent-light)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent-primary)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-hover)', marginBottom: '1rem' }}>
                Контакты Контрагента
              </h3>
              <p><strong>Email:</strong> {contacts.email}</p>
              <p><strong>Организация ID:</strong> {contacts.organizationId}</p>
              <p><strong>Рейтинг:</strong> ⭐ {contacts.averageRating ? contacts.averageRating.toFixed(1) : 'Нет отзывов'}</p>
            </div>
            <Button onClick={() => setShowRatingModal(true)} variant="primary">
              Оценить сделку
            </Button>
          </div>
        </div>
      )}

      {/* Buyer Offers View */}
      {user?.role === 'BUYER' && order.status === 'PUBLISHED' && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Отклики поставщиков</h2>
          {offers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Пока нет откликов</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {offers.map(offer => (
                <Card key={offer.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{(offer.pricePerUnitMinor / 100).toLocaleString('ru-RU')} ₸ / {order.unit}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Срок поставки: {offer.deliveryDays} дн.</div>
                    </div>
                    <Button variant="primary" onClick={() => handleAcceptOffer(offer.id)}>
                      Принять
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offer Modal */}
      <Modal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        title="Подача коммерческого предложения"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowOfferModal(false)}>Отмена</Button>
            <Button variant="primary" form="offer-form" type="submit" isLoading={isOfferLoading}>Отправить отклик (50 ₸)</Button>
          </>
        }
      >
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          Вы подаете предложение на <strong>{order.title}</strong>. За доступ к участию будет списано 50 ₸.
        </p>
        <form id="offer-form" onSubmit={handleSubmitOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            label={`Цена за 1 ${order.unit} (в тенге)`}
            type="number"
            min="1"
            required
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
          />
        </form>
      </Modal>

      {/* Rating Modal */}
      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Оценка контрагента"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRatingModal(false)}>Отмена</Button>
            <Button variant="primary" form="rating-form" type="submit" isLoading={isRatingLoading}>Оставить отзыв</Button>
          </>
        }
      >
        <form id="rating-form" onSubmit={handleSubmitRating} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Оценка (1-5)
            </label>
            <select 
              value={ratingVal} 
              onChange={e => setRatingVal(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <Input 
            label="Комментарий"
            value={ratingComment}
            onChange={e => setRatingComment(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
