import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/legal-page';
import { APP_NAME, SUPPORT_EMAIL } from '@/lib/brand';

export const metadata: Metadata = { title: 'Terms of use', description: `The terms that apply when you use ${APP_NAME}.` };

const TOC = [
  { id: 'about', label: 'About these terms' },
  { id: 'eligibility', label: 'Who can use the service' },
  { id: 'account', label: 'Your account' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'yield', label: 'Earn and yield' },
  { id: 'referral', label: 'Referral programme' },
  { id: 'prohibited', label: 'Things you must not do' },
  { id: 'risk', label: 'Risk' },
  { id: 'availability', label: 'Availability and changes' },
  { id: 'liability', label: 'Liability' },
  { id: 'closing', label: 'Closing your account' },
  { id: 'contact', label: 'Contact and complaints' },
];

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use." intro={`These terms explain the agreement between you and ${APP_NAME} when you open an account and use our website and services.`} updated="1 November 2026" toc={TOC}>
      <h2 id="about">1. About these terms</h2>
      <p>By opening an account or using our website you agree to these terms, our <Link href="/legal/privacy">privacy notice</Link> and our <Link href="/risk-disclosure">risk warning</Link>. Please read them carefully. If you don’t agree, don’t use the service.</p>
      <h2 id="eligibility">2. Who can use the service</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter into a binding agreement.</li>
        <li>You must not be located in, or a resident of, a place where using our services is prohibited by law.</li>
        <li>We may ask you to verify your identity and the source of your funds, and may refuse or close an account where we cannot.</li>
      </ul>
      <h2 id="account">3. Your account</h2>
      <ul>
        <li>You must give accurate information, confirm your email address and keep your contact details up to date.</li>
        <li>You are responsible for keeping your password secret and for activity on your account. Tell us immediately if you think someone else has accessed it.</li>
        <li>One person may hold one account. Accounts are personal and cannot be transferred.</li>
      </ul>
      <h2 id="deposits">4. Deposits</h2>
      <ul>
        <li>Each supported asset has a dedicated deposit address shown in your dashboard, together with the network it must be sent on.</li>
        <li>Deposits are credited after the number of network confirmations shown on the deposit screen.</li>
        <li>Assets sent on an unsupported network, to the wrong address, or without a required memo or tag may not be recoverable. We will try to help, but cannot guarantee recovery.</li>
        <li>We hold deposited assets on your behalf. Your balance in the dashboard is our record of what we owe you.</li>
      </ul>
      <h2 id="yield">5. Earn and yield</h2>
      <ul>
        <li>Assets you switch on in your allocation earn yield at the rate published on our <Link href="/earn">Earn page</Link> at the time of each payout.</li>
        <li>Rates are variable. We may change, pause or withdraw a rate at any time. Yield is not guaranteed.</li>
        <li>Yield is calculated on balances held for a full payout period, rounded down to the asset’s smallest unit, and credited in the same asset.</li>
        <li>Calculators and projections on our website are illustrations only.</li>
      </ul>
      <h2 id="referral">6. Referral programme</h2>
      <p>The <Link href="/referral">referral programme terms</Link> form part of these terms. Rewards obtained through self-referral, duplicate accounts or misleading promotion may be reversed.</p>
      <h2 id="prohibited">7. Things you must not do</h2>
      <ul>
        <li>Use the service for money laundering, terrorist financing, fraud, sanctions evasion or any other illegal purpose.</li>
        <li>Deposit assets that you do not own or that come from illegal activity.</li>
        <li>Attempt to access other people’s accounts, interfere with our systems or exploit errors.</li>
        <li>Promise others returns or make misleading statements about {APP_NAME}.</li>
      </ul>
      <h2 id="risk">8. Risk</h2>
      <p>Digital assets are high-risk and you may lose some or all of the value you deposit. Please read our full <Link href="/risk-disclosure">risk warning</Link>. We do not provide investment, tax or legal advice.</p>
      <h2 id="availability">9. Availability and changes</h2>
      <p>We aim to keep the service available at all times but may suspend it for maintenance, security or legal reasons. We may update these terms; material changes will be announced on our <Link href="/announcements">announcements page</Link> and, where appropriate, by email before they take effect.</p>
      <h2 id="liability">10. Liability</h2>
      <p>Nothing in these terms limits liability that cannot be limited by law. Otherwise, we are not responsible for losses caused by market movements, events outside our reasonable control, your failure to keep your account secure, or assets sent to incorrect addresses or networks.</p>
      <h2 id="closing">11. Closing your account</h2>
      <p>You can ask us to close your account at any time. We may close or restrict an account if you breach these terms or if we are required to by law. Where we close an account, we will return your assets unless the law prevents us.</p>
      <h2 id="contact">12. Contact and complaints</h2>
      <p>Questions about these terms can be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. If you are unhappy with our service, see <Link href="/complaints">how to raise a complaint</Link>.</p>
    </LegalPage>
  );
}
