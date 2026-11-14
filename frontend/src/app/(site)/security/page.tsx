import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Ban, Clock4, Cookie, DatabaseZap, Eye, FileCheck2, KeyRound, Lock, MailCheck, ScrollText, ShieldCheck, UserCog, UsersRound } from 'lucide-react';
import { CtaBand, FaqList, FeatureGrid, PageHero, Section } from '@/components/site/blocks';
import { SUPPORT_EMAIL } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Security: how we protect deposits and accounts',
  description: 'Watch-only deposit keys, cryptographically verified deposits, two-person approval for balance changes, a permanent audit trail and secure sign-in.',
};

const FLOW = [
  { icon: KeyRound, title: 'You report it', body: 'After sending, you report the transaction hash from your dashboard. A transaction can be claimed by only one account, so nobody else can take credit for it.' },
  { icon: Clock4, title: 'Network confirms', body: 'We wait for the required confirmations (3 on Bitcoin, 12 on Ethereum) before a deposit is treated as final.' },
  { icon: FileCheck2, title: 'Checked on-chain', body: 'Our team checks the transaction on the blockchain: the right network, our address, the amount received and the sender. Only the amount that actually arrived is credited.' },
  { icon: DatabaseZap, title: 'Credited exactly once', body: 'Each on-chain transfer can be credited only once, inside a single database transaction. Balances can never go below zero.' },
];

const SECURITY_FAQ = [
  { q: 'Who holds the private keys?', a: 'The keys that can move funds are kept in a separate custody setup, never on the servers that run the website. Those servers only hold public (watch-only) keys, which can create addresses but cannot sign transactions.' },
  { q: 'Can a BitInvest Capital employee change my balance?', a: 'Not alone. Manual adjustments must be requested by one administrator and approved by a different one, and both steps are recorded permanently in the audit log. No administrator can approve an adjustment to their own account.' },
  { q: 'What happens if someone sends a fake deposit notice?', a: 'It is rejected. Every notice must be signed with a secret shared only with our blockchain data provider, carry a recent timestamp and refer to an address we issued. Rejected notices change nothing.' },
  { q: 'How is my password stored?', a: 'Only as a one-way bcrypt hash with a unique salt. We cannot see your password, and nobody at BitInvest Capital will ever ask you for it.' },
  { q: 'How long do sessions last?', a: 'Sessions expire after one hour. Your session is stored in a secure, HTTP-only cookie that page scripts cannot read.' },
  { q: 'How do I report a security issue?', a: `Email ${SUPPORT_EMAIL} with “Security” in the subject. Please give us reasonable time to fix an issue before disclosing it publicly.` },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security"
        title="Security that’s designed in, not added on."
        intro="Protecting client money is about more than strong passwords. It is about making sure no single mistake, compromised server or individual can move funds or change balances. Here is how BitInvest Capital is built to do that."
      />

      <Section eyebrow="Deposits" title="What happens to every deposit." intro="Four independent checks stand between a transfer on the blockchain and a change to your balance.">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-rule bg-vault/50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg border border-rule-strong bg-ink/60 text-brass"><s.icon className="size-5" /></span>
                <span className="tabular text-[12px] text-mist">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-[16px] font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-mist">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="band" eyebrow="Platform controls" title="Checks on our own team.">
        <FeatureGrid
          items={[
            { icon: UsersRound, title: 'Two-person approval', body: 'Manual balance adjustments need one administrator to request and a different one to approve. Self-approval is blocked at the database level.' },
            { icon: ScrollText, title: 'Append-only audit log', body: 'Administrative actions are recorded in a log that the database refuses to edit or delete.' },
            { icon: UserCog, title: 'Role-based access', body: 'The admin console is available only to accounts with the administrator role, checked on every request.' },
            { icon: Ban, title: 'No negative balances', body: 'Database rules make it impossible for any balance, or any transaction amount, to go below zero.' },
            { icon: Eye, title: 'Every change recorded', body: 'Changes to yield rates and platform settings are stored with who made them and when. Old values are never overwritten.' },
            { icon: BadgeCheck, title: 'Tested end to end', body: 'Deposits, referral rewards and yield payouts are covered by automated tests that run against a real database.' },
          ]}
        />
      </Section>

      <Section eyebrow="Your account" title="How we protect your sign-in.">
        <FeatureGrid
          items={[
            { icon: Lock, title: 'Hashed passwords', body: 'Passwords are stored only as salted bcrypt hashes. We can’t read them.' },
            { icon: MailCheck, title: 'Email code at every sign-in', body: 'After your password, every sign-in is confirmed with a 6-digit code sent to your email. Codes expire quickly and lock after five wrong tries.' },
            { icon: BadgeCheck, title: 'Reviewed withdrawals', body: 'Withdrawals are confirmed with an emailed code, then reviewed and released manually by our team. Changing your password signs out every other session.' },
            { icon: Cookie, title: 'Secure sessions', body: 'Your session lives in an HTTP-only cookie that page scripts can’t read, and expires after an hour.' },
            { icon: ShieldCheck, title: 'Encrypted connections', body: 'All traffic to bitinvestcapital.com is encrypted, and our API only accepts browser requests from our own domains.' },
          ]}
        />
      </Section>

      <Section tone="band" eyebrow="Your part" title="Five habits that stop most attacks.">
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {[
            'Use a unique password you don’t use anywhere else.',
            'Turn on two-step verification for your email account.',
            'Type our address or use a bookmark instead of clicking links in messages.',
            'Check the first and last characters of every address you paste.',
            'Never share your password or any recovery phrase. We will never ask.',
          ].map((t, i) => (
            <li key={t} className="rounded-xl border border-rule bg-vault/50 p-5 text-[14px] leading-relaxed">
              <span className="tabular block font-display text-[28px] leading-none text-brass">{i + 1}</span>
              <span className="mt-3 block text-mist">{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[14px] text-mist">
          Read the full guide: <Link href="/learn/keeping-your-account-secure" className="text-brass underline-offset-4 hover:underline">Keeping your account secure</Link>.
        </p>
      </Section>

      <Section eyebrow="FAQ" title="Security questions.">
        <FaqList items={SECURITY_FAQ} />
      </Section>

      <CtaBand title="Questions about security?" body={`Our team is happy to explain how your assets are protected. Email ${SUPPORT_EMAIL}.`} primary={{ href: '/register', label: 'Open account' }} secondary={{ href: '/faq', label: 'Read the FAQ' }} />
    </>
  );
}
