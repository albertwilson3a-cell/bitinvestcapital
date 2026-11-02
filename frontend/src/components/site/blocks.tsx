import Link from 'next/link';
import { ArrowRight, Mail, MessageCircle, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_NAME, SITE_HOST, SITE_URL, SUPPORT_EMAIL } from '@/lib/brand';
import { AuthButton } from '@/components/site/auth-aware';
import { FOOTER_COLUMNS } from '@/lib/site-nav';
import { cn } from '@/lib/utils';

/** Page-top banner: eyebrow, serif headline, intro and optional actions / aside. */
export function PageHero({
  eyebrow,
  title,
  intro,
  children,
  aside,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro: React.ReactNode;
  children?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="relative border-b border-rule/70">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_80%_at_15%_0%,color-mix(in_oklab,var(--brass)_9%,transparent),transparent)]"
      />
      <div className={cn('relative mx-auto grid max-w-[1200px] gap-10 px-4 pt-14 pb-12 sm:px-6 lg:pt-20', aside && 'lg:grid-cols-[1.1fr_1fr] lg:items-center')}>
        <div>
          <p className="text-[12px] font-medium tracking-[0.14em] text-brass uppercase">{eyebrow}</p>
          <h1 className="mt-4 max-w-[22ch] text-balance font-display text-[clamp(2.3rem,4.6vw,3.6rem)] leading-[1.04]">{title}</h1>
          <div className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-mist">{intro}</div>
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
        {aside}
      </div>
    </div>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  className,
  tone = 'plain',
}: {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: 'plain' | 'band';
}) {
  return (
    <section id={id} className={cn('scroll-mt-20', tone === 'band' && 'border-y border-rule bg-vault/30', className)}>
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:py-20">
        {eyebrow && <p className="text-[12px] font-medium tracking-[0.14em] text-brass uppercase">{eyebrow}</p>}
        <h2 className="mt-3 max-w-[30ch] text-balance font-display text-[clamp(1.8rem,3.2vw,2.5rem)] leading-tight">{title}</h2>
        {intro && <div className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-mist">{intro}</div>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function FeatureGrid({ items, columns = 3 }: { items: { icon?: React.ComponentType<{ className?: string }>; title: string; body: React.ReactNode }[]; columns?: 2 | 3 | 4 }) {
  return (
    <div className={cn('grid gap-x-8 gap-y-10 sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3', columns === 4 && 'lg:grid-cols-4')}>
      {items.map((it) => (
        <div key={it.title}>
          {it.icon && (
            <span className="flex size-10 items-center justify-center rounded-lg border border-rule-strong bg-vault/70 text-brass">
              <it.icon className="size-5" />
            </span>
          )}
          <h3 className={cn('text-[16px] font-semibold', it.icon && 'mt-4')}>{it.title}</h3>
          <div className="mt-1.5 text-[14px] leading-relaxed text-mist">{it.body}</div>
        </div>
      ))}
    </div>
  );
}

export function Steps({ steps }: { steps: { title: string; body: React.ReactNode }[] }) {
  return (
    <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-xl border border-rule bg-vault/50 p-5">
          <span className="tabular font-display text-[34px] leading-none text-brass">{String(i + 1).padStart(2, '0')}</span>
          <h3 className="mt-4 text-[16px] font-semibold">{s.title}</h3>
          <div className="mt-1.5 text-[14px] leading-relaxed text-mist">{s.body}</div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Numbered accordion (native details/summary: works without JavaScript and is
 * searchable with Ctrl+F). The first item starts open.
 */
export function FaqList({ items, className, openFirst = true }: { items: { q: string; a: React.ReactNode }[]; className?: string; openFirst?: boolean }) {
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((f, i) => (
        <details key={f.q} open={openFirst && i === 0} className="group rounded-2xl border border-rule bg-vault/70 px-5 transition-colors open:bg-vault-raised/80 sm:px-8">
          <summary className="flex cursor-pointer list-none items-center gap-5 py-5 sm:py-6 [&::-webkit-details-marker]:hidden">
            <span className="tabular w-6 shrink-0 text-[15px] font-semibold text-mist">{i + 1}</span>
            <span className="flex-1 text-[16px] font-semibold sm:text-[18px]">{f.q}</span>
            <Plus className="size-5 shrink-0 text-mist group-open:hidden" />
            <Minus className="hidden size-5 shrink-0 text-foreground group-open:block" />
          </summary>
          <div className="pb-6 pl-11 text-[15px] leading-relaxed text-mist">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({ title, body, primary = { href: '/register', label: 'Open account' }, secondary }: { title: string; body: string; primary?: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-brass/30 bg-[linear-gradient(110deg,var(--vault-raised)_0%,var(--vault)_55%,color-mix(in_oklab,var(--brass)_14%,var(--vault))_100%)] px-6 py-12 sm:px-12">
        <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-12 -bottom-20 size-80 text-brass/15">
          <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" />
          <circle cx="100" cy="100" r="44" fill="none" stroke="currentColor" />
        </svg>
        <div className="relative max-w-[60ch]">
          <h2 className="text-balance font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight">{title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-mist">{body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {primary.href === '/register' || primary.href === '/login' ? (
              <AuthButton href={primary.href}>
                {primary.label} <ArrowRight />
              </AuthButton>
            ) : (
              <Button asChild size="lg">
                <Link href={primary.href}>
                  {primary.label} <ArrowRight />
                </Link>
              </Button>
            )}
            {secondary &&
              (secondary.href === '/register' || secondary.href === '/login' ? (
                <AuthButton href={secondary.href} variant="outline" hideWhenSignedIn>
                  {secondary.label}
                </AuthButton>
              ) : (
                <Button asChild size="lg" variant="outline">
                  <Link href={secondary.href}>{secondary.label}</Link>
                </Button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Long-form text styling for articles and legal pages. */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'max-w-[70ch] text-[16px] leading-[1.75] text-foreground/90',
        '[&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:font-display [&_h2]:text-[28px] [&_h2]:leading-tight [&_h2]:text-foreground',
        '[&_h3]:mt-8 [&_h3]:text-[18px] [&_h3]:font-semibold [&_h3]:text-foreground',
        '[&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6',
        '[&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-brass [&_a]:underline-offset-4 hover:[&_a]:underline',
        '[&_blockquote]:mt-6 [&_blockquote]:border-l-2 [&_blockquote]:border-brass/60 [&_blockquote]:pl-4 [&_blockquote]:text-mist',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-rule bg-[#080f1b]">
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <p className="text-[14px] font-semibold">Contact</p>
            <ul className="mt-4 space-y-3 text-[13px] text-mist">
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 hover:text-foreground"><Mail className="size-4" /> Email support</a>
              </li>
              <li>
                <Link href="/dashboard" className="flex items-center gap-2 hover:text-foreground"><MessageCircle className="size-4" /> Live chat (log in)</Link>
              </li>
            </ul>
            <p className="mt-8 text-[14px] font-semibold">Preference</p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-mist">
              <li>Language: English</li>
              <li>Currency: USD-$</li>
              <li>Theme: Dark</li>
            </ul>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[14px] font-semibold">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-[13px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-mist transition-colors hover:text-foreground">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 border-t border-rule pt-6 text-[12px] leading-relaxed text-mist">
          <p className="max-w-[120ch]">
            <span className="font-semibold text-foreground/80">Risk warning:</span> digital asset prices can be volatile. The value of your holdings may go
            down as well as up and you may not get back the amount you deposit. Yields are variable, are not guaranteed and may be changed or paused at any
            time. Projections are illustrations, not promises. Nothing on this site is investment, tax or legal advice; you are responsible for your own
            decisions. {APP_NAME} will never ask for your password or recovery phrase. Read the full <Link href="/risk-disclosure" className="text-foreground/80 underline underline-offset-4">risk warning</Link>.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
            <span>&copy; {APP_NAME}</span>
            <a href={SITE_URL} className="hover:text-foreground">{SITE_HOST}</a>
            <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/legal/cookies" className="hover:text-foreground">Cookies</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
