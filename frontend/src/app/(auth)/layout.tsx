import { SiteFooter } from '@/components/site-footer';
import { Wordmark } from '@/components/wordmark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
        <Wordmark href="/" />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-[8vh] pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
