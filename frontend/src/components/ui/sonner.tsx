'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useResolvedTheme } from '@/lib/theme';

function Toaster(props: ToasterProps) {
  const theme = useResolvedTheme();
  return (
    <Sonner
      theme={theme}
      position="top-center"
      toastOptions={{
        classNames: {
          toast: '!bg-vault-raised !border !border-rule-strong !text-foreground !rounded-md !font-sans',
          description: '!text-mist',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
