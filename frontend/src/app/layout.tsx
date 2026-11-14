import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/ibm-plex-sans';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/ibm-plex-mono/400.css';
import './globals.css';
import { Providers } from './providers';
import { APP_NAME, SITE_URL } from '@/lib/brand';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: `${APP_NAME}: hold, allocate and earn yield on BTC, ETH and USDT.`,
  openGraph: { type: 'website', siteName: APP_NAME, url: SITE_URL, title: APP_NAME },
  formatDetection: { email: false, telephone: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#0a1220',
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Applies the saved light/dark choice before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
