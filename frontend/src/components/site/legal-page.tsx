import { PageHero, Prose } from '@/components/site/blocks';

/** Shared layout for legal documents: title, last-updated date, contents list and body. */
export function LegalPage({ title, intro, updated, toc, children }: { title: string; intro: string; updated: string; toc: { id: string; label: string }[]; children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} intro={<>{intro}<span className="mt-3 block text-[13px]">Last updated: {updated}</span></>} />
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_260px]">
        <Prose>{children}</Prose>
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-rule bg-vault/50 p-5">
            <p className="text-[12px] font-medium tracking-[0.12em] text-mist uppercase">Contents</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] text-mist">
              {toc.map((t) => <li key={t.id}><a href={`#${t.id}`} className="hover:text-foreground">{t.label}</a></li>)}
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
