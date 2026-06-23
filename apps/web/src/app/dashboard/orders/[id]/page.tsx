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
  const [myOffer, setMyOffer] = useState<any>(null);
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

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalState({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

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

      // Fetch own offer if supplier
      if (user?.role === 'SUPPLIER') {
        try {
          const myOffersData = await api.get<any[]>('/me/offers');
          const offerForThisOrder = myOffersData.find((o: any) => o.orderId === params.id);
          setMyOffer(offerForThisOrder || null);
        } catch (e) {
          console.error('No own offers fetched');
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
      const pricePerUnitMinor = parseInt(offerPrice, 10) * 100;
      const goodsTotalMinor = pricePerUnitMinor * order.quantity;
      const deliveryCostMinor = 0;
      const grandTotalMinor = goodsTotalMinor + deliveryCostMinor;

      await api.post(`/orders/${order.id}/offers`, {
        pricePerUnitMinor,
        goodsTotalMinor,
        deliveryCostMinor,
        grandTotalMinor,
        vatStatus: 'PRICE_EXCLUDES_VAT',
        deliveryDays: 3,
        paymentTerms: order.paymentTerms || 'По договоренности',
        confirmations: {
          isNew: true,
          conforms: true,
          hasCertificates: order.certificateRequired || false
        },
        idempotencyKey: `offer-${Date.now()}`
      });
      
      showInfo('Успех', 'Отклик успешно подан!');
      setShowOfferModal(false);
      fetchData();
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка подачи отклика');
    } finally {
      setIsOfferLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    showConfirm('Подтверждение', 'Вы уверены, что хотите принять этот оффер?', async () => {
      try {
        await api.post(`/offers/${offerId}/accept`, {
          idempotencyKey: `accept-${Date.now()}`
        });
        showInfo('Успех', 'Оффер принят!');
        fetchData();
      } catch (err: any) {
        showInfo('Ошибка', err.message || 'Ошибка принятия оффера');
      }
    });
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRatingLoading(true);
    try {
      // Create rating
      await api.post('/ratings', {
        targetOrganizationId: counterpartyOrgId || '',
        orderId: order.id,
        score: parseInt(ratingVal, 10),
        comment: ratingComment
      });
      showInfo('Успех', 'Рейтинг успешно сохранен!');
      setShowRatingModal(false);
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка сохранения рейтинга');
    } finally {
      setIsRatingLoading(false);
    }
  };

  if (isLoading) return <p>Загрузка...</p>;
  if (!order) return <p>Заказ не найден</p>;

  const isBuyer = user?.role === 'BUYER';
  const counterpartyContacts = contacts ? (isBuyer ? contacts.supplierContacts : contacts.buyerContacts) : null;
  const counterpartyName = contacts ? (isBuyer ? contacts.supplierLegalName : contacts.buyerLegalName) : null;
  const counterpartyType = contacts ? (isBuyer ? contacts.supplierLegalType : contacts.buyerLegalType) : null;
  const counterpartyBin = contacts ? (isBuyer ? contacts.supplierBin : contacts.buyerBin) : null;
  const counterpartyOrgId = contacts ? (isBuyer ? contacts.supplierOrgId : contacts.buyerOrgId) : null;
  
  const typeMap: Record<string, string> = { TOO: 'ТОО', IP: 'ИП', OTHER: '' };
  const localizedType = counterpartyType ? typeMap[counterpartyType] : '';
  const formattedCounterpartyName = counterpartyName ? `${localizedType ? localizedType + ' ' : ''}"${counterpartyName}"` : 'Не указано';

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

        {user?.role === 'SUPPLIER' && order.status === 'PUBLISHED' && !myOffer && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="lg" variant="primary" onClick={() => setShowOfferModal(true)}>
              Подать отклик (50 ₸)
            </Button>
          </div>
        )}

        {user?.role === 'SUPPLIER' && myOffer && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Ваш отклик</h3>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {myOffer.versions?.[0] ? (myOffer.versions[0].pricePerUnitMinor / 100).toLocaleString('ru-RU') : '0'} ₸ / {order.unit}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Статус: <Badge variant={myOffer.status === 'ACCEPTED' ? 'success' : myOffer.status === 'REJECTED' ? 'danger' : 'primary'}>{myOffer.status}</Badge>
                  </div>
                </div>
              </div>
            </Card>
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
              <p><strong>Название:</strong> {formattedCounterpartyName} (БИН: {counterpartyBin || 'Не указан'})</p>
              <p><strong>Email:</strong> {counterpartyContacts?.email || 'Не указан'}</p>
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
                      <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{offer.versions?.[0] ? (offer.versions[0].pricePerUnitMinor / 100).toLocaleString('ru-RU') : '0'} ₸ / {order.unit}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Срок поставки: {offer.versions?.[0]?.deliveryDays ?? '-'} дн.</div>
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
