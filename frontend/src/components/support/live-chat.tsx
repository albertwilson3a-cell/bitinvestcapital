'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Composer, MessageList } from '@/components/support/chat-bits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/use-dashboard';
import { useClientThread, useMarkClientRead, useSendClientMessage } from '@/hooks/use-support';
import { APP_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * Floating support chat for the client portal. Only rendered inside /dashboard
 * (which requires a session) and only for client accounts.
 */
export function LiveChat() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const isClient = me.data?.role === 'CLIENT';
  const thread = useClientThread(open, isClient);
  const send = useSendClientMessage();
  const markRead = useMarkClientRead();
  const unread = thread.data?.unread ?? 0;

  // Opening the window (or a reply arriving while it is open) marks staff messages as read.
  const { mutate: read } = markRead;
  useEffect(() => {
    if (open && unread > 0) read();
  }, [open, unread, read]);

  if (!isClient) return null;

  return (
    <>
      {open && (
        <section
          aria-label="Live chat with support"
          className="fixed right-3 bottom-20 z-40 flex h-[min(560px,calc(100dvh-7rem))] w-[calc(100vw-1.5rem)] max-w-[380px] flex-col overflow-hidden rounded-xl border border-rule-strong bg-vault shadow-2xl sm:right-6"
        >
          <header className="flex items-start justify-between gap-3 border-b border-rule bg-vault-raised px-4 py-3">
            <div>
              <p className="text-[15px] font-semibold">Chat with support</p>
              <p className="mt-0.5 text-[12px] text-mist">Our team replies here. You’ll see a badge when they do.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-mist hover:bg-accent hover:text-foreground" aria-label="Close chat">
              <X className="size-4" />
            </button>
          </header>
          {thread.isLoading ? (
            <div className="flex-1 space-y-3 p-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="ml-auto h-10 w-1/2" />
            </div>
          ) : (
            <MessageList
              messages={thread.data?.messages ?? []}
              mine="client"
              empty={
                <div className="text-center">
                  <MessageCircle className="mx-auto size-6 text-brass" />
                  <p className="mt-3 text-[14px] font-medium">How can we help?</p>
                  <p className="mt-1 text-[13px] text-mist">
                    Ask about deposits, earning or your account. {APP_NAME} staff will never ask for your password.
                  </p>
                </div>
              }
            />
          )}
          <Composer onSend={(b) => send.mutateAsync(b)} pending={send.isPending} />
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close live chat' : unread ? `Open live chat, ${unread} new message${unread === 1 ? '' : 's'}` : 'Open live chat'}
        className={cn(
          'fixed right-3 bottom-4 z-40 flex h-12 items-center gap-2 rounded-full bg-brass pr-5 pl-4 text-[14px] font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-brass/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-6 sm:bottom-6',
        )}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        {open ? 'Close' : 'Live chat'}
        {!open && unread > 0 && (
          <span className="tabular absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-down text-[11px] text-white">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    </>
  );
}
