'use client';

import { useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthStorageKeys, getAuthRolePrefix, type TicketMessageDto, type TicketStatus } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';

interface UseTicketSocketOptions {
  ticketId: number | null;
  /** Detail query key prefix, e.g. 'client-ticket-detail' */
  detailKeyPrefix: string;
  /** Language for the query key */
  lang: string;
  /** Query key prefix for the ticket list, e.g. 'client-tickets' */
  listKeyPrefix?: string;
  /** Called when the ticket status changes via socket */
  onStatusChange?: (status: TicketStatus) => void;
}

export function useTicketSocket({ ticketId, detailKeyPrefix, lang, listKeyPrefix, onStatusChange }: UseTicketSocketOptions) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const detailQueryKey = useMemo(() => [detailKeyPrefix, ticketId, lang], [detailKeyPrefix, ticketId, lang]);

  useEffect(() => {
    if (!ticketId) return;

    const rolePrefix = getAuthRolePrefix();
    const token = localStorage.getItem(getAuthStorageKeys(rolePrefix).token);
    if (!token) return;

    const socket = io(`${API_BASE_URL}/tickets`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('ticket:join', { ticketId });
    });

    socket.on('ticket:new_message', (data: { ticketId: number; message: TicketMessageDto }) => {
      if (data.ticketId === ticketId) {
        queryClient.setQueryData(detailQueryKey, (old: any) => {
          if (!old?.success || !old?.data) return old;
          const existing = old.data.messages as TicketMessageDto[];
          if (existing.some((m: TicketMessageDto) => m.id === data.message.id)) return old;
          return {
            ...old,
            data: {
              ...old.data,
              messages: [...existing, data.message],
            },
          };
        });
        if (listKeyPrefix) {
          queryClient.invalidateQueries({ queryKey: [listKeyPrefix] });
        }
      }
    });

    socket.on('ticket:status_changed', (data: { ticketId: number; status: TicketStatus }) => {
      if (data.ticketId === ticketId) {
        queryClient.invalidateQueries({ queryKey: detailQueryKey });
        if (listKeyPrefix) {
          queryClient.invalidateQueries({ queryKey: [listKeyPrefix] });
        }
        onStatusChangeRef.current?.(data.status);
      }
    });

    socket.on('ticket:message_read', (data: { ticketId: number }) => {
      if (data.ticketId === ticketId) {
        queryClient.invalidateQueries({ queryKey: detailQueryKey });
      }
    });

    return () => {
      socket.emit('ticket:leave', { ticketId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [ticketId, detailQueryKey, listKeyPrefix, queryClient]);
}
