'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderUserId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    email: string;
  };
}

interface ChatContextType {
  socket: Socket | null;
  sendMessage: (roomId: string, content: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  messages: Record<string, ChatMessage[]>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  useEffect(() => {
    // We get the token from localStorage
    const token = localStorage.getItem('token');
    if (!token) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      namespace: '/chat',
      auth: { token: `Bearer ${token}` },
    });

    socketInstance.on('connect', () => {
      console.log('Chat socket connected');
    });

    socketInstance.on('newMessage', (message: ChatMessage) => {
      setMessages((prev) => {
        const roomMessages = prev[message.chatRoomId] || [];
        // prevent duplicate rendering
        if (roomMessages.find((m) => m.id === message.id)) return prev;
        return {
          ...prev,
          [message.chatRoomId]: [...roomMessages, message],
        };
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const sendMessage = (roomId: string, content: string) => {
    if (socket) {
      socket.emit('sendMessage', { chatRoomId: roomId, content });
    }
  };

  const joinRoom = (roomId: string) => {
    if (socket) {
      socket.emit('joinRoom', { roomId });
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket) {
      socket.emit('leaveRoom', { roomId });
    }
  };

  return (
    <ChatContext.Provider
      value={{ socket, sendMessage, joinRoom, leaveRoom, messages, setMessages }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
