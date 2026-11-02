'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/hooks/use-support';
import { cn } from '@/lib/utils';

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** Message bubbles grouped by day; `mine` decides which side is "me". */
export function MessageList({ messages, mine, className, empty }: { messages: ChatMessage[]; mine: 'client' | 'staff'; className?: string; empty?: React.ReactNode }) {
  const end = useRef<HTMLDivElement>(null);
  const last = messages.at(-1)?.id;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [last]);

  if (!messages.length) return <div className={cn('flex flex-1 items-center justify-center p-6', className)}>{empty}</div>;

  return (
    <div className={cn('flex flex-1 flex-col gap-2 overflow-y-auto p-4', className)} role="log" aria-live="polite" aria-label="Messages">
      {messages.map((m, i) => {
        const d = new Date(m.createdAt);
        const day = dayFmt.format(d);
        const showDay = i === 0 || day !== dayFmt.format(new Date(messages[i - 1].createdAt));
        const isMine = mine === 'staff' ? m.fromStaff : !m.fromStaff;
        return (
          <div key={m.id} className="flex flex-col">
            {showDay && <p className="my-2 text-center text-[11px] text-mist">{day}</p>}
            <div className={cn('flex max-w-[85%] flex-col', isMine ? 'items-end self-end' : 'items-start self-start')}>
              {!isMine && <span className="mb-0.5 text-[11px] text-mist">{m.fromStaff ? 'Support team' : 'Client'}</span>}
              <p
                className={cn(
                  'rounded-lg px-3 py-2 text-[14px] leading-relaxed break-words whitespace-pre-wrap',
                  isMine ? 'rounded-br-sm bg-brass text-primary-foreground' : 'rounded-bl-sm border border-rule bg-vault-raised',
                )}
              >
                {m.body}
              </p>
              <span className="mt-0.5 text-[10.5px] text-mist">{timeFmt.format(d)}</span>
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

/** Enter sends, Shift+Enter adds a new line. */
export function Composer({ onSend, pending, placeholder = 'Write a message…', disabled }: { onSend: (body: string) => Promise<unknown>; pending: boolean; placeholder?: string; disabled?: boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const trimmed = text.trim();

  async function submit() {
    if (!trimmed || pending) return;
    setError(null);
    try {
      await onSend(trimmed);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message not sent. Try again.');
    }
  }

  return (
    <div className="border-t border-rule p-3">
      {error && <p className="mb-2 text-[12px] text-down" role="alert">{error}</p>}
      <div className="flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <textarea
          id="chat-input"
          rows={1}
          maxLength={2000}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-ink/60 px-3 py-2 text-[14px] outline-none placeholder:text-mist/70 focus-visible:border-brass/60 disabled:opacity-50"
        />
        <Button type="button" size="icon" onClick={() => void submit()} disabled={!trimmed || pending || disabled} aria-label="Send message">
          <SendHorizontal />
        </Button>
      </div>
      {text.length > 1800 && <p className="mt-1 text-right text-[11px] text-mist">{2000 - text.length} characters left</p>}
    </div>
  );
}
