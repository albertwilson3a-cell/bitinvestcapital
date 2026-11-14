import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand, FaqList, PageHero } from '@/components/site/blocks';
import { SUPPORT_EMAIL } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description: 'Answers about accounts, deposits, networks, earning yield, the referral programme, security and market data.',
};

const GROUPS: { id: string; title: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    id: 'account',
    title: 'Your account',
    items: [
      { q: 'How do I open an account?', a: 'Click “Open account”, enter your email and a password, then confirm your email using the link we send. The link works for 24 hours.' },
      { q: 'I didn’t receive the confirmation email.', a: 'Check your spam or promotions folder. On the sign-in page you can request a new link. If it still doesn’t arrive, contact support.' },
      { q: 'Can I change my email address?', a: `Contact ${SUPPORT_EMAIL} from your current email address and we’ll help you.` },
      { q: 'Why do I need a code every time I log in?', a: 'For your security, each sign-in is confirmed with a 6-digit code sent to your email, so a stolen password alone isn’t enough to access your account.' },
      { q: 'I forgot my password.', a: 'On the log-in page, choose “Forgot password?” and we’ll email you a link to set a new one. For your security, passwords must be typed (not pasted) and entered twice.' },
      { q: 'How do I sign out?', a: 'Use the sign-out button at the top right of your dashboard. Sessions also expire automatically after an hour.' },
    ],
  },
  {
    id: 'deposits',
    title: 'Deposits and networks',
    items: [
      { q: 'Which coins can I deposit?', a: 'BTC on the Bitcoin network, ETH on Ethereum, and USDT on Ethereum (ERC-20). Other coins on our markets page show “Deposits coming soon”.' },
      { q: 'How long until my deposit appears?', a: 'After you send, report the transaction from the Deposit button in your dashboard. Our team checks it on the blockchain (3 confirmations on Bitcoin, 12 on Ethereum) and credits it, usually within a few hours. You get an email when it is credited.' },
      { q: 'I sent USDT on TRON (TRC-20). What now?', a: `TRC-20 deposits are not yet supported, so they cannot be credited. Contact ${SUPPORT_EMAIL} with the transaction hash straight away.` },
      { q: 'Are there deposit fees?', a: 'We do not charge for deposits. The sending network charges its own transaction fee.' },
      { q: 'How do I withdraw?', a: 'In your dashboard, press Withdraw, enter the amount and your external address, and confirm with the code we email you. Our team reviews every withdrawal before releasing it and emails you the transaction link once sent.' },
      { q: 'Why do I need to report my deposit?', a: 'Our deposit addresses are shared by clients, so the blockchain alone does not tell us who sent a payment. Reporting the transaction hash lets us match it to your account. Each transaction can only be claimed once.' },
      { q: 'Is the deposit address always the same?', a: 'Yes, but always copy it from your dashboard before sending, rather than from an old message, and check the first and last characters after pasting.' },
    ],
  },
  {
    id: 'earning',
    title: 'Earning yield',
    items: [
      { q: 'How do I start earning?', a: <>Deposit to your wallet, then press Invest and choose an amount (from $50). See <Link href="/earn" className="text-brass">Earn</Link> for details.</> },
      { q: 'Are returns guaranteed?', a: 'No. All rates are variable and may change or be paused at any time.' },
      { q: 'When is yield paid?', a: 'Daily assets at 00:00 UTC, hourly assets on the hour. Each payout is listed in your activity.' },
      { q: 'Why is my first payout zero?', a: 'Yield is paid on balances held for the whole period. A deposit made during a period starts earning in the next one.' },
      { q: 'Does yield compound?', a: 'Yes. Each payout is added to your balance and earns in later periods.' },
    ],
  },
  {
    id: 'referral',
    title: 'Referral programme',
    items: [
      { q: 'How much can I earn?', a: <>A percentage of each deposit your friends make (in USDT) and a share of the yield they earn. Current rates are on the <Link href="/referral" className="text-brass">referral page</Link>.</> },
      { q: 'Where is my invite link?', a: 'On your dashboard, in the “Invite friends” card.' },
      { q: 'Do I earn from friends of friends?', a: 'No, only from people you invited directly.' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    items: [
      { q: 'Will you ever ask for my password?', a: 'Never, by any channel. Nor will we ask for a recovery phrase or ask you to send crypto to “verify” your account.' },
      { q: 'How are deposits protected?', a: <>Watch-only keys, signed and verified deposit notices, and credits that can only happen once. See <Link href="/security" className="text-brass">Security</Link>.</> },
      { q: 'I think my account was accessed by someone else.', a: `Change your password immediately and email ${SUPPORT_EMAIL} from your account’s email address.` },
    ],
  },
  {
    id: 'markets',
    title: 'Markets and data',
    items: [
      { q: 'Where do prices come from?', a: 'From CoinGecko, which aggregates data from hundreds of exchanges. Prices refresh automatically.' },
      { q: 'Why might a price differ from my exchange?', a: 'Each exchange has its own trades. Our prices are an average across many markets, so small differences are normal.' },
      { q: 'How are my balances valued in dollars?', a: 'BTC and ETH at the latest market price; USDT at $1.' },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Help"
        title="Frequently asked questions."
        intro={<>Can’t find what you need? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brass underline-offset-4 hover:underline">{SUPPORT_EMAIL}</a>.</>}
      >
        <nav aria-label="FAQ sections" className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="rounded-full border border-rule px-3 py-1.5 text-[13px] text-mist hover:border-rule-strong hover:text-foreground">{g.title}</a>
          ))}
        </nav>
      </PageHero>
      <div className="mx-auto max-w-[1200px] space-y-14 px-4 py-14 sm:px-6">
        {GROUPS.map((g) => (
          <section key={g.id} id={g.id} className="scroll-mt-20">
            <h2 className="font-display text-[30px]">{g.title}</h2>
            <FaqList items={g.items} className="mt-5" />
          </section>
        ))}
      </div>
      <CtaBand title="Still have a question?" body={`Write to ${SUPPORT_EMAIL} and a member of our team will get back to you.`} />
    </>
  );
}
