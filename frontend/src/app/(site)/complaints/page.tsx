import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand, FaqList, PageHero, Prose, Section, Steps } from '@/components/site/blocks';
import { SUPPORT_EMAIL } from '@/lib/brand';

export const metadata: Metadata = { title: 'How to raise a complaint', description: 'How to make a complaint to BitInvest Capital, what to include and what happens next.' };

export default function ComplaintsPage() {
  return (
    <>
      <PageHero eyebrow="Support" title="How to raise a complaint." intro="If something has gone wrong, we want to put it right. Here’s how to tell us, and what to expect." />
      <Section eyebrow="The process" title="Four steps to resolution.">
        <Steps
          steps={[
            { title: 'Talk to support', body: 'Most issues are solved fastest through live chat in your portal or by email. Tell us what happened and what you’d like us to do.' },
            { title: 'Make a formal complaint', body: `If you’re not satisfied, email ${SUPPORT_EMAIL} with “Complaint” in the subject line.` },
            { title: 'We acknowledge it', body: 'We’ll confirm we have received your complaint, give you a reference and tell you who is handling it.' },
            { title: 'Investigation and response', body: 'We’ll investigate, keep you updated, and send a written response explaining our findings and any action we’ll take.' },
          ]}
        />
      </Section>
      <Section tone="band" eyebrow="What to include" title="Help us resolve it quickly.">
        <Prose>
          <ul>
            <li>The email address on your account.</li>
            <li>What happened, and when (with dates and times if you can).</li>
            <li>For deposits: the asset, amount, network and transaction hash (TXID).</li>
            <li>Screenshots of any error messages.</li>
            <li>What you would like us to do to put things right.</li>
          </ul>
          <p>Please don’t send your password or recovery phrase. We will never need them.</p>
        </Prose>
      </Section>
      <Section eyebrow="Our commitment" title="How we handle complaints.">
        <Prose>
          <p>Every complaint is reviewed by someone who wasn’t involved in the original issue. We treat complaints fairly and confidentially, and we use them to improve our service.</p>
          <p>If you remain unhappy after our final response, you may be able to refer the matter to an independent body, depending on where you live. Our response will tell you about any options that apply.</p>
        </Prose>
      </Section>
      <Section tone="band" eyebrow="FAQ" title="Complaint questions.">
        <FaqList
          items={[
            { q: 'Is there a fee to complain?', a: 'No. Raising a complaint is always free.' },
            { q: 'Can someone complain on my behalf?', a: 'Yes, with your written permission. We’ll need to confirm it with you from your account’s email address.' },
            { q: 'Will complaining affect my account?', a: 'No. Your account and balances are not affected by raising a complaint.' },
          ]}
        />
        <p className="mt-6 text-[14px] text-mist">Looking for something else? Visit the <Link href="/support" className="text-brass underline-offset-4 hover:underline">support centre</Link>.</p>
      </Section>
      <CtaBand title="We’re here to help." body={`Email ${SUPPORT_EMAIL} or use live chat in your portal.`} primary={{ href: '/support', label: 'Support centre' }} />
    </>
  );
}
