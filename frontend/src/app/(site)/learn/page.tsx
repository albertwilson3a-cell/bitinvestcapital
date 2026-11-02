import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { CtaBand, PageHero, Section } from '@/components/site/blocks';
import { ARTICLES, GLOSSARY, type Article } from '@/content/learn';

export const metadata: Metadata = {
  title: 'Learning centre: crypto guides',
  description: 'Plain-English guides to cryptocurrency, networks and fees, stablecoins, how yield works, account security and managing risk, plus a glossary.',
};

const CATEGORIES: Article['category'][] = ['Basics', 'Using crypto', 'Earning', 'Safety'];

function Card({ a }: { a: Article }) {
  return (
    <Link href={`/learn/${a.slug}`} className="group flex flex-col rounded-xl border border-rule bg-vault/50 p-6 transition-colors hover:border-rule-strong">
      <p className="flex items-center gap-2 text-[12px] text-brass"><BookOpen className="size-3.5" /> {a.category} · {a.minutes} min read</p>
      <h3 className="mt-3 text-[18px] leading-snug font-semibold group-hover:underline group-hover:underline-offset-4">{a.title}</h3>
      <p className="mt-2 flex-1 text-[14px] leading-relaxed text-mist">{a.summary}</p>
      <p className="mt-4 text-[13px] text-foreground/80">Read guide →</p>
    </Link>
  );
}

export default function LearnPage() {
  return (
    <>
      <PageHero
        eyebrow="Learning centre"
        title="Understand crypto before you invest in it."
        intro="Practical guides written in plain English: how blockchains work, how to send funds safely, what stablecoins are, where yield comes from and how to manage risk."
      />

      <Section eyebrow="Start here" title="A reading path for beginners." intro="New to crypto? These four guides, in order, cover what you need before your first deposit.">
        <ol className="grid gap-3 md:grid-cols-4">
          {['what-is-cryptocurrency', 'networks-and-fees', 'how-crypto-yield-works', 'keeping-your-account-secure'].map((slug, i) => {
            const a = ARTICLES.find((x) => x.slug === slug)!;
            return (
              <li key={slug}>
                <Link href={`/learn/${slug}`} className="group block h-full rounded-xl border border-rule bg-vault/50 p-5 hover:border-rule-strong">
                  <span className="tabular font-display text-[30px] leading-none text-brass">{i + 1}</span>
                  <p className="mt-3 text-[15px] leading-snug font-semibold group-hover:underline group-hover:underline-offset-4">{a.title}</p>
                  <p className="mt-1 text-[12px] text-mist">{a.minutes} min read</p>
                </Link>
              </li>
            );
          })}
        </ol>
      </Section>

      {CATEGORIES.map((cat, i) => {
        const list = ARTICLES.filter((a) => a.category === cat);
        if (!list.length) return null;
        return (
          <Section key={cat} tone={i % 2 === 0 ? 'band' : 'plain'} eyebrow="Guides" title={cat}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((a) => <Card key={a.slug} a={a} />)}
            </div>
          </Section>
        );
      })}

      <Section eyebrow="Glossary" title="Crypto terms, explained.">
        <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="border-b border-rule pb-5">
              <dt className="text-[15px] font-semibold">{g.term}</dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-mist">{g.def}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <CtaBand title="Ready when you are." body="Open an account to follow every market from your dashboard. You can explore before you deposit anything." secondary={{ href: '/markets', label: 'Explore markets' }} />
    </>
  );
}
