import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand, PageHero } from '@/components/site/blocks';
import { GLOSSARY } from '@/content/learn';

export const metadata: Metadata = {
  title: 'Crypto glossary',
  description: 'Plain-English definitions of more than 40 cryptocurrency terms, from address and APY to validator and volatility.',
};

export default function GlossaryPage() {
  const terms = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  const letters = [...new Set(terms.map((t) => t.term[0].toUpperCase()))];
  return (
    <>
      <PageHero eyebrow="Learning centre" title="Crypto glossary." intro={`${terms.length} terms you’ll meet in crypto, explained in plain English. Jump to a letter or scroll through.`}>
        <nav aria-label="Letters" className="flex flex-wrap gap-1.5">
          {letters.map((l) => (
            <a key={l} href={`#letter-${l}`} className="flex size-9 items-center justify-center rounded-md border border-rule text-[14px] text-mist hover:border-rule-strong hover:text-foreground">{l}</a>
          ))}
        </nav>
      </PageHero>
      <div className="mx-auto max-w-[1200px] space-y-12 px-4 py-14 sm:px-6">
        {letters.map((l) => (
          <section key={l} id={`letter-${l}`} className="scroll-mt-24">
            <h2 className="font-display text-[40px] leading-none text-brass">{l}</h2>
            <dl className="mt-5 grid gap-x-10 gap-y-5 md:grid-cols-2">
              {terms.filter((t) => t.term[0].toUpperCase() === l).map((g) => (
                <div key={g.term} className="rounded-xl border border-rule bg-vault/50 p-5">
                  <dt className="text-[16px] font-semibold">{g.term}</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed text-mist">{g.def}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="text-[14px] text-mist">Want to go deeper? Browse the <Link href="/learn" className="text-brass underline-offset-4 hover:underline">learning centre</Link>.</p>
      </div>
      <CtaBand title="Put the words into practice." body="Open an account to follow every market and see these ideas in action on your own dashboard." />
    </>
  );
}
