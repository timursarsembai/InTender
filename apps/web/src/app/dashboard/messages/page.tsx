'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChat } from '@/contexts/ChatContext';
import styles from './messages.module.css';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';

interface ChatRoom {
  id: string;
  orderId: string;
  order: { id: string; title: string };
  buyerOrganization: { id: string; legalName: string };
  supplierOrganization: { id: string; legalName: string };
  messages: any[];
  updatedAt: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { joinRoom, leaveRoom, messages, setMessages, sendMessage } = useChat();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoomId]);

  const fetchRooms = async () => {
    try {
      const data = await api.get<ChatRoom[]>('/chat/rooms');
      setRooms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSelectRoom = async (roomId: string) => {
    if (activeRoomId) leaveRoom(activeRoomId);
    setActiveRoomId(roomId);
    joinRoom(roomId);
    // Load history only if not cached
    if (!messages[roomId]) {
      try {
        const history = await api.get<any[]>(`/chat/rooms/${roomId}/messages`);
        setMessages((prev) => ({ ...prev, [roomId]: history }));
      } catch (err) {
        console.error('Failed to load message history', err);
      }
    }
  };

  const handleSend = () => {
    if (!activeRoomId || !messageText.trim()) return;
    sendMessage(activeRoomId, messageText);
    setMessageText('');
  };

  // Upload a file via presigned URL flow, then send it as a chat message.
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;
    e.target.value = ''; // allow re-selecting the same file later

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
      sendMessage(activeRoomId, messageText.trim(), intent.fileId);
      setMessageText('');
    } catch (err: any) {
      alert('Не удалось отправить файл: ' + (err?.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const roomMessages = activeRoomId ? messages[activeRoomId] || [] : [];

  // Other party = whichever organization is NOT the current user's.
  // Relies on org id (not role) so it stays correct when a user switches roles.
  const otherPartyName = (room: ChatRoom): string => {
    const myOrgId = user?.organizationId;
    if (myOrgId && room.buyerOrganization?.id === myOrgId) {
      return room.supplierOrganization?.legalName || 'Поставщик';
    }
    return room.buyerOrganization?.legalName || 'Заказчик';
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2 className={styles.header}>Диалоги</h2>
        {loadingRooms ? (
          <p className={styles.emptyText}>Загрузка...</p>
        ) : rooms.length === 0 ? (
          <p className={styles.emptyText}>У вас пока нет диалогов.</p>
        ) : (
          <ul className={styles.roomList}>
            {rooms.map((room) => {
              const otherParty = otherPartyName(room);
              return (
                <li
                  key={room.id}
                  className={`${styles.roomItem} ${activeRoomId === room.id ? styles.active : ''}`}
                  onClick={() => handleSelectRoom(room.id)}
                >
                  <div className={styles.roomTitle}>{otherParty}</div>
                  <div className={styles.roomOrder}>{room.order?.title}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={styles.chatArea}>
        {activeRoom ? (
          <>
            <div className={styles.chatHeader}>
              <h3>{otherPartyName(activeRoom)}</h3>
              <span className={styles.orderRef}>Заказ: {activeRoom.order?.title}</span>
            </div>

            <div className={styles.messageList}>
              {roomMessages.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.875rem' }}>
                  Напишите первое сообщение
                </p>
              )}
              {roomMessages.map((msg: any) => {
                const isMine = msg.senderUserId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`${styles.messageWrapper} ${isMine ? styles.mine : styles.theirs}`}
                  >
                    <div className={styles.messageBubble}>
                      <div className={styles.messageSender}>{msg.sender?.email}</div>
                      {msg.attachment && (
                        <div className={styles.attachment}>
                          {msg.attachment.mimeType?.startsWith('image/') ? (
                            <a href={msg.attachment.downloadUrl} target="_blank" rel="noreferrer">
                              <img
                                src={msg.attachment.downloadUrl}
                                alt={msg.attachment.originalName}
                                className={styles.attachmentImage}
                              />
                            </a>
                          ) : (
                            <a
                              href={msg.attachment.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.attachmentFile}
                            >
                              <span className={styles.attachmentIcon}>📎</span>
                              <span className={styles.attachmentMeta}>
                                <span className={styles.attachmentName}>
                                  {msg.attachment.originalName}
                                </span>
                                <span className={styles.attachmentSize}>
                                  {formatSize(msg.attachment.sizeBytes)}
                                </span>
                              </span>
                            </a>
                          )}
                        </div>
                      )}
                      {msg.content && <div className={styles.messageContent}>{msg.content}</div>}
                      <div className={styles.messageTime}>
                        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className={styles.inputArea}>
              <input
                ref={fileInputRef}
                type="file"
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
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Введите сообщение..."
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button onClick={handleSend} disabled={!messageText.trim()}>
                Отправить
              </Button>
            </div>
          </>
        ) : (
          <div className={styles.noChatSelected}>
            <p>Выберите диалог слева, чтобы начать общение</p>
          </div>
        )}
      </div>
    </div>
  );
}
