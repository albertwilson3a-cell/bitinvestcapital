'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returns 'up' | 'down' for ~1s after a numeric value changes, plus a key that
 * changes on every tick so a CSS flash animation can restart.
 */
export function useTick(value: number | null | undefined) {
  const prev = useRef<number | null | undefined>(value);
  const [tick, setTick] = useState<{ dir: 'up' | 'down' | null; n: number }>({ dir: null, n: 0 });

  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (before == null || value == null || before === value) return;
    setTick((t) => ({ dir: value > before ? 'up' : 'down', n: t.n + 1 }));
  }, [value]);

  return tick;
}
