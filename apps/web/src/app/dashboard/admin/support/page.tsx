'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { io, Socket } from 'socket.io-client';
import styles from '../../messages/messages.module.css';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';

interface SupportRoom {
  id: string;
  userId: string;
  status: string;
  updatedAt: string;
  user: { id: string; email: string };
  messages: { content: string; createdAt: string }[];
}

interface SupportMessage {
  id: string;
  senderUserId: string;
  content: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentFile?: { mimeType: string; originalName: string; sizeBytes: number } | null;
  sender: { id: string; email: string; role: string };
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<SupportRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, SupportMessage[]>>({});
  const [text, setText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRooms = useCallback(async () => {
    try {
      const data = await api.get<{ rooms: SupportRoom[]; total: number }>('/support/rooms');
      setRooms(data.rooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoomId]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const socket = io(`${WS_BASE}/support`, {
      auth: { token: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      joinedRoomsRef.current.forEach((roomId) => socket.emit('joinSupportRoom', { roomId }));
    });

    socket.on('newSupportMessage', (msg: SupportMessage & { roomId?: string }) => {
      const roomId = msg.roomId ?? activeRoomId;
      if (!roomId) return;
      setMessages((prev) => {
        const room = prev[roomId] ?? [];
        if (room.find((m) => m.id === msg.id)) return prev;
        return { ...prev, [roomId]: [...room, msg] };
      });
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  const handleSelectRoom = async (roomId: string) => {
    setActiveRoomId(roomId);
    if (!joinedRoomsRef.current.has(roomId)) {
      joinedRoomsRef.current.add(roomId);
      socketRef.current?.emit('joinSupportRoom', { roomId });
    }
    if (!messages[roomId]) {
      try {
        const data = await api.get<{ room: SupportRoom; messages: SupportMessage[] }>(`/support/rooms/${roomId}/messages`);
        setMessages((prev) => ({ ...prev, [roomId]: data.messages }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !activeRoomId) return;
    const content = text.trim();
    setText('');
    try {
      await api.post(`/support/rooms/${activeRoomId}/send`, { content });
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;
    e.target.value = '';
    if (file.size > 25 * 1024 * 1024) { alert('Файл слишком большой (максимум 25 МБ)'); return; }

    setUploading(true);
    try {
      const intent = await api.post<{ fileId: string; uploadUrl: string }>('/files/upload-intent', {
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      await fetch(intent.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      await api.post(`/files/${intent.fileId}/complete`);
      await api.post(`/support/rooms/${activeRoomId}/send`, { content: text.trim(), attachmentFileId: intent.fileId });
      setText('');
    } catch (err: unknown) {
      alert('Не удалось отправить файл: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const roomMessages = activeRoomId ? messages[activeRoomId] ?? [] : [];

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2 className={styles.header}>Обращения</h2>
        {loadingRooms ? (
          <p className={styles.emptyText}>Загрузка...</p>
        ) : rooms.length === 0 ? (
          <p className={styles.emptyText}>Нет обращений</p>
        ) : (
          <ul className={styles.roomList}>
            {rooms.map((room) => (
              <li
                key={room.id}
                className={`${styles.roomItem} ${activeRoomId === room.id ? styles.active : ''}`}
                onClick={() => handleSelectRoom(room.id)}
              >
                <div className={styles.roomTitle}>{room.user.email}</div>
                <div className={styles.roomOrder}>
                  {room.messages[0]?.content
                    ? room.messages[0].content.slice(0, 40) + (room.messages[0].content.length > 40 ? '...' : '')
                    : 'Нет сообщений'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.chatArea}>
        {activeRoom ? (
          <>
            <div className={styles.chatHeader}>
              <h3>{activeRoom.user.email}</h3>
              <span className={styles.orderRef}>Статус: {activeRoom.status === 'OPEN' ? 'Открыт' : 'Закрыт'}</span>
            </div>

            <div className={styles.messageList}>
              {roomMessages.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.875rem' }}>
                  Нет сообщений
                </p>
              )}
              {roomMessages.map((msg) => {
                const isMine = msg.senderUserId === user?.id;
                return (
                  <div key={msg.id} className={`${styles.messageWrapper} ${isMine ? styles.mine : styles.theirs}`}>
                    <div className={styles.messageBubble}>
                      <div className={styles.messageSender}>{msg.sender?.email}</div>
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
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelected} />
              <button type="button" className={styles.attachButton} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Прикрепить файл">
                📎
              </button>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={uploading ? 'Загрузка...' : 'Ответить пользователю...'}
                onKeyDown={handleKeyDown}
                disabled={uploading}
              />
              <Button onClick={handleSend} disabled={!text.trim() || uploading}>Отправить</Button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Выберите обращение слева
          </div>
        )}
      </div>
    </div>
  );
}
