import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { CtaBand, Prose } from '@/components/site/blocks';
import { ARTICLE_BY_SLUG, ARTICLES } from '@/content/learn';

/** Every coin/article is pre-rendered at build time, so waiting for params is instant in practice. */
export const instant = false;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<'/learn/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICLE_BY_SLUG[slug];
  return a ? { title: a.title, description: a.summary } : {};
}

export default async function ArticlePage({ params }: PageProps<'/learn/[slug]'>) {
  const { slug } = await params;
  const article = ARTICLE_BY_SLUG[slug];
  if (!article) notFound();
  const related = ARTICLES.filter((a) => a.slug !== slug).slice(0, 3);
  const { Body } = article;

  return (
    <>
      <div className="border-b border-rule/70 bg-[radial-gradient(ellipse_55%_80%_at_15%_0%,color-mix(in_oklab,var(--brass)_9%,transparent),transparent)]">
        <div className="mx-auto max-w-[1200px] px-4 pt-12 pb-10 sm:px-6 lg:pt-16">
          <nav aria-label="Breadcrumb" className="text-[13px] text-mist">
            <Link href="/learn" className="hover:text-foreground">Learning centre</Link> <span aria-hidden="true">/</span> <span>{article.category}</span>
          </nav>
          <h1 className="mt-5 max-w-[24ch] text-balance font-display text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]">{article.title}</h1>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-mist">{article.summary}</p>
          <p className="mt-5 flex items-center gap-2 text-[13px] text-brass"><BookOpen className="size-4" /> {article.minutes} min read</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_260px]">
        <article>
          <Prose>
            <Body />
          </Prose>
          <p className="mt-12 max-w-[70ch] border-t border-rule pt-6 text-[13px] text-mist">
            This guide is general information, not financial advice. Crypto assets are volatile and you can lose money.
          </p>
        </article>
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-rule bg-vault/50 p-5">
            <p className="text-[12px] font-medium tracking-[0.12em] text-mist uppercase">On this page</p>
            <ul className="mt-3 space-y-2 text-[13px]">
              {article.toc.map((t) => (
                <li key={t.id}><a href={`#${t.id}`} className="text-mist hover:text-foreground">{t.label}</a></li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="border-t border-rule bg-vault/30">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <h2 className="font-display text-[28px]">Keep reading</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {related.map((a) => (
              <Link key={a.slug} href={`/learn/${a.slug}`} className="group rounded-xl border border-rule bg-vault/50 p-5 hover:border-rule-strong">
                <p className="text-[12px] text-brass">{a.category} · {a.minutes} min</p>
                <p className="mt-2 text-[16px] leading-snug font-semibold group-hover:underline group-hover:underline-offset-4">{a.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <CtaBand title="Put what you’ve learned into practice." body="Open an account to follow live markets and set up your portfolio. Start small while you learn." />
    </>
  );
}
