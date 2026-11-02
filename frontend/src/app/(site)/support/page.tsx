import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDownToLine, BookOpen, CircleHelp, Gift, Lightbulb, Mail, MessageCircle, Percent, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react';
import { CtaBand, FaqList, PageHero, Section } from '@/components/site/blocks';
import { Button } from '@/components/ui/button';
import { SUPPORT_EMAIL } from '@/lib/brand';

export const metadata: Metadata = { title: 'Support centre', description: 'Get help with your BitInvest Capital account: live chat, email, help topics, feedback and security reports.' };

const CHANNELS = [
  { icon: MessageCircle, title: 'Live chat', body: 'The fastest way to reach us. Log in and press the Live chat button at the bottom right of your dashboard.', action: { href: '/dashboard', label: 'Open your dashboard' } },
  { icon: Mail, title: 'Email', body: `Write to ${SUPPORT_EMAIL} from the email address on your account so we can find it quickly.`, action: { href: `mailto:${SUPPORT_EMAIL}`, label: 'Send an email' } },
  { icon: CircleHelp, title: 'FAQ', body: 'Answers to the questions we’re asked most, grouped by topic.', action: { href: '/faq', label: 'Browse the FAQ' } },
  { icon: BookOpen, title: 'Learning centre', body: 'Step-by-step guides on deposits, networks, earning and security.', action: { href: '/learn', label: 'Read the guides' } },
];

const TOPICS = [
  { icon: ArrowDownToLine, title: 'Deposits', links: [{ href: '/buy-crypto', label: 'How to fund your account' }, { href: '/learn/networks-and-fees', label: 'Choosing the right network' }, { href: '/faq#deposits', label: 'Deposit FAQs' }] },
  { icon: Percent, title: 'Earning', links: [{ href: '/earn', label: 'How yield works' }, { href: '/earn/usdt', label: 'USDT Earn' }, { href: '/faq#earning', label: 'Earning FAQs' }] },
  { icon: UserRound, title: 'Your account', links: [{ href: '/register', label: 'Open an account' }, { href: '/login', label: 'Sign in or resend confirmation' }, { href: '/faq#account', label: 'Account FAQs' }] },
  { icon: ShieldCheck, title: 'Security', links: [{ href: '/security', label: 'How we protect you' }, { href: '/learn/keeping-your-account-secure', label: 'Account security checklist' }, { href: '/faq#security', label: 'Security FAQs' }] },
  { icon: Gift, title: 'Referrals', links: [{ href: '/referral', label: 'Referral programme' }, { href: '/faq#referral', label: 'Referral FAQs' }] },
  { icon: BookOpen, title: 'Markets', links: [{ href: '/markets', label: 'Live prices' }, { href: '/markets/history', label: 'Historical data' }, { href: '/learn/how-to-read-crypto-charts', label: 'Reading charts' }] },
];

const SUPPORT_FAQ = [
  { q: 'How quickly will you reply?', a: 'Live chat is usually the fastest. We reply to every message as soon as a team member is available, and you’ll see a badge on the chat button when we do.' },
  { q: 'What should I include when asking about a deposit?', a: 'The asset, the amount, the network you sent on and the transaction hash (TXID) from the wallet or exchange you sent from.' },
  { q: 'Will support ever ask for my password?', a: 'Never. We will also never ask for a recovery phrase, ask you to install remote-access software, or ask you to send crypto to “verify” your account.' },
  { q: 'Can I get support without an account?', a: `Yes, by email at ${SUPPORT_EMAIL}. Live chat is for signed-in clients so we can see which account you are asking about.` },
];

export default function SupportPage() {
  return (
    <>
      <PageHero eyebrow="Support" title="How can we help?" intro="Find answers in our guides and FAQ, or talk to our team through live chat in your portal or by email.">
        <Button asChild size="lg"><Link href="/dashboard"><MessageCircle /> Live chat (log in)</Link></Button>
        <Button asChild size="lg" variant="outline"><a href={`mailto:${SUPPORT_EMAIL}`}><Mail /> Email us</a></Button>
      </PageHero>
      <Section eyebrow="Contact" title="Ways to reach us.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((c) => (
            <div key={c.title} className="flex flex-col rounded-2xl border border-rule bg-vault/60 p-6">
              <span className="flex size-10 items-center justify-center rounded-lg border border-rule-strong bg-ink/60 text-brass"><c.icon className="size-5" /></span>
              <h3 className="mt-4 text-[17px] font-semibold">{c.title}</h3>
              <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-mist">{c.body}</p>
              <Link href={c.action.href} className="mt-4 text-[14px] text-brass hover:underline hover:underline-offset-4">{c.action.label} →</Link>
            </div>
          ))}
        </div>
      </Section>
      <Section tone="band" eyebrow="Help topics" title="Browse by topic.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => (
            <div key={t.title} className="rounded-2xl border border-rule bg-vault/60 p-6">
              <p className="flex items-center gap-2.5 text-[16px] font-semibold"><t.icon className="size-5 text-brass" /> {t.title}</p>
              <ul className="mt-4 space-y-2 text-[14px]">
                {t.links.map((l) => <li key={l.href}><Link href={l.href} className="text-mist hover:text-foreground">{l.label} →</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <Section id="feedback" eyebrow="Feedback" title="Help us improve.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-rule bg-vault/60 p-6">
            <p className="flex items-center gap-2.5 text-[16px] font-semibold"><Lightbulb className="size-5 text-brass" /> Product feedback and suggestions</p>
            <p className="mt-2 text-[14px] leading-relaxed text-mist">Tell us what you’d like to see next, such as new coins, networks or features, or what could work better. Every suggestion is read by the team.</p>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Product%20feedback`} className="mt-4 inline-block text-[14px] text-brass hover:underline hover:underline-offset-4">Send feedback →</a>
          </div>
          <div className="rounded-2xl border border-rule bg-vault/60 p-6">
            <p className="flex items-center gap-2.5 text-[16px] font-semibold"><ShieldAlert className="size-5 text-brass" /> Report a security issue</p>
            <p className="mt-2 text-[14px] leading-relaxed text-mist">Found a vulnerability or a suspicious website pretending to be us? Email us with “Security” in the subject. Please give us reasonable time to fix issues before disclosing them.</p>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Security`} className="mt-4 inline-block text-[14px] text-brass hover:underline hover:underline-offset-4">Report an issue →</a>
          </div>
        </div>
        <p className="mt-6 text-[14px] text-mist">Not happy with how something was handled? See <Link href="/complaints" className="text-brass underline-offset-4 hover:underline">how to raise a complaint</Link>.</p>
      </Section>
      <Section tone="band" eyebrow="FAQ" title="Questions about support.">
        <FaqList items={SUPPORT_FAQ} />
      </Section>
      <CtaBand title="Already a client?" body="Log in and use live chat for the fastest answers about your account." primary={{ href: '/login', label: 'Log In' }} secondary={{ href: '/register', label: 'Sign Up' }} />
    </>
  );
}
