'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Inbox, MessageCircle, RotateCcw } from 'lucide-react';
import { Composer, MessageList } from '@/components/support/chat-bits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useInbox, useSetConversationStatus, useStaffMarkRead, useStaffReply, useStaffThread, type StaffConversation } from '@/hooks/use-support';
import { cn } from '@/lib/utils';

const when = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(undefined, sameDay ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric' }).format(d);
};

function Row({ c, active, onClick }: { c: StaffConversation; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'true' : undefined}
        className={cn('w-full border-b border-rule/70 px-4 py-3 text-left transition-colors hover:bg-accent/50', active && 'bg-accent')}
      >
        <span className="flex items-center justify-between gap-3">
          <span className={cn('truncate text-[13px]', c.unread ? 'font-semibold text-foreground' : 'text-foreground/90')}>{c.client.email}</span>
          <span className="shrink-0 text-[11px] text-mist">{when(c.lastMessageAt)}</span>
        </span>
        <span className="mt-1 flex items-center justify-between gap-3">
          <span className="truncate text-[12px] text-mist">
            {c.lastMessage ? `${c.lastMessage.fromStaff ? 'You: ' : ''}${c.lastMessage.body}` : 'No messages'}
          </span>
          {c.unread > 0 && <span className="tabular shrink-0 rounded-full bg-brass px-1.5 text-[11px] font-semibold text-primary-foreground">{c.unread}</span>}
        </span>
      </button>
    </li>
  );
}

function Thread({ id }: { id: string }) {
  const thread = useStaffThread(id);
  const reply = useStaffReply(id);
  const markRead = useStaffMarkRead();
  const setStatus = useSetConversationStatus();
  const lastClientMsg = thread.data?.messages.filter((m) => !m.fromStaff).at(-1)?.id;

  // Viewing a thread marks the client's messages as read for staff.
  const { mutate: read } = markRead;
  useEffect(() => {
    if (lastClientMsg) read(id);
  }, [id, lastClientMsg, read]);

  if (!thread.data) return <Skeleton className="m-4 h-[420px]" />;
  const c = thread.data.conversation;
  const closed = c.status === 'closed';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{c.client.email}</p>
          <p className="text-[12px] text-mist">
            Client since {new Date(c.client.createdAt).toLocaleDateString()} · {c.client.isVerified ? 'email verified' : 'email not verified'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={closed ? 'neutral' : 'success'}>{closed ? 'Closed' : 'Open'}</Badge>
          <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id, status: closed ? 'open' : 'closed' })}>
            {closed ? <RotateCcw /> : <CheckCircle2 />}
            {closed ? 'Reopen' : 'Mark resolved'}
          </Button>
        </div>
      </header>
      <MessageList messages={thread.data.messages} mine="staff" className="min-h-0" />
      <Composer onSend={(b) => reply.mutateAsync(b)} pending={reply.isPending} placeholder="Reply to the client… (Enter to send)" />
    </div>
  );
}

/** Admin inbox: every client conversation, newest first, with live updates. */
export function SupportInbox() {
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const inbox = useInbox(status);
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? inbox.data?.[0]?.id ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Live chat</h1>
          <p className="mt-1 text-[14px] text-mist">Messages from clients in their portal. Replies appear in their chat window within a few seconds.</p>
        </div>
        <Segmented label="Show" value={status} onChange={(v) => { setStatus(v); setSelected(null); }} options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Resolved' }, { value: 'all', label: 'All' }]} />
      </div>

      <div className="grid h-[calc(100dvh-220px)] min-h-[520px] overflow-hidden rounded-lg border border-rule bg-vault/55 lg:grid-cols-[320px_1fr]">
        <aside className="min-h-0 overflow-y-auto border-b border-rule lg:border-r lg:border-b-0" aria-label="Conversations">
          {inbox.isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !inbox.data?.length ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-[13px] text-mist">
              <Inbox className="size-5" />
              {status === 'open' ? 'No open conversations.' : 'Nothing here yet.'}
            </div>
          ) : (
            <ul>{inbox.data.map((c) => <Row key={c.id} c={c} active={c.id === current} onClick={() => setSelected(c.id)} />)}</ul>
          )}
        </aside>
        <div className="min-h-0">
          {current ? (
            <Thread key={current} id={current} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[13px] text-mist">
              <MessageCircle className="size-5" />
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
