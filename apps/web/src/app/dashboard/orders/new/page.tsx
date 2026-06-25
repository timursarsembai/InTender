'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

// Converts table data to storage text format
function tableToText(rows: CharRow[], additionalRequirements: string): string {
  const lines = rows
    .filter((r) => r.characteristic || r.requirement)
    .map((r) => `• ${r.characteristic}: ${r.requirement}`);
  const parts = [lines.join('\n')];
  if (additionalRequirements.trim()) {
    parts.push(`Дополнительные требования: ${additionalRequirements.trim()}`);
  }
  return parts.join('\n\n');
}

// ─── CharacteristicsTable ────────────────────────────────────────────────────

function CharacteristicsTable({
  rows,
  onChange,
}: {
  rows: CharRow[];
  onChange: (rows: CharRow[]) => void;
}) {
  const update = (id: string, field: keyof CharRow, value: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...rows];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };

  const moveDown = (i: number) => {
    if (i === rows.length - 1) return;
    const next = [...rows];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  const cell: React.CSSProperties = {
    padding: '0.375rem 0.5rem',
    borderBottom: '1px solid var(--border-color)',
    verticalAlign: 'middle',
  };

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '0.35rem 0.5rem',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
  };

  const th: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid var(--border-color)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--bg-secondary)',
  };

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--accent-primary)';
    e.target.style.backgroundColor = 'var(--bg-elevated)';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'transparent';
    e.target.style.backgroundColor = 'transparent';
  };

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
            <tr key={row.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
              <td style={{ ...cell, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {i + 1}
              </td>
              <td style={cell}>
                <input
                  style={inp}
                  value={row.characteristic}
                  placeholder="Процессор"
                  onChange={(e) => update(row.id, 'characteristic', e.target.value)}
                  onFocus={focus}
                  onBlur={blur}
                />
              </td>
              <td style={cell}>
                <input
                  style={inp}
                  value={row.requirement}
                  placeholder="Intel Core i7, не менее 8 поколения"
                  onChange={(e) => update(row.id, 'requirement', e.target.value)}
                  onFocus={focus}
                  onBlur={blur}
                />
              </td>
              <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <button type="button" title="Вверх" disabled={i === 0} onClick={() => moveUp(i)}
                    style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, padding: '2px 4px', fontSize: '0.7rem' }}>▲</button>
                  <button type="button" title="Вниз" disabled={i === rows.length - 1} onClick={() => moveDown(i)}
                    style={{ background: 'none', border: 'none', cursor: i === rows.length - 1 ? 'default' : 'pointer', opacity: i === rows.length - 1 ? 0.3 : 1, padding: '2px 4px', fontSize: '0.7rem' }}>▼</button>
                  <button type="button" title="Удалить" onClick={() => remove(row.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.875rem', color: '#dc2626' }}>✕</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => onChange([...rows, newRow()])}
        style={{
          width: '100%', marginTop: '0.5rem', padding: '0.45rem',
          border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
          background: 'none', cursor: 'pointer', fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
        }}
      >
        + Добавить характеристику
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewOrderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean; title: string; message: string; type: 'info' | 'confirm'; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info' });

  const showInfo = (title: string, message: string) =>
    setModalState({ isOpen: true, title, message, type: 'info' });

  const [specMode, setSpecMode] = useState<SpecMode>('text');
  const [charRows, setCharRows] = useState<CharRow[]>([newRow()]);
  const [additionalRequirements, setAdditionalRequirements] = useState('');

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
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

          const result = job.resultJson;
          if (result) {
            setFormData((prev) => ({
              ...prev,
              title: prev.title || result.productName || '',
              quantity: String(result.quantity ?? 1),
              unit: result.unit || 'шт',
            }));

            if (result.characteristics?.length > 0) {
              const rows: CharRow[] = result.characteristics.map((c: any) => ({
                id: crypto.randomUUID(),
                characteristic: c.characteristic || '',
                requirement: c.requirement || '',
              }));
              setCharRows(rows);
              setSpecMode('table');
            }

            if (result.additionalRequirements) {
              setAdditionalRequirements(result.additionalRequirements);
            }

            if (result.deliveryCity) {
              geocodeCity(result.deliveryCity);
            }

            showInfo('Успех', `Распознано: ${result.productName}, ${result.quantity} ${result.unit}, ${result.characteristics?.length ?? 0} характеристик`);
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

  const geocodeCity = useCallback(async (cityName: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName + ', Казахстан')}&limit=1&addressdetails=1`,
      );
      const data = await res.json();
      if (data?.[0]) {
        const { lat, lon, address } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);
        const region = address.state || address.region || '';
        const district = address.county || address.district || '';
        const city = address.city || address.town || address.village || address.municipality || cityName;
        setFormData((prev) => ({
          ...prev,
          deliveryAddress: city,
          deliveryRegion: region,
          deliveryDistrict: district,
          deliveryCity: city,
          deliveryLat: latNum,
          deliveryLng: lngNum,
        }));
      }
    } catch { /* ignore */ }
  }, []);

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

  const startAiParsing = async () => {
    if (!selectedFile) return;
    setShowAiConfirmModal(false);
    setIsAiLoading(true);
    try {
      const intentRes = await api.post<any>('/files/upload-intent', {
        originalName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size,
      });
      await fetch(intentRes.uploadUrl, { method: 'PUT', body: selectedFile, headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' } });
      await api.post<any>(`/files/${intentRes.fileId}/complete`);
      const parseRes = await api.post<any>('/ai/jobs', { fileId: intentRes.fileId, idempotencyKey: `ai-${Date.now()}` });
      setAiJobId(parseRes.id);
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка запуска ИИ');
      setIsAiLoading(false);
    }
  };

  const getSpecificationText = () => {
    if (specMode === 'table') return tableToText(charRows, additionalRequirements);
    return formData.specification;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    const isPublishing = submitter?.name === 'publish';

    const specification = getSpecificationText();
    if (!specification.trim()) { showInfo('Ошибка', 'Заполните спецификацию'); return; }

    setIsLoading(true);
    try {
      const draft = await api.post<any>('/orders', {
        title: formData.title,
        quantity: parseInt(formData.quantity, 10) || 1,
        unit: formData.unit || 'шт',
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
        await api.post(`/orders/${draft.id}/publish`, { idempotencyKey: `publish-${Date.now()}` });
      }
      router.push('/dashboard/orders');
    } catch (err: any) {
      showInfo('Ошибка', err.message || 'Ошибка сохранения заказа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', height: 'calc(100vh - 4rem)' }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '2rem', overflowY: 'auto', minHeight: 0 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>Создать новый заказ</h1>

        {/* AI Block */}
        <div style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Умное предзаполнение (AI)</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Загрузите файл спецификации (PDF, Word, Excel). ИИ извлечёт товар, количество и характеристики. Стоимость: <strong>1 000 ₸</strong>.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              style={{ border: '2px dashed var(--accent-primary)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1.5rem', cursor: 'pointer', backgroundColor: 'var(--bg-elevated)', fontWeight: 500 }}
              onClick={() => fileInputRef.current?.click()}
            >
              Выбрать файл
            </div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {selectedFile ? selectedFile.name : 'Файл не выбран'}
            </span>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
            {selectedFile && (
              <Button variant="primary" isLoading={isAiLoading} onClick={() => setShowAiConfirmModal(true)}>
                {isAiLoading ? 'Распознаем...' : 'Запустить ИИ (1 000 ₸)'}
              </Button>
            )}
          </div>
        </div>

        {/* Form */}
        <form id="new-order-form" onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-elevated)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Input label="Название товара / тендера" required value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Например: Ноутбук мультимедийный" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Количество" type="number" required min="1" value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
            <Input label="Единица измерения" required value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="шт, кг, литр" />
          </div>

          {/* Spec Mode Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Технические требования</label>
              <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', fontSize: '0.8125rem' }}>
                {(['table', 'text'] as SpecMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => setSpecMode(mode)}
                    style={{ padding: '0.3rem 0.75rem', border: 'none', cursor: 'pointer', fontWeight: specMode === mode ? 600 : 400, backgroundColor: specMode === mode ? 'var(--accent-primary)' : 'transparent', color: specMode === mode ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
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
              <textarea rows={7}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder="Опишите технические требования к товару..." />
            )}
          </div>

          {/* Additional requirements — visible in table mode */}
          {specMode === 'table' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Дополнительные требования к поставке</label>
              <textarea rows={3}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Комплектующие, условия упаковки, доп. требования к поставке..." />
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

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button type="submit" name="draft" variant="outline" size="lg" isLoading={isLoading} style={{ flex: 1 }}>Сохранить черновик</Button>
            <Button type="submit" name="publish" variant="primary" size="lg" isLoading={isLoading} style={{ flex: 1 }}>Опубликовать (50 ₸)</Button>
          </div>
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

      {/* AI Confirm Modal */}
      <Modal isOpen={showAiConfirmModal} onClose={() => setShowAiConfirmModal(false)} title="Подтверждение списания"
        footer={<><Button variant="ghost" onClick={() => setShowAiConfirmModal(false)}>Отмена</Button><Button variant="primary" onClick={startAiParsing}>Подтвердить (1 000 ₸)</Button></>}>
        <p>С баланса будет списано <strong>1 000 ₸</strong>. При ошибке средства будут возвращены.</p>
      </Modal>

      {/* Info Modal */}
      <Modal isOpen={modalState.isOpen} onClose={() => setModalState((p) => ({ ...p, isOpen: false }))} title={modalState.title}
        footer={<Button variant="primary" onClick={() => { setModalState((p) => ({ ...p, isOpen: false })); if (modalState.onConfirm) modalState.onConfirm(); }}>ОК</Button>}>
        <p>{modalState.message}</p>
      </Modal>
    </div>
  );
}
