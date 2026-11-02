'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ChatMessage {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: string;
}

export interface ClientThread {
  conversation: { id: string; status: 'open' | 'closed'; lastMessageAt: string } | null;
  messages: ChatMessage[];
  unread: number;
}

export interface StaffConversation {
  id: string;
  status: 'open' | 'closed';
  lastMessageAt: string;
  client: { id: string; email: string };
  lastMessage: ChatMessage | null;
  unread: number;
}

export interface StaffThread {
  conversation: { id: string; status: 'open' | 'closed'; lastMessageAt: string; client: { id: string; email: string; createdAt: string; isVerified: boolean } };
  messages: ChatMessage[];
}

const keys = {
  client: ['support', 'client'] as const,
  inbox: (status: string) => ['support', 'inbox', status] as const,
  unread: ['support', 'unread'] as const,
  thread: (id: string) => ['support', 'thread', id] as const,
};

// ── client ────────────────────────────────────────────────────────

/** Polls faster while the chat window is open. */
export function useClientThread(open: boolean, enabled = true) {
  return useQuery({
    queryKey: keys.client,
    enabled,
    queryFn: () => api<ClientThread>('support/conversation'),
    refetchInterval: open ? 4_000 : 20_000,
    refetchIntervalInBackground: false,
  });
}

export function useSendClientMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api<ChatMessage>('support/conversation/messages', { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.client }),
  });
}

export function useMarkClientRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<null>('support/conversation/read', { method: 'POST' }),
    onSuccess: () => qc.setQueryData<ClientThread>(keys.client, (t) => (t ? { ...t, unread: 0 } : t)),
  });
}

// ── staff ─────────────────────────────────────────────────────────

export function useStaffUnread() {
  return useQuery({ queryKey: keys.unread, queryFn: () => api<{ conversations: number }>('admin/support/unread'), refetchInterval: 15_000 });
}

export function useInbox(status: 'open' | 'closed' | 'all') {
  return useQuery({ queryKey: keys.inbox(status), queryFn: () => api<StaffConversation[]>(`admin/support/conversations?status=${status}`), refetchInterval: 5_000 });
}

export function useStaffThread(id: string | null) {
  return useQuery({
    queryKey: keys.thread(id ?? ''),
    queryFn: () => api<StaffThread>(`admin/support/conversations/${id}`),
    enabled: !!id,
    refetchInterval: 4_000,
  });
}

export function useStaffReply(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api<ChatMessage>(`admin/support/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support'] }),
  });
}

export function useStaffMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<null>(`admin/support/conversations/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.unread });
      void qc.invalidateQueries({ queryKey: ['support', 'inbox'] });
    },
  });
}

export function useSetConversationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'closed' }) =>
      api(`admin/support/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support'] }),
  });
}
