'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { io, Socket } from 'socket.io-client';
import styles from '../messages/messages.module.css';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';

interface SupportMessage {
  id: string;
  senderUserId: string;
  content: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentFile?: { mimeType: string; originalName: string; sizeBytes: number } | null;
  sender: { id: string; email: string; role: string };
}

interface SupportRoom {
  id: string;
  userId: string;
  status: string;
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';

export default function HelpPage() {
  const { user } = useAuth();
  const [room, setRoom] = useState<SupportRoom | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async (retries = 2) => {
    try {
      const data = await api.get<{ room: SupportRoom; messages: SupportMessage[] }>('/support/my-messages');
      setRoom(data.room);
      setMessages(data.messages);
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => loadMessages(retries - 1), 1000);
      } else {
        console.error(err);
      }
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!room) return;
    const token = localStorage.getItem('access_token');
    const socket = io(`${WS_BASE}/support`, {
      auth: { token: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      socket.emit('joinSupportRoom', { roomId: room.id });
    });

    socket.on('newSupportMessage', (msg: SupportMessage) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [room?.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    try {
      const result = await api.post<{ roomId: string; message: SupportMessage }>('/support/send', { content });
      // If room wasn't loaded yet, set it now and join via WebSocket
      if (!room) {
        await loadMessages();
      } else {
        // Optimistically add message if WS hasn't delivered it yet
        setMessages((prev) => {
          if (prev.find((m) => m.id === result.message.id)) return prev;
          return [...prev, result.message];
        });
      }
    } catch (err) {
      console.error(err);
      setText(content); // restore text on failure
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 25 * 1024 * 1024) {
      alert('Файл слишком большой (максимум 25 МБ)');
      return;
    }

    setUploading(true);
    try {
      const intent = await api.post<{ fileId: string; uploadUrl: string }>('/files/upload-intent', {
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      await fetch(intent.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      await api.post(`/files/${intent.fileId}/complete`);
      await api.post('/support/send', { content: text.trim(), attachmentFileId: intent.fileId });
      setText('');
    } catch (err: unknown) {
      alert('Не удалось отправить файл: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2 className={styles.header}>Служба поддержки</h2>
        <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <p>Напишите нам, если у вас возник вопрос или проблема. Мы ответим как можно скорее.</p>
          {room && (
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Статус: {room.status === 'OPEN' ? 'Открыт' : 'Закрыт'}
            </p>
          )}
        </div>
      </div>

      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <h3>Техподдержка InTender</h3>
          <span className={styles.orderRef}>Мы здесь, чтобы помочь</span>
        </div>

        <div className={styles.messageList}>
          {messages.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.875rem' }}>
              Напишите первое сообщение
            </p>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderUserId === user?.id;
            return (
              <div key={msg.id} className={`${styles.messageWrapper} ${isMine ? styles.mine : styles.theirs}`}>
                <div className={styles.messageBubble}>
                  <div className={styles.messageSender}>
                    {msg.sender?.role === 'ADMIN' || msg.sender?.role === 'MODERATOR'
                      ? 'Поддержка'
                      : 'Вы'}
                  </div>
                  {msg.attachmentUrl && (
                    <div className={styles.attachment}>
                      {msg.attachmentFile?.mimeType?.startsWith('image/') ? (
                        <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                          <img src={msg.attachmentUrl} alt="attachment" className={styles.attachmentImage} />
                        </a>
                      ) : (
                        <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className={styles.attachmentFile}>
                          {msg.attachmentFile?.originalName ?? 'Файл'}
                        </a>
                      )}
                    </div>
                  )}
                  {msg.content && <p className={styles.messageText}>{msg.content}</p>}
                  <span className={styles.messageTime}>
                    {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className={styles.inputArea}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
          <button
            type="button"
            className={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Прикрепить файл"
          >
            {uploading ? '⏳' : '📎'}
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={uploading ? 'Загрузка файла...' : 'Напишите сообщение...'}
            onKeyDown={handleKeyDown}
            disabled={uploading}
          />
          <Button onClick={handleSend} disabled={!text.trim() || uploading}>
            Отправить
          </Button>
        </div>
      </div>
    </div>
  );
}
