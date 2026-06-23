'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/Button/Button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table/Table';
import { Badge } from '@/components/ui/Badge/Badge';

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToppingUp, setIsToppingUp] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const data = await api.get<any[]>('/me/wallet/transactions');
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopUp = async () => {
    setIsToppingUp(true);
    try {
      // Mock payment simulation
      await api.post('/payments/webhooks/mock', {
        amountMinor: 1000000, // 10 000 KZT
        idempotencyKey: `topup-${Date.now()}`
      });
      await refreshUser(); // Update balance in context
      await fetchTransactions(); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Ошибка пополнения баланса');
    } finally {
      setIsToppingUp(false);
    }
  };

  const formatMoney = (minor: number) => {
    return (minor / 100).toLocaleString('ru-RU') + ' ₸';
  };

  const getTxTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      TOP_UP: 'Пополнение',
      ORDER_PUBLICATION: 'Публикация заказа',
      OFFER_SUBMISSION: 'Подача отклика',
      AI_SPEC_ANALYSIS: 'AI-Парсинг спецификации',
      REFUND: 'Возврат средств',
      ADMIN_ADJUSTMENT: 'Админ. корректировка',
    };
    return map[type] || type;
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>Кошелек</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Balance Card */}
        <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Доступный баланс</h2>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {formatMoney(user?.wallet?.availableBalanceMinor || 0)}
            </div>
          </div>
          
          <Button onClick={handleTopUp} isLoading={isToppingUp} size="lg" style={{ width: '100%' }}>
            Пополнить (Тест 10 000 ₸)
          </Button>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            * В MVP пополнение происходит в тестовом режиме без ввода карты
          </p>
        </div>

        {/* Transactions List */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>История транзакций</h2>
          
          {isLoading ? (
            <p>Загрузка...</p>
          ) : transactions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Транзакций пока нет.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell style={{ color: 'var(--text-secondary)' }}>
                      {new Date(tx.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      {getTxTypeLabel(tx.type)}
                    </TableCell>
                    <TableCell>
                      {tx.direction === 'CREDIT' ? (
                        <Badge variant="success">+{formatMoney(tx.amountMinor)}</Badge>
                      ) : (
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          -{formatMoney(tx.amountMinor)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
