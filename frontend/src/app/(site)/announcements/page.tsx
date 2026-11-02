import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CtaBand, PageHero } from '@/components/site/blocks';
import { Badge } from '@/components/ui/badge';
import { ANNOUNCEMENTS } from '@/content/announcements';

export const metadata: Metadata = { title: 'Announcements', description: 'Product news, rate updates, new markets and roadmap updates from BitInvest Capital.' };

const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function AnnouncementsPage() {
  return (
    <>
      <PageHero eyebrow="Company" title="Announcements." intro="Product launches, rate changes, new markets and what we’re building next. Important changes are always posted here first." />
      <div className="mx-auto max-w-[900px] px-4 py-14 sm:px-6">
        <ol className="relative space-y-6 border-l border-rule pl-8">
          {ANNOUNCEMENTS.map((a) => (
            <li key={a.title} className="relative">
              <span aria-hidden="true" className="absolute top-2 -left-[37px] size-2.5 rounded-full bg-brass ring-4 ring-ink" />
              <article className="rounded-2xl border border-rule bg-vault/60 p-6">
                <p className="flex flex-wrap items-center gap-3 text-[12px] text-mist">
                  <time dateTime={a.date}>{fmt.format(new Date(a.date))}</time>
                  <Badge variant={a.tag === 'Roadmap' ? 'pending' : a.tag === 'Security' ? 'neutral' : 'success'}>{a.tag}</Badge>
                </p>
                <h2 className="mt-3 text-[20px] leading-snug font-semibold">{a.title}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-mist">
                  {a.body.map((p) => <p key={p}>{p}</p>)}
                </div>
                {a.link && (
                  <Link href={a.link.href} className="mt-4 inline-flex items-center gap-1.5 text-[14px] text-brass hover:underline hover:underline-offset-4">
                    {a.link.label} <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </article>
            </li>
          ))}
        </ol>
      </div>
      <CtaBand title="Be part of what’s next." body="Open an account to follow every market today and be ready when new networks open for deposits." />
    </>
  );
}
