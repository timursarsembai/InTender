'use client';

import React, { useEffect, useState } from 'react';
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
  const { joinRoom, leaveRoom, messages, sendMessage } = useChat();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

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

  const handleSelectRoom = (roomId: string) => {
    if (activeRoomId) {
      leaveRoom(activeRoomId);
    }
    setActiveRoomId(roomId);
    joinRoom(roomId);
  };

  const handleSend = () => {
    if (!activeRoomId || !messageText.trim()) return;
    sendMessage(activeRoomId, messageText);
    setMessageText('');
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const roomMessages = activeRoomId ? messages[activeRoomId] || [] : [];

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
              const otherParty =
                user?.role === 'BUYER'
                  ? room.supplierOrganization.legalName
                  : room.buyerOrganization.legalName;
              return (
                <li
                  key={room.id}
                  className={`${styles.roomItem} ${activeRoomId === room.id ? styles.active : ''}`}
                  onClick={() => handleSelectRoom(room.id)}
                >
                  <div className={styles.roomTitle}>{otherParty}</div>
                  <div className={styles.roomOrder}>{room.order.title}</div>
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
              <h3>
                {user?.role === 'BUYER'
                  ? activeRoom.supplierOrganization.legalName
                  : activeRoom.buyerOrganization.legalName}
              </h3>
              <span className={styles.orderRef}>Заказ: {activeRoom.order.title}</span>
            </div>

            <div className={styles.messageList}>
              {roomMessages.map((msg: any) => {
                const isMine = msg.senderUserId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`${styles.messageWrapper} ${isMine ? styles.mine : styles.theirs}`}
                  >
                    <div className={styles.messageBubble}>
                      <div className={styles.messageSender}>{msg.sender.email}</div>
                      <div className={styles.messageContent}>{msg.content}</div>
                      <div className={styles.messageTime}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.inputArea}>
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
