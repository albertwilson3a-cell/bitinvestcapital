import { cn } from '@/lib/utils';

export function AuthPanel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-rule bg-vault/70 p-6 sm:p-8', className)}>
      <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">{title}</h1>
      {description && <p className="mt-2 text-[14px] text-mist">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function FormNotice({ tone, children }: { tone: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border px-3 py-2.5 text-[13px]',
        tone === 'error' && 'border-down/35 bg-down/8 text-down',
        tone === 'success' && 'border-up/30 bg-up/8 text-up',
        tone === 'info' && 'border-rule-strong bg-ink/60 text-mist',
      )}
    >
      {children}
    </div>
  );
}
