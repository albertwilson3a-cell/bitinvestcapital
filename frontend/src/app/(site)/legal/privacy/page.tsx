import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/legal-page';
import { APP_NAME, SUPPORT_EMAIL } from '@/lib/brand';

export const metadata: Metadata = { title: 'Privacy notice', description: `What personal data ${APP_NAME} collects, why, and your rights.` };

const TOC = [
  { id: 'summary', label: 'Summary' },
  { id: 'collect', label: 'What we collect' },
  { id: 'why', label: 'Why we use it' },
  { id: 'sharing', label: 'Who we share it with' },
  { id: 'retention', label: 'How long we keep it' },
  { id: 'security', label: 'How we protect it' },
  { id: 'rights', label: 'Your rights' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'contact', label: 'Contact' },
];

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice." intro="We collect only what we need to run your account securely, and we never sell your personal data." updated="1 November 2026" toc={TOC}>
      <h2 id="summary">1. Summary</h2>
      <ul>
        <li>We collect your email address, account activity and the information needed to process deposits and yield.</li>
        <li>We use it to provide the service, keep it secure and meet legal obligations.</li>
        <li>We don’t sell your data or use advertising trackers.</li>
      </ul>
      <h2 id="collect">2. What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your email address and a one-way hash of your password (we never store the password itself).</li>
        <li><strong>Account activity:</strong> sign-in times, your investment choices, balances and transactions, including deposit addresses and blockchain transaction IDs.</li>
        <li><strong>Referral data:</strong> who referred you and whom you referred, and the rewards paid.</li>
        <li><strong>Support messages:</strong> what you send us through live chat or email.</li>
        <li><strong>Technical data:</strong> basic request information such as IP address, used for security and, for staff actions, our audit log.</li>
      </ul>
      <h2 id="why">3. Why we use it</h2>
      <ul>
        <li>To open and run your account, credit deposits and pay yield and rewards.</li>
        <li>To send essential emails, such as confirming your address.</li>
        <li>To prevent fraud and keep accounts secure.</li>
        <li>To answer your questions and handle complaints.</li>
        <li>To meet legal and regulatory obligations.</li>
      </ul>
      <h2 id="sharing">4. Who we share it with</h2>
      <p>We share data only with service providers who help us run the platform, such as our email delivery and hosting providers, under contracts that require them to protect it, and with authorities where the law requires. Blockchain transactions are public by nature; anyone can see transfers to and from a deposit address, though not who owns it.</p>
      <h2 id="retention">5. How long we keep it</h2>
      <p>We keep account and transaction records for as long as your account is open and afterwards for as long as the law requires for financial records. Support messages are kept with your account.</p>
      <h2 id="security">6. How we protect it</h2>
      <p>Passwords are stored as salted hashes, connections are encrypted, staff access is role-based and recorded, and sessions expire automatically. See <Link href="/security">Security</Link> for more.</p>
      <h2 id="rights">7. Your rights</h2>
      <p>Depending on where you live, you may have the right to access, correct or delete your personal data, to object to or restrict how we use it, and to receive a copy. Some records must be kept by law even if you close your account. To make a request, email us from your account’s email address.</p>
      <h2 id="cookies">8. Cookies</h2>
      <p>We use a single essential cookie to keep you signed in. Details are in our <Link href="/legal/cookies">cookie notice</Link>.</p>
      <h2 id="contact">9. Contact</h2>
      <p>Questions about privacy: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. {APP_NAME} is responsible for the personal data described in this notice.</p>
    </LegalPage>
  );
}
