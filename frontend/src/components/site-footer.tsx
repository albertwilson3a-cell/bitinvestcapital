import { APP_NAME, SITE_HOST, SITE_URL, SUPPORT_EMAIL } from '@/lib/brand';
import { cn } from '@/lib/utils';

/** Corporate footer with the risk disclosure shown on every customer-facing page. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t border-rule', className)}>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-8 text-[12px] leading-relaxed text-mist sm:px-6 lg:flex-row lg:gap-12 lg:px-8">
        <div className="shrink-0">
          <p className="font-medium text-foreground/90">{APP_NAME}</p>
          <p className="mt-1">
            <a href={SITE_URL} className="underline-offset-4 hover:text-foreground hover:underline">{SITE_HOST}</a>
            <span className="mx-2 text-rule-strong" aria-hidden="true">|</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline-offset-4 hover:text-foreground hover:underline">{SUPPORT_EMAIL}</a>
          </p>
          <p className="mt-1">&copy; {APP_NAME}</p>
        </div>
        <p className="max-w-[80ch]">
          Digital assets are volatile and their value can fall as well as rise; you may lose some or all of the money you
          deposit. Yields are variable, are not guaranteed and may be changed or paused at any time. Nothing on this site is
          investment, tax or legal advice. {APP_NAME} will never ask for your password or recovery phrase.
        </p>
      </div>
    </footer>
  );
}
