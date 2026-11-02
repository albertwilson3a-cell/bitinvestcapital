'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
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
