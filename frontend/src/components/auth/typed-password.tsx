'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

const block = (e: React.SyntheticEvent) => e.preventDefault();

/**
 * Password field for creating a password: paste, copy, cut, drag-and-drop and
 * the context menu are disabled so the password has to be typed by hand.
 */
export function TypedPassword({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  onBlocked,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  onBlocked?: () => void;
}) {
  const [show, setShow] = useState(false);
  const blocked = (e: React.SyntheticEvent) => {
    block(e);
    onBlocked?.();
  };
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={blocked}
        onCopy={block}
        onCut={block}
        onDrop={blocked}
        onDragStart={block}
        onContextMenu={block}
        spellCheck={false}
        className="pr-10"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-mist hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
