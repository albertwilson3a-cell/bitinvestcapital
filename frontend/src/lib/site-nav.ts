/** Header menus and footer columns. Every link points to a real page on the site. */

export interface NavLink {
  href: string;
  label: string;
  description?: string;
}

export interface NavMenu {
  label: string;
  href?: string;
  items?: NavLink[];
}

export const HEADER_MENUS: NavMenu[] = [
  { label: 'Buy Crypto', href: '/buy-crypto' },
  {
    label: 'Markets',
    items: [
      { href: '/markets', label: 'Markets overview', description: 'Live prices, charts and data for 14 coins' },
      { href: '/markets/history', label: 'Historical market data', description: 'One-year performance of every coin' },
      { href: '/markets/btc', label: 'Bitcoin price', description: 'BTC chart, profile and key facts' },
      { href: '/markets/eth', label: 'Ethereum price', description: 'ETH chart, profile and key facts' },
      { href: '/markets/sol', label: 'Solana price', description: 'SOL chart, profile and key facts' },
      { href: '/markets/xrp', label: 'XRP price', description: 'XRP chart, profile and key facts' },
    ],
  },
  {
    label: 'Earn',
    items: [
      { href: '/earn', label: 'Earn overview', description: 'Current rates and the yield calculator' },
      { href: '/earn/usdt', label: 'USDT Earn', description: 'Yield on the dollar stablecoin' },
      { href: '/earn/btc', label: 'BTC Earn', description: 'Yield paid in bitcoin' },
      { href: '/earn/eth', label: 'ETH Earn', description: 'Yield paid in ether' },
      { href: '/referral', label: 'Referral programme', description: 'Rewards when friends deposit and earn' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { href: '/learn', label: 'Learning centre', description: 'Plain-English crypto guides' },
      { href: '/learn/what-is-bitcoin', label: 'What is Bitcoin?', description: 'The first cryptocurrency, explained' },
      { href: '/learn/how-to-read-crypto-charts', label: 'Reading price charts', description: 'Ranges, trends and volume' },
      { href: '/buy/btc', label: 'How to buy Bitcoin', description: 'Step-by-step guide' },
      { href: '/learn/glossary', label: 'Glossary', description: 'Crypto terms, explained' },
    ],
  },
  {
    label: 'Company',
    items: [
      { href: '/about', label: 'About us', description: 'Who we are and how we work' },
      { href: '/security', label: 'Security', description: 'How deposits and accounts are protected' },
      { href: '/announcements', label: 'Announcements', description: 'Platform news and updates' },
      { href: '/fees', label: 'Fees', description: 'What we charge, and what we don’t' },
      { href: '/risk-disclosure', label: 'Risk warning', description: 'Read before you deposit' },
    ],
  },
  {
    label: 'Support',
    items: [
      { href: '/support', label: 'Support centre', description: 'Contact options and help topics' },
      { href: '/faq', label: 'FAQ', description: 'Answers to common questions' },
      { href: '/dashboard', label: 'Live chat', description: 'Chat with our team (log in first)' },
      { href: '/complaints', label: 'Raise a complaint', description: 'How we handle complaints' },
    ],
  },
];

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: 'About Us',
    links: [
      { href: '/about', label: 'About' },
      { href: '/announcements', label: 'Announcements' },
      { href: '/security', label: 'Security' },
      { href: '/legal/terms', label: 'Terms of use' },
      { href: '/legal/privacy', label: 'Privacy notice' },
      { href: '/legal/cookies', label: 'Cookie notice' },
      { href: '/risk-disclosure', label: 'Risk warning' },
    ],
  },
  {
    title: 'Products',
    links: [
      { href: '/earn', label: 'Earn' },
      { href: '/markets', label: 'Markets' },
      { href: '/buy-crypto', label: 'Buy crypto' },
      { href: '/referral', label: 'Referral programme' },
      { href: '/dashboard', label: 'Client portfolio' },
      { href: '/dashboard/markets', label: 'Portfolio charts' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { href: '/learn', label: 'Learning centre' },
      { href: '/markets', label: 'Browse crypto prices' },
      { href: '/markets/btc', label: 'Bitcoin price' },
      { href: '/markets/eth', label: 'Ethereum price' },
      { href: '/buy/btc', label: 'How to buy Bitcoin' },
      { href: '/buy/eth', label: 'How to buy Ethereum' },
      { href: '/buy/bnb', label: 'How to buy BNB' },
      { href: '/buy/xrp', label: 'How to buy XRP' },
      { href: '/buy/sol', label: 'How to buy Solana' },
      { href: '/learn/glossary', label: 'Glossary' },
    ],
  },
  {
    title: 'Service',
    links: [
      { href: '/referral', label: 'Referral' },
      { href: '/fees', label: 'Fees' },
      { href: '/markets/history', label: 'Historical market data' },
      { href: '/earn/usdt', label: 'USDT Earn' },
      { href: '/earn/btc', label: 'BTC Earn' },
      { href: '/earn/eth', label: 'ETH Earn' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/dashboard', label: 'Live chat (clients)' },
      { href: '/support', label: 'Support centre' },
      { href: '/faq', label: 'FAQ' },
      { href: '/support#feedback', label: 'Product feedback' },
      { href: '/complaints', label: 'How to raise a complaint' },
    ],
  },
];
