'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete/LocationAutocomplete';
import { Map } from '@/components/ui/Map';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CharRow {
  id: string;
  characteristic: string;
  requirement: string;
}

type SpecMode = 'table' | 'text';

function newRow(): CharRow {
  return { id: crypto.randomUUID(), characteristic: '', requirement: '' };
}

function tableToText(rows: CharRow[], additional: string): string {
  const lines = rows
    .filter((r) => r.characteristic || r.requirement)
    .map((r) => `• ${r.characteristic}: ${r.requirement}`);
  const parts = [lines.join('\n')];
  if (additional.trim()) parts.push(`Дополнительные требования: ${additional.trim()}`);
  return parts.join('\n\n');
}

function textToRows(text: string): { rows: CharRow[]; additional: string } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const charLines = lines.filter((l) => l.startsWith('• '));
  const additionalLine = lines.find((l) => l.startsWith('Дополнительные требования:'));

  if (charLines.length === 0) return { rows: [], additional: '' };

  const rows: CharRow[] = charLines.map((l) => {
    const body = l.slice(2);
    const colonIdx = body.indexOf(':');
    if (colonIdx === -1) return { id: crypto.randomUUID(), characteristic: body, requirement: '' };
    return {
      id: crypto.randomUUID(),
      characteristic: body.slice(0, colonIdx).trim(),
      requirement: body.slice(colonIdx + 1).trim(),
    };
  });

  return {
    rows,
    additional: additionalLine ? additionalLine.replace('Дополнительные требования:', '').trim() : '',
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── CharacteristicsTable ────────────────────────────────────────────────────

function CharacteristicsTable({ rows, onChange }: { rows: CharRow[]; onChange: (rows: CharRow[]) => void }) {
  const update = (id: string, field: keyof CharRow, value: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const moveUp = (i: number) => { if (i === 0) return; const n = [...rows]; [n[i-1],n[i]]=[n[i],n[i-1]]; onChange(n); };
  const moveDown = (i: number) => { if (i===rows.length-1) return; const n=[...rows]; [n[i],n[i+1]]=[n[i+1],n[i]]; onChange(n); };

  const cell: React.CSSProperties = { padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' };
  const inp: React.CSSProperties = { width: '100%', padding: '0.35rem 0.5rem', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontFamily: 'inherit', backgroundColor: 'transparent' };
  const th: React.CSSProperties = { padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border-color)', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: 'var(--bg-secondary)' };
  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor='var(--accent-primary)'; e.target.style.backgroundColor='var(--bg-elevated)'; };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor='transparent'; e.target.style.backgroundColor='transparent'; };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 32 }}>№</th>
            <th style={{ ...th, width: '30%' }}>Характеристика</th>
            <th style={th}>Требование / Значение</th>
            <th style={{ ...th, width: 72 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} style={{ backgroundColor: i%2===0 ? 'transparent' : 'var(--bg-secondary)' }}>
              <td style={{ ...cell, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i+1}</td>
              <td style={cell}>
                <input style={inp} value={row.characteristic} placeholder="Процессор"
                  onChange={(e) => update(row.id,'characteristic',e.target.value)} onFocus={focus} onBlur={blur} />
              </td>
              <td style={cell}>
                <input style={inp} value={row.requirement} placeholder="Intel Core i7, не менее 8 поколения"
                  onChange={(e) => update(row.id,'requirement',e.target.value)} onFocus={focus} onBlur={blur} />
              </td>
              <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <button type="button" disabled={i===0} onClick={() => moveUp(i)}
                    style={{ background:'none',border:'none',cursor:i===0?'default':'pointer',opacity:i===0?0.3:1,padding:'2px 4px',fontSize:'0.7rem' }}>▲</button>
                  <button type="button" disabled={i===rows.length-1} onClick={() => moveDown(i)}
                    style={{ background:'none',border:'none',cursor:i===rows.length-1?'default':'pointer',opacity:i===rows.length-1?0.3:1,padding:'2px 4px',fontSize:'0.7rem' }}>▼</button>
                  <button type="button" onClick={() => remove(row.id)}
                    style={{ background:'none',border:'none',cursor:'pointer',padding:'2px 4px',fontSize:'0.875rem',color:'#dc2626' }}>✕</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => onChange([...rows, newRow()])}
        style={{ width:'100%',marginTop:'0.5rem',padding:'0.45rem',border:'1px dashed var(--border-color)',borderRadius:'var(--radius-md)',background:'none',cursor:'pointer',fontSize:'0.8125rem',color:'var(--text-secondary)' }}>
        + Добавить характеристику
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [orderStatus, setOrderStatus] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [lastEditedAt, setLastEditedAt] = useState('');
  const [savedAt, setSavedAt] = useState(''); // shown after save

  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string }>
    ({ isOpen: false, title: '', message: '' });
  const showInfo = (title: string, message: string) => setModalState({ isOpen: true, title, message });

  const [specMode, setSpecMode] = useState<SpecMode>('text');
  const [charRows, setCharRows] = useState<CharRow[]>([newRow()]);
  const [additionalRequirements, setAdditionalRequirements] = useState('');

  const [formData, setFormData] = useState({
    title: '', quantity: '1', unit: 'шт', specification: '',
    deliveryAddress: '', deliveryRegion: '', deliveryDistrict: '', deliveryCity: '',
    deliveryLat: null as number | null, deliveryLng: null as number | null,
    deadline: '', logistics: 'EITHER', vatOption: 'VAT_ANY',
  });

  useEffect(() => { loadOrder(); }, [params.id]);

  const loadOrder = async () => {
    try {
      const order = await api.get<any>(`/orders/${params.id}`);
      setOrderStatus(order.status);
      setCreatedAt(order.createdAt || '');

      // Show lastEditedAt only if order was actually edited (updatedAt > createdAt by >5s)
      if (order.updatedAt && order.createdAt) {
        const diff = new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime();
        if (diff > 5000) setLastEditedAt(order.updatedAt);
      }

      const spec = order.specification || '';
      const parsed = textToRows(spec);
      if (parsed.rows.length > 0) {
        setCharRows(parsed.rows);
        setAdditionalRequirements(parsed.additional);
        setSpecMode('table');
      }

      setFormData({
        title: order.title || '',
        quantity: order.quantity?.toString() || '1',
        unit: order.unit || 'шт',
        specification: spec,
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
    } catch {
      showInfo('Ошибка', 'Не удалось загрузить заказ');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        const region = addr.state || addr.region || '';
        const district = addr.county || addr.district || '';
        const city = addr.city || addr.town || addr.village || addr.settlement || addr.municipality || '';
        setFormData((prev) => ({
          ...prev,
          deliveryAddress: [city, district, region].filter(Boolean).join(', ') || data.display_name,
          deliveryRegion: region, deliveryDistrict: district, deliveryCity: city,
          deliveryLat: lat, deliveryLng: lng,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    const isPublishing = submitter?.name === 'publish';

    const specification = specMode === 'table'
      ? tableToText(charRows, additionalRequirements)
      : formData.specification;

    if (!specification.trim()) { showInfo('Ошибка', 'Заполните спецификацию'); return; }

    setIsSaving(true);
    try {
      const updated = await api.patch<any>(`/orders/${params.id}`, {
        title: formData.title,
        quantity: parseInt(formData.quantity, 10) || 1,
        unit: formData.unit,
        specification,
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
        await api.post(`/orders/${params.id}/publish`, { idempotencyKey: `publish-${Date.now()}` });
      }

      const now = updated?.updatedAt || new Date().toISOString();
      setLastEditedAt(now);
      setSavedAt(now);

      // Brief "saved" indicator, then redirect
      setTimeout(() => router.push(`/dashboard/orders/${params.id}`), 1500);
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Загрузка...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', height: 'calc(100vh - 4rem)' }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '2rem', overflowY: 'auto', minHeight: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Редактирование заказа</h1>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {createdAt && <span>Создан: {formatDateTime(createdAt)}</span>}
              {lastEditedAt && <span>Последнее изменение: {formatDateTime(lastEditedAt)}</span>}
            </div>
          </div>
          <Button variant="ghost" onClick={() => router.back()}>Отмена</Button>
        </div>

        {/* Saved notification */}
        {savedAt && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem',
            backgroundColor: '#dcfce7', color: '#166534', fontSize: '0.875rem', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            ✓ Изменения сохранены: {formatDateTime(savedAt)}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-elevated)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <Input label="Название товара / тендера" required value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Например: Ноутбук мультимедийный" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Количество" type="number" required min="1" value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
            <Input label="Единица измерения" required value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="шт, кг, литр" />
          </div>

          {/* Spec Mode Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Технические требования</label>
              <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', fontSize: '0.8125rem' }}>
                {(['table', 'text'] as SpecMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => setSpecMode(mode)}
                    style={{ padding: '0.3rem 0.75rem', border: 'none', cursor: 'pointer', fontWeight: specMode===mode?600:400, backgroundColor: specMode===mode?'var(--accent-primary)':'transparent', color: specMode===mode?'#fff':'var(--text-secondary)', transition: 'all 0.15s' }}>
                    {mode === 'table' ? '⊞ Таблица' : '≡ Текст'}
                  </button>
                ))}
              </div>
            </div>

            {specMode === 'table' ? (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-elevated)' }}>
                <CharacteristicsTable rows={charRows} onChange={setCharRows} />
              </div>
            ) : (
              <textarea rows={8}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder="Опишите технические требования к товару..." />
            )}
          </div>

          {specMode === 'table' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Дополнительные требования к поставке</label>
              <textarea rows={3}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Комплектующие, упаковка, доп. требования..." />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <Input label="Дедлайн" type="date" required value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
            <Select label="Логистика" value={formData.logistics}
              onChange={(e) => setFormData({ ...formData, logistics: e.target.value })}
              options={[{ label: 'Любая', value: 'EITHER' }, { label: 'Самовывоз', value: 'BUYER_PICKUP' }, { label: 'Доставка', value: 'SUPPLIER_DELIVERY' }]} />
            <Select label="НДС" value={formData.vatOption}
              onChange={(e) => setFormData({ ...formData, vatOption: e.target.value })}
              options={[{ label: 'Не важно', value: 'VAT_ANY' }, { label: 'С НДС', value: 'VAT_REQUIRED' }, { label: 'Без НДС', value: 'VAT_NOT_REQUIRED' }]} />
          </div>

          {orderStatus === 'DRAFT' ? (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <Button type="submit" name="draft" variant="outline" size="lg" isLoading={isSaving} style={{ flex: 1 }}>
                Сохранить черновик
              </Button>
              <Button type="submit" name="publish" variant="primary" size="lg" isLoading={isSaving} style={{ flex: 1 }}>
                Опубликовать (50 ₸)
              </Button>
            </div>
          ) : (
            <Button type="submit" variant="primary" size="lg" isLoading={isSaving} style={{ marginTop: '0.5rem' }}>
              Сохранить изменения
            </Button>
          )}
        </form>
      </div>

      {/* Right Column: Map */}
      <div style={{ position: 'relative', margin: '-2rem -2rem -2rem 0', minHeight: 0 }}>
        <div style={{ height: '100%', width: '100%' }}>
          <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', right: '1.5rem', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
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
            center={formData.deliveryLat && formData.deliveryLng ? [formData.deliveryLat, formData.deliveryLng] : [48.0196, 66.9237]}
            zoom={formData.deliveryLat ? 13 : 5}
            markerPosition={formData.deliveryLat && formData.deliveryLng ? [formData.deliveryLat, formData.deliveryLng] : null}
            onMarkerChange={(pos) => {
              setFormData((prev) => ({ ...prev, deliveryLat: pos[0], deliveryLng: pos[1] }));
              fetchAddressFromCoords(pos[0], pos[1]);
            }}
            style={{ height: '100%', borderRadius: 0, border: 'none' }}
          />
        </div>
      </div>

      <Modal isOpen={modalState.isOpen} onClose={() => setModalState((p) => ({ ...p, isOpen: false }))} title={modalState.title}
        footer={<Button variant="primary" onClick={() => setModalState((p) => ({ ...p, isOpen: false }))}>ОК</Button>}>
        <p>{modalState.message}</p>
      </Modal>
    </div>
  );
}
