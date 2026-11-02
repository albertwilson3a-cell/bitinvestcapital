import type { Metadata } from 'next';
import { PageHero, Prose } from '@/components/site/blocks';
import { APP_NAME, SUPPORT_EMAIL } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Risk disclosure',
  description: `The main risks of holding digital assets and earning yield with ${APP_NAME}.`,
};

export default function RiskPage() {
  return (
    <>
      <PageHero
        eyebrow="Important information"
        title="Risk disclosure."
        intro="Please read this page before you deposit. It explains, in plain language, the main risks of holding digital assets and earning yield with us."
      />
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        <Prose>
          <h2 id="summary">In summary</h2>
          <p>
            Digital assets are high-risk. Their prices can fall sharply and quickly, yields are variable and not guaranteed, and you could lose some
            or all of the money you deposit. Only deposit money you can afford to lose. Nothing on our website is investment, tax or legal advice.
          </p>
          <h2 id="price">Price volatility</h2>
          <p>
            The value of cryptocurrencies such as Bitcoin and Ether can rise or fall by large amounts within hours. Large falls of 50% or more have
            happened several times. Yield paid in a volatile asset does not protect you from a fall in that asset’s price.
          </p>
          <h2 id="yield">Variable yield</h2>
          <ul>
            <li>All rates are variable. We may raise, lower or pause any rate at any time.</li>
            <li>Rates shown on our website, calculators and projections are illustrations, not promises of future returns.</li>
            <li>Past payouts are not a reliable indicator of future payouts.</li>
          </ul>
          <h2 id="stablecoins">Stablecoin risk</h2>
          <p>
            Stablecoins such as USDT depend on their issuer holding sufficient reserves and honouring redemptions. A stablecoin can lose its peg to the
            US dollar, and issuers can freeze tokens held at particular addresses.
          </p>
          <h2 id="custody">Custody and platform risk</h2>
          <p>
            When you deposit with {APP_NAME}, we hold assets on your behalf. Although we use the safeguards described on our Security page, no
            system is free of risk. Operational failures, cyber attacks, insolvency or legal action could affect your ability to access your assets.
            Digital assets held with us are not covered by bank deposit insurance.
          </p>
          <h2 id="transfers">Transfers are irreversible</h2>
          <p>
            Blockchain transactions cannot be reversed. Funds sent to the wrong address, on the wrong network, or without a required memo or tag may be
            permanently lost. Always use the details shown on your deposit screen.
          </p>
          <h2 id="regulation">Regulation and tax</h2>
          <p>
            The legal treatment of digital assets differs between countries and is changing. New rules could affect the services we can offer or the
            value of the assets themselves. You are responsible for understanding and meeting your own tax obligations.
          </p>
          <h2 id="scams">Fraud and scams</h2>
          <p>
            Be wary of anyone offering guaranteed or very high returns, asking for your password or recovery phrase, or pressuring you to act quickly,
            including people claiming to represent us. We will never contact you to offer guaranteed returns.
          </p>
          <h2 id="questions">Questions</h2>
          <p>
            If anything here is unclear, contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> before depositing.
          </p>
        </Prose>
      </div>
    </>
  );
}
