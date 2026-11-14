export interface Announcement {
  date: string; // ISO date
  tag: 'Product' | 'Rates' | 'Markets' | 'Roadmap' | 'Security';
  title: string;
  body: string[];
  link?: { href: string; label: string };
}

/** Real platform updates, newest first. */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    date: '2026-11-01',
    tag: 'Product',
    title: 'Live chat support is now available in the client portal',
    body: [
      'Signed-in clients can now message our support team directly from their dashboard using the Live chat button. Replies appear in the same window, and a badge shows when there is a new message.',
      'Live chat is only available after you log in, so we can see which account you are asking about. Our team will never ask for your password in chat.',
    ],
    link: { href: '/support', label: 'Visit the support centre' },
  },
  {
    date: '2026-11-01',
    tag: 'Markets',
    title: 'Live prices and charts for 14 cryptocurrencies',
    body: [
      'Markets now covers Bitcoin, Ethereum, Tether, BNB, Solana, XRP, USD Coin, TRON, Cardano, Toncoin, Avalanche, Polygon, Cosmos and Arbitrum, each with its own page, full price history from 24 hours to one year, key facts and FAQs.',
      'Clients also get a Markets tab inside the portal and a projected-returns chart on their portfolio page.',
    ],
    link: { href: '/markets', label: 'Explore markets' },
  },
  {
    date: '2026-11-01',
    tag: 'Rates',
    title: 'Starting yield rates published',
    body: [
      'Our starting rates are 9.5% a year on USDT, 4% a year on ETH and 2.5% a year on BTC, paid daily and compounded. Rates are variable and may change; the live rate is always shown on the Earn page.',
    ],
    link: { href: '/earn', label: 'See current rates' },
  },
  {
    date: '2026-10-31',
    tag: 'Product',
    title: 'BitInvest Capital opens: BTC, ETH and USDT deposits',
    body: [
      'Accounts can now receive Bitcoin, Ether and Tether (ERC-20) deposits, and invest from their dashboard to earn a variable return.',
      'The referral programme launches at the same time: invite friends with your personal link and earn a share of their deposits and yield.',
    ],
    link: { href: '/buy-crypto', label: 'How to fund your account' },
  },
  {
    date: '2026-10-31',
    tag: 'Security',
    title: 'How we protect deposits',
    body: [
      'Our servers hold only watch-only keys, every deposit notice is cryptographically verified, and manual balance changes require two administrators. The full details are on our Security page.',
    ],
    link: { href: '/security', label: 'Read about security' },
  },
  {
    date: '2026-10-31',
    tag: 'Roadmap',
    title: 'Coming next: deposits on more blockchains',
    body: [
      'We are connecting BNB Smart Chain (including BEP-20 tokens), TRON, Solana, Polygon, Cardano, XRP Ledger, Avalanche, Cosmos Hub, TON and Arbitrum, along with selected ERC-20 tokens. Each network will be announced here before deposits open.',
      'Until a network is listed on your deposit screen, please do not send funds on it.',
    ],
    link: { href: '/markets', label: 'See network status' },
  },
];
