'use client';

import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'dark' | 'light' | 'system';
export const THEME_KEY = 'bic-theme';

/**
 * Runs in <head> before the page paints, so a light-mode visitor never sees a
 * dark flash. Keep it tiny and dependency-free; it mirrors applyTheme().
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var c=localStorage.getItem('${THEME_KEY}')||'dark';var l=c==='light'||(c==='system'&&matchMedia('(prefers-color-scheme: light)').matches);var e=document.documentElement;e.classList.toggle('light',l);e.classList.toggle('dark',!l);e.style.colorScheme=l?'light':'dark';}catch(_){}})();`;

const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'system' ? v : 'dark';
  } catch {
    return 'dark';
  }
}

function resolve(choice: ThemeChoice): 'dark' | 'light' {
  if (choice !== 'system') return choice;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function apply(choice: ThemeChoice) {
  const mode = resolve(choice);
  const el = document.documentElement;
  el.classList.toggle('light', mode === 'light');
  el.classList.toggle('dark', mode === 'dark');
  el.style.colorScheme = mode;
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', mode === 'light' ? '#f5f6f9' : '#0a1220');
}

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* private mode: still switch for this visit */
  }
  apply(choice);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Follow the phone/computer setting live when "Auto" is chosen, and other tabs.
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const onSystem = () => {
    if (read() === 'system') apply('system');
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) {
      apply(read());
      cb();
    }
  };
  mq.addEventListener('change', onSystem);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener('change', onSystem);
    window.removeEventListener('storage', onStorage);
  };
}

/** Current choice; 'dark' during server render (the brand default). */
export function useTheme(): ThemeChoice {
  return useSyncExternalStore(subscribe, read, () => 'dark');
}

/** The mode actually showing (resolves "system"). */
export function useResolvedTheme(): 'dark' | 'light' {
  const choice = useTheme();
  return useSyncExternalStore(subscribe, () => resolve(choice), () => 'dark');
}
