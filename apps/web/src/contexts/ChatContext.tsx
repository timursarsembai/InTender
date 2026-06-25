'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ChatAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
}

interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderUserId: string;
  content: string;
  attachmentFileId?: string | null;
  attachment?: ChatAttachment | null;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; email: string };
}

interface ChatContextType {
  socket: Socket | null;
  connected: boolean;
  sendMessage: (roomId: string, content: string, attachmentFileId?: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  messages: Record<string, ChatMessage[]>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  // Rooms the user is currently viewing — re-joined automatically on (re)connect.
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  const connectSocket = (token: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';
    const s = io(`${wsBase}/chat`, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('[Chat] connected', s.id);
      setConnected(true);
      // Re-join every room we were viewing (handles reconnects).
      joinedRoomsRef.current.forEach((roomId) => s.emit('joinRoom', { roomId }));
    });
    s.on('connect_error', (err) => console.error('[Chat] connect_error:', err.message));
    s.on('disconnect', (reason) => {
      console.log('[Chat] disconnected:', reason);
      setConnected(false);
    });

    s.on('newMessage', (message: ChatMessage) => {
      setMessages((prev) => {
        const room = prev[message.chatRoomId] || [];
        if (room.find((m) => m.id === message.id)) return prev;
        return { ...prev, [message.chatRoomId]: [...room, message] };
      });
    });

    socketRef.current = s;
    setSocket(s);
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      tokenRef.current = token;
      connectSocket(token);
    }

    // Watch for token changes (login / logout) without recreating a live socket.
    const interval = setInterval(() => {
      const t = localStorage.getItem('access_token');
      if (t && t !== tokenRef.current) {
        // New login (or token rotated) — (re)connect with the new token.
        tokenRef.current = t;
        connectSocket(t);
      } else if (!t && socketRef.current) {
        // Logout — tear down.
        tokenRef.current = null;
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendMessage = (roomId: string, content: string, attachmentFileId?: string) => {
    const s = socketRef.current;
    if (!s) {
      console.warn('[Chat] no socket — message not sent');
      return;
    }
    // Emit regardless of connected flag; socket.io buffers until connected.
    s.emit('sendMessage', { chatRoomId: roomId, content, attachmentFileId });
  };

  const joinRoom = (roomId: string) => {
    joinedRoomsRef.current.add(roomId);
    const s = socketRef.current;
    if (s?.connected) {
      s.emit('joinRoom', { roomId });
    }
    // If not connected yet, the 'connect' handler will re-join from joinedRoomsRef.
  };

  const leaveRoom = (roomId: string) => {
    joinedRoomsRef.current.delete(roomId);
    socketRef.current?.emit('leaveRoom', { roomId });
  };

  return (
    <ChatContext.Provider
      value={{ socket, connected, sendMessage, joinRoom, leaveRoom, messages, setMessages }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}
