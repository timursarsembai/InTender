'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/Button/Button';
import { Badge } from '@/components/ui/Badge/Badge';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Card } from '@/components/ui/Card/Card';
import {
  LocationAutocomplete,
  LocationData,
} from '@/components/ui/LocationAutocomplete/LocationAutocomplete';
import { Map } from '@/components/ui/Map';

// Parses "• Characteristic: Value" lines
function parseSpecTable(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const charLines = lines.filter((l) => l.startsWith('• '));
  if (charLines.length === 0) return null;

  const rows = charLines.map((l) => {
    const body = l.slice(2); // remove "• "
    const colonIdx = body.indexOf(':');
    if (colonIdx === -1) return { characteristic: body, requirement: '' };
    return { characteristic: body.slice(0, colonIdx).trim(), requirement: body.slice(colonIdx + 1).trim() };
  });

  const additionalLine = lines.find((l) => l.startsWith('Дополнительные требования:'));
  const additional = additionalLine ? additionalLine.replace('Дополнительные требования:', '').trim() : '';

  return { rows, additional };
}

function SpecificationView({ text }: { text: string }) {
  const parsed = useMemo(() => parseSpecTable(text), [text]);

  if (!parsed) {
    return (
      <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        {text}
      </div>
    );
  }

  const th: React.CSSProperties = { padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border-color)', textAlign: 'left', backgroundColor: 'var(--bg-secondary)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem', lineHeight: 1.5, verticalAlign: 'top' };

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 36 }}>№</th>
            <th style={{ ...th, width: '35%' }}>Характеристика</th>
            <th style={th}>Требование</th>
          </tr>
        </thead>
        <tbody>
          {parsed.rows.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
              <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}</td>
              <td style={{ ...td, fontWeight: 500 }}>{row.characteristic}</td>
              <td style={{ ...td, color: 'var(--text-secondary)' }}>{row.requirement}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {parsed.additional && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Доп. требования: </span>
          <span style={{ color: 'var(--text-secondary)' }}>{parsed.additional}</span>
        </div>
      )}
    </div>
  );
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [myOffer, setMyOffer] = useState<any>(null);
  const [contacts, setContacts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatRoomExists, setChatRoomExists] = useState(false);

  // Offer Form States
  const [isOfferLoading, setIsOfferLoading] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerComment, setOfferComment] = useState('');
  const [offerDepartureStr, setOfferDepartureStr] = useState('');
  const [offerDepartureData, setOfferDepartureData] = useState<LocationData | null>(null);
  const [isEditingOffer, setIsEditingOffer] = useState(false);

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
          console.log('Offers loaded:', offersData.map((o: any) => ({ id: o.id, supplierOrganizationId: o.supplierOrganizationId })));
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

          if (!offerForThisOrder) {
            // Fetch org location to pre-fill
            const org = await api.get<any>('/me/organization');
            if (org) {
              const parts = [org.city, org.district, org.region].filter(Boolean);
              if (parts.length > 0) {
                setOfferDepartureStr(parts.join(', '));
                setOfferDepartureData({
                  region: org.region || '',
                  district: org.district || '',
                  city: org.city || '',
                  lat: org.latitude || 0,
                  lng: org.longitude || 0,
                });
              }
            }
          } else if (offerForThisOrder.versions?.[0]) {
            // Pre-fill edit mode data
            const latest = offerForThisOrder.versions[0];
            setOfferPrice((latest.pricePerUnitMinor / 100).toString());
            setOfferComment(latest.comment || '');
            setOfferDepartureStr(
              [latest.departureCity, latest.departureDistrict, latest.departureRegion]
                .filter(Boolean)
                .join(', '),
            );
            setOfferDepartureData({
              region: latest.departureRegion || '',
              district: latest.departureDistrict || '',
              city: latest.departureCity || '',
              lat: latest.departureLat || 0,
              lng: latest.departureLng || 0,
            });
          }

          // Fetch chat rooms to check if buyer initiated chat
          try {
            const rooms = await api.get<any[]>('/chat/rooms');
            const hasRoom = rooms.some((r) => r.orderId === params.id);
            setChatRoomExists(hasRoom);
          } catch (e) {
            console.error('Failed to fetch chat rooms');
          }
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

  const handleDeleteOrder = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот заказ?')) return;
    setIsLoading(true);
    try {
      await api.delete(`/orders/${order.id}`);
      router.push('/dashboard/orders');
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка удаления заказа');
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

      if (isEditingOffer && myOffer?.id) {
        await api.patch(`/offers/${myOffer.id}`, {
          pricePerUnitMinor,
          goodsTotalMinor,
          deliveryCostMinor,
          grandTotalMinor,
          vatStatus: 'PRICE_EXCLUDES_VAT',
          deliveryDays: 3,
          departureRegion: offerDepartureData?.region,
          departureDistrict: offerDepartureData?.district,
          departureCity: offerDepartureData?.city,
          departureLat: offerDepartureData?.lat,
          departureLng: offerDepartureData?.lng,
          paymentTerms: order.paymentTerms || 'По договоренности',
          comment: offerComment,
        });
        showInfo('Успех', 'Отклик успешно обновлен!');
      } else {
        await api.post(`/orders/${order.id}/offers`, {
          pricePerUnitMinor,
          goodsTotalMinor,
          deliveryCostMinor,
          grandTotalMinor,
          vatStatus: 'PRICE_EXCLUDES_VAT',
          deliveryDays: 3,
          departureRegion: offerDepartureData?.region,
          departureDistrict: offerDepartureData?.district,
          departureCity: offerDepartureData?.city,
          departureLat: offerDepartureData?.lat,
          departureLng: offerDepartureData?.lng,
          paymentTerms: order.paymentTerms || 'По договоренности',
          comment: offerComment,
          confirmations: {
            isNew: true,
            conforms: true,
            hasCertificates: order.certificateRequired || false,
          },
          idempotencyKey: `offer-${Date.now()}`,
        });
        showInfo('Успех', 'Отклик успешно подан!');
      }

      setIsEditingOffer(false);
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
          idempotencyKey: `accept-${Date.now()}`,
        });
        showInfo('Успех', 'Оффер принят!');
        fetchData();
      } catch (err: any) {
        showInfo('Ошибка', err.message || 'Ошибка принятия оффера');
      }
    });
  };

  const handleStartChat = async (supplierOrgId: string) => {
    try {
      // Buyer uses their own org from auth context (reliable).
      // Supplier uses the buyer org from the order.
      const buyerOrganizationId = isBuyer
        ? user?.organizationId
        : order?.buyer?.id;

      if (!buyerOrganizationId) {
        showInfo('Ошибка', 'Не найдена организация покупателя. Убедитесь, что профиль организации заполнен.');
        return;
      }
      if (!supplierOrgId) {
        showInfo('Ошибка', 'Не найдена организация поставщика');
        return;
      }

      await api.post<any>('/chat/rooms/find-or-create', {
        orderId: order.id,
        buyerOrganizationId,
        supplierOrganizationId: supplierOrgId,
      });
      router.push('/dashboard/messages');
    } catch (err: any) {
      showInfo('Ошибка', `Не удалось открыть чат: ${err?.message || String(err)}`);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRatingLoading(true);
    try {
      await api.post('/ratings', {
        targetOrganizationId: counterpartyOrgId || '',
        orderId: order.id,
        score: parseInt(ratingVal, 10),
        comment: ratingComment,
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
  const counterpartyContacts = contacts
    ? isBuyer
      ? contacts.supplierContacts
      : contacts.buyerContacts
    : null;
  const counterpartyName = contacts
    ? isBuyer
      ? contacts.supplierLegalName
      : contacts.buyerLegalName
    : null;
  const counterpartyType = contacts
    ? isBuyer
      ? contacts.supplierLegalType
      : contacts.buyerLegalType
    : null;
  const counterpartyBin = contacts ? (isBuyer ? contacts.supplierBin : contacts.buyerBin) : null;
  const counterpartyOrgId = contacts
    ? isBuyer
      ? contacts.supplierOrgId
      : contacts.buyerOrgId
    : null;

  const typeMap: Record<string, string> = { TOO: 'ТОО', IP: 'ИП', OTHER: '' };
  const localizedType = counterpartyType ? typeMap[counterpartyType] : '';
  const formattedCounterpartyName = counterpartyName
    ? `${localizedType ? localizedType + ' ' : ''}"${counterpartyName}"`
    : 'Не указано';

  const logisticsMap: Record<string, string> = {
    EITHER: 'Любая',
    BUYER_PICKUP: 'Самовывоз',
    SUPPLIER_DELIVERY: 'Доставка',
  };

  const statusMap: Record<string, string> = {
    DRAFT: 'Черновик',
    PUBLISHED: 'Опубликован',
    CLOSED_ACCEPTED: 'Завершен',
    CLOSED_WITHOUT_SELECTION: 'Отменен (без выбора)',
    CANCELLED: 'Отменен',
    BLOCKED: 'Заблокирован',
    ARCHIVED: 'В архиве',
  };

  return (
    <div style={{ width: '100%' }}>
      <Button
        variant="ghost"
        onClick={() => router.back()}
        style={{ marginBottom: '1rem', paddingLeft: 0 }}
      >
        &larr; Назад
      </Button>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          alignItems: 'flex-start',
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {/* Left Column: Order Data */}
        <div style={{ flex: '1 1 calc(50% - 1rem)', minWidth: '300px' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-elevated)',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{order.title}</h1>
                  <Badge variant={order.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                    {statusMap[order.status] || order.status}
                  </Badge>
                </div>
                {order.updatedAt && order.createdAt &&
                  new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime() > 5000 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Изменён: {new Date(order.updatedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
              {isBuyer && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(order.status === 'DRAFT' || order.status === 'PUBLISHED') && (
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/dashboard/orders/${order.id}/edit`)}
                    >
                      Редактировать
                    </Button>
                  )}
                  {(order.status === 'DRAFT' || order.status === 'PUBLISHED') && (
                    <Button variant="danger" onClick={handleDeleteOrder}>
                      Удалить
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '2rem',
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Требуемый объем
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {order.quantity} {order.unit}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Дедлайн
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {new Date(order.deadline).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Логистика
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {logisticsMap[order.logistics] || order.logistics}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Адрес доставки
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {order.deliveryAddress || 'Не указан'}
                </div>
              </div>
            </div>

            {order.deliveryLat && order.deliveryLng && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Место доставки
                </h3>
                <Map
                  center={[order.deliveryLat, order.deliveryLng]}
                  zoom={13}
                  markerPosition={[order.deliveryLat, order.deliveryLng]}
                  readOnly
                />
              </div>
            )}

            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Спецификация
            </h3>
            <SpecificationView text={order.specification} />

            {/* Disclosed Contacts Section */}
            {contacts && (
              <div
                style={{
                  backgroundColor: 'var(--accent-light)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--accent-primary)',
                  marginTop: '2rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: 'var(--accent-hover)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Контакты Контрагента
                    </h3>
                    <p>
                      <strong>Название:</strong> {formattedCounterpartyName} (БИН:{' '}
                      {counterpartyBin || 'Не указан'})
                    </p>
                    <p>
                      <strong>Email:</strong> {counterpartyContacts?.email || 'Не указан'}
                    </p>
                    <p>
                      <strong>Рейтинг:</strong> ⭐{' '}
                      {contacts.averageRating ? contacts.averageRating.toFixed(1) : 'Нет отзывов'}
                    </p>
                  </div>
                  <Button onClick={() => setShowRatingModal(true)} variant="primary">
                    Оценить сделку
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive panels */}
        <div
          style={{
            flex: '1 1 calc(50% - 1rem)',
            minWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Form for Supplier to Submit/Edit Offer */}
          {user?.role === 'SUPPLIER' && order.status === 'PUBLISHED' && (
            <div
              style={{
                backgroundColor: 'var(--bg-elevated)',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
              }}
            >
              {myOffer && !isEditingOffer ? (
                <>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
                    Ваш отклик
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {myOffer.versions?.[0]
                          ? (myOffer.versions[0].pricePerUnitMinor / 100).toLocaleString('ru-RU')
                          : '0'}{' '}
                        ₸{' '}
                        <span
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 400,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          / {order.unit}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.5rem',
                        }}
                      >
                        Статус:{' '}
                        <Badge
                          variant={
                            myOffer.status === 'ACCEPTED'
                              ? 'success'
                              : myOffer.status === 'REJECTED'
                                ? 'danger'
                                : 'primary'
                          }
                        >
                          {myOffer.status === 'ACTIVE'
                            ? 'Активный'
                            : myOffer.status === 'ACCEPTED'
                              ? 'Принят'
                              : myOffer.status === 'REJECTED'
                                ? 'Отклонен'
                                : myOffer.status === 'WITHDRAWN'
                                  ? 'Отозван'
                                  : myOffer.status}
                        </Badge>
                      </div>
                    </div>
                    {myOffer.versions?.[0] && (
                      <div>
                        <div
                          style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}
                        >
                          Пункт отправки:
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {[
                            myOffer.versions[0].departureCity,
                            myOffer.versions[0].departureDistrict,
                            myOffer.versions[0].departureRegion,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                        {myOffer.versions[0].departureLat && myOffer.versions[0].departureLng && (
                          <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                            <Map
                              center={[
                                myOffer.versions[0].departureLat,
                                myOffer.versions[0].departureLng,
                              ]}
                              zoom={12}
                              markerPosition={[
                                myOffer.versions[0].departureLat,
                                myOffer.versions[0].departureLng,
                              ]}
                              readOnly
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {myOffer.versions?.[0]?.comment && (
                      <div>
                        <div
                          style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}
                        >
                          Сообщение:
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {myOffer.versions[0].comment}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      {myOffer.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          onClick={() => setIsEditingOffer(true)}
                          style={{ flex: 1 }}
                        >
                          Редактировать
                        </Button>
                      )}
                      {chatRoomExists && (
                        <Button
                          variant="secondary"
                          onClick={() => handleStartChat(myOffer.supplierOrganizationId)}
                          style={{ flex: 1 }}
                        >
                          💬 Чат
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {isEditingOffer ? 'Редактирование предложения' : 'Подача предложения'}
                  </h3>
                  {!isEditingOffer && (
                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      За доступ к участию будет списано 50 ₸.
                    </p>
                  )}
                  <form
                    onSubmit={handleSubmitOffer}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                  >
                    <LocationAutocomplete
                      label="Пункт отправки"
                      placeholder="Область, Город, Район"
                      value={offerDepartureStr}
                      onChange={(address, locationData) => {
                        setOfferDepartureStr(address);
                        setOfferDepartureData(locationData);
                      }}
                      required
                    />

                    {offerDepartureData && offerDepartureData.lat && offerDepartureData.lng && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <Map
                          center={[offerDepartureData.lat, offerDepartureData.lng]}
                          zoom={12}
                          markerPosition={[offerDepartureData.lat, offerDepartureData.lng]}
                          onMarkerChange={(pos) =>
                            setOfferDepartureData((prev) =>
                              prev ? { ...prev, lat: pos[0], lng: pos[1] } : null,
                            )
                          }
                        />
                      </div>
                    )}

                    <Input
                      label={`Цена за 1 ${order.unit} (в ₸)`}
                      type="number"
                      min="1"
                      required
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}
                      >
                        Сообщение (условия)
                      </label>
                      <textarea
                        rows={3}
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                        value={offerComment}
                        onChange={(e) => setOfferComment(e.target.value)}
                        placeholder="Детали предложения..."
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {isEditingOffer && (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setIsEditingOffer(false)}
                          style={{ flex: 1 }}
                        >
                          Отмена
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        type="submit"
                        isLoading={isOfferLoading}
                        style={{ flex: isEditingOffer ? 1 : '1 1 auto', width: '100%' }}
                      >
                        {isEditingOffer ? 'Сохранить' : 'Отправить (50 ₸)'}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Buyer Offers View */}
          {user?.role === 'BUYER' && order.status === 'PUBLISHED' && (
            <div
              style={{
                backgroundColor: 'var(--bg-elevated)',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                Отклики ({offers.length})
              </h2>
              {offers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Пока нет откликов</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {offers.map((offer) => (
                    <Card key={offer.id}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                              {offer.versions?.[0]
                                ? (offer.versions[0].pricePerUnitMinor / 100).toLocaleString(
                                    'ru-RU',
                                  )
                                : '0'}{' '}
                              ₸{' '}
                              <span
                                style={{
                                  fontSize: '0.875rem',
                                  fontWeight: 400,
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                / {order.unit}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                marginTop: '0.25rem',
                              }}
                            >
                              Откуда:{' '}
                              {offer.versions?.[0]?.departureCity
                                ? `${offer.versions[0].departureCity}${offer.versions[0].departureRegion ? ` (${offer.versions[0].departureRegion})` : ''}`
                                : 'Не указано'}
                            </div>
                          </div>
                        </div>
                        {offer.versions?.[0]?.comment && (
                          <div
                            style={{
                              fontSize: '0.875rem',
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--bg-secondary)',
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {offer.versions[0].comment}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            variant="secondary"
                            onClick={() => handleStartChat(offer.supplierOrganizationId)}
                            style={{ flex: 1 }}
                          >
                            💬 Чат
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => handleAcceptOffer(offer.id)}
                            style={{ flex: 1 }}
                          >
                            Принять
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Оценка контрагента"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRatingModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" form="rating-form" type="submit" isLoading={isRatingLoading}>
              Оставить отзыв
            </Button>
          </>
        }
      >
        <form
          id="rating-form"
          onSubmit={handleSubmitRating}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Оценка (1-5)
            </label>
            <select
              value={ratingVal}
              onChange={(e) => setRatingVal(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Комментарий"
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
          />
        </form>
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
