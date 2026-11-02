import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/legal-page';
import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = { title: 'Cookie notice', description: `The cookies ${APP_NAME} uses and why.` };

const TOC = [
  { id: 'what', label: 'What cookies are' },
  { id: 'ours', label: 'The cookie we use' },
  { id: 'not', label: 'What we don’t use' },
  { id: 'control', label: 'Controlling cookies' },
];

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie notice." intro="We keep cookies to the minimum: one essential cookie that keeps you signed in. No advertising or tracking cookies." updated="1 November 2026" toc={TOC}>
      <h2 id="what">1. What cookies are</h2>
      <p>Cookies are small files a website stores in your browser so it can remember information between page loads, such as whether you are signed in.</p>
      <h2 id="ours">2. The cookie we use</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-rule">
        <table className="w-full min-w-[520px] text-[14px]">
          <thead className="bg-vault/70 text-[12px] text-mist"><tr><th className="px-4 py-3 text-left font-medium">Name</th><th className="px-4 py-3 text-left font-medium">Purpose</th><th className="px-4 py-3 text-left font-medium">Lasts</th></tr></thead>
          <tbody>
            <tr className="border-t border-rule">
              <td className="px-4 py-3 font-mono text-[13px]">__Host-bic_session</td>
              <td className="px-4 py-3 text-mist">Keeps you signed in. It is HTTP-only, so page scripts cannot read it, and it is only sent over encrypted connections.</td>
              <td className="px-4 py-3 text-mist">Until you sign out, or one hour</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Because this cookie is strictly necessary to provide the account you asked for, it doesn’t require consent.</p>
      <h2 id="not">3. What we don’t use</h2>
      <ul>
        <li>No advertising or retargeting cookies.</li>
        <li>No third-party analytics or social media trackers.</li>
      </ul>
      <p>If that ever changes, we will update this notice and ask for your consent first where required.</p>
      <h2 id="control">4. Controlling cookies</h2>
      <p>You can delete cookies in your browser settings at any time. If you block the session cookie you won’t be able to sign in. See also our <Link href="/legal/privacy">privacy notice</Link>.</p>
    </LegalPage>
  );
}
