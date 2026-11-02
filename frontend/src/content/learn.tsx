import Link from 'next/link';

export interface Article {
  slug: string;
  title: string;
  summary: string;
  category: 'Basics' | 'Using crypto' | 'Earning' | 'Safety';
  minutes: number;
  toc: { id: string; label: string }[];
  Body: () => React.ReactNode;
}

export const ARTICLES: Article[] = [
  {
    slug: 'what-is-cryptocurrency',
    title: 'What is cryptocurrency? A plain-English guide',
    summary: 'Blockchains, coins, tokens and wallets explained without jargon, and why any of it matters.',
    category: 'Basics',
    minutes: 7,
    toc: [
      { id: 'money-without-a-middleman', label: 'Money without a middleman' },
      { id: 'how-a-blockchain-works', label: 'How a blockchain works' },
      { id: 'coins-and-tokens', label: 'Coins and tokens' },
      { id: 'wallets-and-keys', label: 'Wallets and keys' },
      { id: 'what-gives-crypto-value', label: 'What gives crypto value?' },
      { id: 'before-you-start', label: 'Before you start' },
    ],
    Body: () => (
      <>
        <p>
          Cryptocurrency is digital money that is recorded on a shared public ledger instead of in a single company’s database. Nobody needs
          permission to hold it or send it, transfers work 24 hours a day, and the rules for how new units are created are written into software
          that anyone can inspect. That combination is new, and it is why crypto has grown from an experiment in 2009 into a market worth trillions
          of dollars.
        </p>
        <h2 id="money-without-a-middleman">Money without a middleman</h2>
        <p>
          When you pay someone from your bank account, your bank and theirs update their own records and settle with each other later. You trust
          the banks to keep accurate books. A cryptocurrency replaces that trusted bookkeeper with a network of computers that each keep a copy of
          the same ledger and follow the same rules for adding to it. If one computer tries to cheat, the others reject its version.
        </p>
        <p>
          The result is a system where you can send value directly to anyone with an address, without an intermediary that could block, delay or
          reverse the payment. That last point cuts both ways: there is no “undo” button, and no customer service desk for the network itself.
        </p>
        <h2 id="how-a-blockchain-works">How a blockchain works</h2>
        <p>
          New transactions are collected into <strong>blocks</strong>. Each block contains a cryptographic fingerprint of the block before it, so
          the blocks form a chain. Changing an old transaction would change its block’s fingerprint, which would break every block after it, and
          the rest of the network would notice immediately.
        </p>
        <p>Networks decide who gets to add the next block in different ways:</p>
        <ul>
          <li>
            <strong>Proof of Work</strong> (Bitcoin): computers called miners compete to solve a puzzle. Winning requires real electricity and
            hardware, which makes attacking the network very expensive.
          </li>
          <li>
            <strong>Proof of Stake</strong> (Ethereum, Solana, Cardano and many others): validators lock up coins as a security deposit. Those who
            follow the rules earn rewards; those who cheat can lose part of their deposit.
          </li>
        </ul>
        <p>
          Each time a new block is added on top of the one containing your transaction, that is one more <strong>confirmation</strong>. More
          confirmations mean it is harder to reverse, which is why platforms wait for a set number before crediting a deposit.
        </p>
        <h2 id="coins-and-tokens">Coins and tokens</h2>
        <p>
          A <strong>coin</strong> is the native currency of a blockchain: BTC on Bitcoin, ETH on Ethereum, SOL on Solana. It pays the network’s fees
          and often secures it through mining or staking.
        </p>
        <p>
          A <strong>token</strong> is created by a smart contract running on someone else’s blockchain. USDT on Ethereum is a token; so are
          thousands of others that follow the ERC-20 standard. Tokens can represent dollars (stablecoins), voting rights, in-game items or almost
          anything else. Moving a token still costs a fee in the underlying coin, which is why you need a little ETH to send USDT on Ethereum.
        </p>
        <h2 id="wallets-and-keys">Wallets and keys</h2>
        <p>
          A wallet does not actually store coins; the coins live on the blockchain. What a wallet stores is a <strong>private key</strong>, the
          secret that proves you control an address and lets you sign transactions. Your <strong>address</strong> is derived from that key and is
          safe to share, like an account number.
        </p>
        <p>
          Many wallets show the private key as a <strong>recovery phrase</strong> of 12 or 24 words. Anyone who learns those words can take
          everything in the wallet. No legitimate company will ever ask for them. On a custodial platform such as BitInvest Capital, we manage the
          receiving addresses for you and you sign in with your email and password instead.
        </p>
        <h2 id="what-gives-crypto-value">What gives crypto value?</h2>
        <p>Prices are set by supply and demand in open markets. Demand comes from several places at once:</p>
        <ul>
          <li>Usefulness: paying network fees, moving money across borders, using decentralised apps.</li>
          <li>Scarcity: Bitcoin’s fixed 21 million supply is the clearest example.</li>
          <li>Security and track record: networks that have run reliably for years are trusted more.</li>
          <li>Speculation: many buyers simply expect prices to rise, which can push them far above or below any “fundamental” value.</li>
        </ul>
        <p>
          That last factor is why crypto prices can double or halve within months. Stablecoins are the exception: they are designed to track a
          currency like the US dollar.
        </p>
        <h2 id="before-you-start">Before you start</h2>
        <p>
          Only put in money you could afford to lose, start small while you learn how deposits and networks work, and keep your account secure. Our
          guides on <Link href="/learn/networks-and-fees">networks and fees</Link> and <Link href="/learn/keeping-your-account-secure">account
          security</Link> are good next reads.
        </p>
      </>
    ),
  },
  {
    slug: 'networks-and-fees',
    title: 'Networks, fees and confirmations: sending crypto to the right place',
    summary: 'Why the same coin can live on several networks, how to choose the right one, and what memos and tags are for.',
    category: 'Using crypto',
    minutes: 8,
    toc: [
      { id: 'one-coin-many-networks', label: 'One coin, many networks' },
      { id: 'choosing-the-network', label: 'Choosing the network' },
      { id: 'memos-and-tags', label: 'Memos and destination tags' },
      { id: 'fees', label: 'How fees work' },
      { id: 'confirmations', label: 'Confirmations and waiting times' },
      { id: 'checklist', label: 'A checklist before every transfer' },
    ],
    Body: () => (
      <>
        <p>
          The most common way people lose crypto is not hacking: it is sending funds on the wrong network or without a required memo. This guide
          explains how to avoid that, and what to expect after you press “send”.
        </p>
        <h2 id="one-coin-many-networks">One coin, many networks</h2>
        <p>
          Popular assets often exist on several blockchains at once. USDT, for example, is issued on Ethereum (as an ERC-20 token), on TRON
          (TRC-20), on BNB Smart Chain (BEP-20) and elsewhere. Each version lives on its own network. They have the same name and are worth the
          same, but they cannot see each other: USDT sent on TRON never appears on Ethereum.
        </p>
        <p>
          To make things more confusing, several networks use the same address format. Ethereum, BNB Smart Chain, Polygon, Avalanche C-Chain and
          Arbitrum addresses all start with <code>0x</code> and look identical. A wallet will happily let you send on any of them, even if the
          recipient only watches one.
        </p>
        <h2 id="choosing-the-network">Choosing the network</h2>
        <p>
          Always start from the receiving side. Your BitInvest Capital deposit screen shows the asset, the exact network we accept it on, and the
          address. Then, in the wallet or exchange you are sending from, choose that same network. Today we accept:
        </p>
        <ul>
          <li><strong>BTC</strong> on the Bitcoin network (addresses starting with bc1q).</li>
          <li><strong>ETH</strong> on Ethereum mainnet.</li>
          <li><strong>USDT</strong> on Ethereum as an ERC-20 token.</li>
        </ul>
        <p>
          More networks are being added; see the <Link href="/markets">markets page</Link> for each coin’s status. Until a network is listed on
          your deposit screen, do not send on it.
        </p>
        <h2 id="memos-and-tags">Memos and destination tags</h2>
        <p>
          Some networks are usually used with one shared address per platform, and a short code to identify the customer. XRP calls this a
          <strong> destination tag</strong>; TON, Cosmos and others call it a <strong>memo</strong> or comment. If a platform gives you a memo or
          tag, it is not optional. Leaving it out means the platform receives the funds but cannot tell who they belong to, and recovering them can
          take weeks or may not be possible.
        </p>
        <h2 id="fees">How fees work</h2>
        <p>
          Every transaction pays a fee to the network, not to us. Fees depend on how busy the network is and how much data your transaction uses,
          not on the amount you send. That is why sending $10 and $10,000 of bitcoin can cost the same.
        </p>
        <ul>
          <li><strong>Bitcoin:</strong> you choose a fee rate; higher fees confirm sooner when the network is busy.</li>
          <li><strong>Ethereum:</strong> fees are paid in ETH even when sending tokens such as USDT, so keep some ETH in the sending wallet.</li>
          <li><strong>Low-fee networks</strong> such as TRON, Solana, Polygon and Arbitrum usually cost cents or less.</li>
        </ul>
        <h2 id="confirmations">Confirmations and waiting times</h2>
        <p>
          A deposit appears as <em>pending</em> as soon as we see it, and is credited once it has enough confirmations to be considered final. We
          require 3 confirmations on Bitcoin (around 30 minutes) and 12 on Ethereum (a few minutes). If a transfer is taking longer, check its
          status in a block explorer using the transaction hash; your activity list links to one for every deposit.
        </p>
        <h2 id="checklist">A checklist before every transfer</h2>
        <ol>
          <li>Copy the address from your deposit screen; never type it by hand.</li>
          <li>Check the first and last few characters after pasting. Some malware swaps copied addresses.</li>
          <li>Choose the network shown on the deposit screen.</li>
          <li>Add the memo or tag if one is shown.</li>
          <li>For a large amount, send a small test first and wait for it to arrive.</li>
        </ol>
      </>
    ),
  },
  {
    slug: 'stablecoins-explained',
    title: 'Stablecoins explained: digital dollars and how they hold their value',
    summary: 'What USDT and USDC are, how they stay at $1, and the risks that still apply.',
    category: 'Basics',
    minutes: 6,
    toc: [
      { id: 'what-is-a-stablecoin', label: 'What is a stablecoin?' },
      { id: 'how-the-peg-works', label: 'How the $1 peg works' },
      { id: 'usdt-vs-usdc', label: 'USDT and USDC compared' },
      { id: 'why-people-use-them', label: 'Why people use them' },
      { id: 'risks', label: 'Risks to understand' },
    ],
    Body: () => (
      <>
        <p>
          Bitcoin and ether can rise or fall by double digits in a week. Stablecoins exist so that people can stay inside the crypto world without
          that volatility. They are the most used assets in crypto by transaction volume.
        </p>
        <h2 id="what-is-a-stablecoin">What is a stablecoin?</h2>
        <p>
          A stablecoin is a token designed to keep a steady price, usually one US dollar. The largest, Tether (USDT) and USD Coin (USDC), are
          issued by companies that hold reserves of cash and short-term government debt and promise to redeem tokens for dollars.
        </p>
        <h2 id="how-the-peg-works">How the $1 peg works</h2>
        <p>
          When a customer of the issuer sends in $1 million, the issuer creates 1 million new tokens. When someone redeems tokens, they are
          destroyed and dollars are paid out. Because large traders can always swap tokens for dollars at $1 directly with the issuer, any time the
          market price drifts away from $1 there is a profit to be made pulling it back. That arbitrage is what keeps the price close to the peg.
        </p>
        <h2 id="usdt-vs-usdc">USDT and USDC compared</h2>
        <ul>
          <li><strong>USDT</strong> (Tether) launched in 2014, is the largest stablecoin and is especially popular on TRON and Ethereum.</li>
          <li>
            <strong>USDC</strong> (Circle) launched in 2018 and publishes frequent reports on its reserves. It briefly fell below $1 in March 2023
            when part of its reserves was held at a failed US bank, and recovered within days.
          </li>
        </ul>
        <p>Many people hold both to avoid relying on a single issuer.</p>
        <h2 id="why-people-use-them">Why people use them</h2>
        <ul>
          <li>To park money between trades without converting back to a bank account.</li>
          <li>To send dollar value across borders quickly, at any hour.</li>
          <li>To earn yield. Stablecoins are in steady demand from borrowers, so they tend to earn more predictable rates than volatile coins.</li>
        </ul>
        <h2 id="risks">Risks to understand</h2>
        <p>
          A stablecoin is a promise from its issuer. If reserves were lost, frozen or mismanaged, the token could lose its peg. Issuers can also
          freeze tokens held at particular addresses, for example on a court order. And some “algorithmic” stablecoins that were not backed by
          real reserves have collapsed entirely; the best-known example lost almost all its value in 2022. We only work with fully reserved
          stablecoins, and we value USDT at $1 on your balance.
        </p>
      </>
    ),
  },
  {
    slug: 'how-crypto-yield-works',
    title: 'How crypto yield works, and why it is always variable',
    summary: 'Where yield comes from, APY versus APR, how compounding works, and the warning signs of a scheme that cannot last.',
    category: 'Earning',
    minutes: 9,
    toc: [
      { id: 'where-yield-comes-from', label: 'Where yield comes from' },
      { id: 'apy-and-apr', label: 'APY and APR' },
      { id: 'compounding', label: 'Compounding, step by step' },
      { id: 'how-we-calculate', label: 'How BitInvest Capital calculates yield' },
      { id: 'why-rates-change', label: 'Why rates change' },
      { id: 'red-flags', label: 'Red flags: returns that are too good' },
    ],
    Body: () => (
      <>
        <p>
          “Yield” is the return you earn for letting your assets be used. In traditional finance it is the interest on a savings account or the
          coupon on a bond. In crypto the idea is the same, but the sources and the risks are different.
        </p>
        <h2 id="where-yield-comes-from">Where yield comes from</h2>
        <p>Real yield has to be paid by someone, for something. In crypto the main sources are:</p>
        <ul>
          <li><strong>Lending:</strong> traders and institutions borrow stablecoins and coins, usually against collateral, and pay interest.</li>
          <li><strong>Staking:</strong> proof-of-stake networks pay validators for securing them, typically a few percent a year.</li>
          <li><strong>Liquidity provision:</strong> trading venues pay a share of their fees to whoever supplies the assets traded.</li>
        </ul>
        <p>
          Each of these produces returns that are typically measured in single digits to low double digits per year, and they move with market
          demand. Stablecoins often earn more than bitcoin because demand to borrow dollars is higher.
        </p>
        <h2 id="apy-and-apr">APY and APR</h2>
        <p>
          <strong>APR</strong> (annual percentage rate) is the simple yearly rate, without compounding. <strong>APY</strong> (annual percentage
          yield) includes the effect of earning yield on your yield. We always quote APY, so the figure you see is what a balance would grow by over
          a full year if the rate stayed the same.
        </p>
        <h2 id="compounding">Compounding, step by step</h2>
        <p>
          Suppose you hold $10,000 of USDT at 9.5% APY, paid daily. Each day the balance grows by a tiny fraction, about 0.0249%. The next day’s
          yield is calculated on the slightly larger balance. After a year the balance is about $10,950: the full 9.5%. After two years it is about
          $11,990, because the second year’s yield is earned on $10,950, not $10,000.
        </p>
        <blockquote>The daily rate is calculated as (1 + APY)<sup>1/365</sup> − 1, so 365 daily payouts add up to exactly the published APY.</blockquote>
        <h2 id="how-we-calculate">How BitInvest Capital calculates yield</h2>
        <ul>
          <li>Each asset has a published rate, paid either daily (at 00:00 UTC) or hourly (on the hour).</li>
          <li>Only assets you have switched on in your allocation earn yield.</li>
          <li>
            Yield is paid on the balance you held for the whole period. Money that arrives part-way through a period starts earning from the next
            one. This keeps the calculation fair for everyone.
          </li>
          <li>Amounts are rounded down to the asset’s smallest unit, and every payout appears in your activity list.</li>
        </ul>
        <p>You can try different amounts and durations with the <Link href="/earn">yield calculator</Link>.</p>
        <h2 id="why-rates-change">Why rates change</h2>
        <p>
          Because yield comes from real borrowing and network activity, it rises and falls with market conditions. When demand to borrow is high,
          rates go up; when it falls, they come down. That is why every rate we publish is variable and can be changed or paused, and why we show
          projections only as illustrations.
        </p>
        <h2 id="red-flags">Red flags: returns that are too good</h2>
        <p>Be very careful with any platform that offers:</p>
        <ul>
          <li><strong>Fixed or guaranteed returns</strong>, especially weekly or daily percentages. Real yield varies.</li>
          <li>
            <strong>Very high rates.</strong> A return of 2% a week sounds modest but compounds to over 180% a year; 10% a week is over 14,000% a
            year. No lending or staking market pays that. Returns like these can only be funded with new customers’ deposits, which is the
            definition of a Ponzi scheme, and they always collapse.
          </li>
          <li><strong>Rewards that mainly depend on recruiting others</strong> rather than on your own holdings.</li>
          <li><strong>Pressure to deposit quickly</strong>, or difficulty withdrawing.</li>
        </ul>
        <p>If an offer sounds too good to be true, it almost certainly is.</p>
      </>
    ),
  },
  {
    slug: 'keeping-your-account-secure',
    title: 'Keeping your account secure: a practical checklist',
    summary: 'Passwords, phishing, devices and the messages we will never send you.',
    category: 'Safety',
    minutes: 6,
    toc: [
      { id: 'passwords', label: 'Use a unique, strong password' },
      { id: 'email', label: 'Protect your email account' },
      { id: 'phishing', label: 'Recognise phishing' },
      { id: 'devices', label: 'Keep your devices clean' },
      { id: 'we-will-never', label: 'What we will never do' },
      { id: 'if-something-goes-wrong', label: 'If something goes wrong' },
    ],
    Body: () => (
      <>
        <p>
          Most account takeovers are not technical attacks on a platform; they start with a reused password or a convincing fake message. A few
          habits remove most of that risk.
        </p>
        <h2 id="passwords">Use a unique, strong password</h2>
        <p>
          Use a password you have never used anywhere else. If another website you use is breached, attackers try the same email and password on
          financial sites within hours. A password manager makes unique passwords easy: it creates and remembers them for you.
        </p>
        <h2 id="email">Protect your email account</h2>
        <p>
          Your email is the key to every account that can send you a reset link. Give it a strong password and turn on two-step verification with
          an authenticator app or security key.
        </p>
        <h2 id="phishing">Recognise phishing</h2>
        <ul>
          <li>Check the address bar: our website is <strong>bitinvestcapital.com</strong>. Look-alike spellings are a common trick.</li>
          <li>Be suspicious of urgency (“your account will be closed today”) and of surprise prizes or bonuses.</li>
          <li>Sign in by typing our address or using a bookmark, not by clicking links in unexpected messages.</li>
          <li>Our emails come from addresses ending in @bitinvestcapital.com.</li>
        </ul>
        <h2 id="devices">Keep your devices clean</h2>
        <p>
          Keep your phone and computer updated, avoid installing software from unknown sources, and do not sign in on shared computers. Some
          malware replaces crypto addresses you copy with the attacker’s, so always check the first and last characters after pasting.
        </p>
        <h2 id="we-will-never">What we will never do</h2>
        <ul>
          <li>Ask for your password, by email, phone, chat or social media.</li>
          <li>Ask for a wallet recovery phrase or private key.</li>
          <li>Ask you to send crypto to “verify” or “unlock” your account.</li>
          <li>Contact you first offering guaranteed returns or investment advice.</li>
        </ul>
        <h2 id="if-something-goes-wrong">If something goes wrong</h2>
        <p>
          If you think someone else has accessed your account, change your password immediately and contact our support team from the email address
          on your account. The sooner we hear from you, the more we can do.
        </p>
      </>
    ),
  },
  {
    slug: 'understanding-volatility-and-risk',
    title: 'Understanding volatility and managing risk',
    summary: 'How much prices move, why diversification and position size matter, and simple habits for investing calmly.',
    category: 'Safety',
    minutes: 7,
    toc: [
      { id: 'how-volatile', label: 'How volatile is crypto?' },
      { id: 'position-size', label: 'Start with position size' },
      { id: 'diversify', label: 'Diversify across assets' },
      { id: 'regular-buying', label: 'Buying regularly' },
      { id: 'yield-and-price', label: 'Yield does not remove price risk' },
      { id: 'plan', label: 'Write down your plan' },
    ],
    Body: () => (
      <>
        <p>
          Crypto markets are open every day of the year and react quickly to news. Large moves are normal. Understanding that in advance is the best
          protection against making decisions in a panic.
        </p>
        <h2 id="how-volatile">How volatile is crypto?</h2>
        <p>
          Bitcoin, the largest and usually the least volatile major coin, has fallen by more than 70% from a peak several times in its history and
          has also multiplied in value many times over. Smaller coins move even more. A 10% move in a single day is unusual for a stock but
          ordinary for many cryptocurrencies. You can see this for yourself on the <Link href="/markets">markets page</Link> by switching a chart to
          one year.
        </p>
        <h2 id="position-size">Start with position size</h2>
        <p>
          The most important decision is how much to put in. A useful test: imagine the value halving next month. If that would cause you real
          hardship, the amount is too large. Many people keep crypto to a small share of their total savings and never invest money they will need
          for rent, school fees or emergencies.
        </p>
        <h2 id="diversify">Diversify across assets</h2>
        <p>
          Different assets carry different risks. Stablecoins aim to hold their value but depend on their issuer; bitcoin has the longest track
          record; smaller networks can grow faster or fail entirely. Your allocation on BitInvest Capital lets you decide how your portfolio is split
          and which assets earn yield.
        </p>
        <h2 id="regular-buying">Buying regularly</h2>
        <p>
          Trying to time the market is hard even for professionals. Buying a fixed amount at regular intervals, known as dollar-cost averaging,
          spreads your entry price over time so that a single bad day matters less.
        </p>
        <h2 id="yield-and-price">Yield does not remove price risk</h2>
        <p>
          Earning 2.5% a year on bitcoin does not help much if the price falls 30%. Yield on volatile coins is paid in that coin, so its dollar value
          moves with the market. Yield on stablecoins is more predictable in dollar terms, but rates are still variable.
        </p>
        <h2 id="plan">Write down your plan</h2>
        <p>
          Before you invest, write down why you are buying, how much, for how long, and what would make you sell. When the market moves sharply,
          read it again before acting. For a fuller description of risks, see our <Link href="/risk-disclosure">risk disclosure</Link>.
        </p>
      </>
    ),
  },
  {
    slug: 'what-is-bitcoin',
    title: 'What is Bitcoin? The first cryptocurrency explained',
    summary: 'How Bitcoin works, why its supply is fixed, what halvings are, and what to consider before buying.',
    category: 'Basics',
    minutes: 8,
    toc: [
      { id: 'origins', label: 'Where Bitcoin came from' },
      { id: 'how-it-works', label: 'How the network works' },
      { id: 'supply', label: 'A fixed supply and the halving' },
      { id: 'uses', label: 'What people use it for' },
      { id: 'price', label: 'What moves the price' },
      { id: 'holding', label: 'Holding bitcoin with BitInvest Capital' },
    ],
    Body: () => (
      <>
        <p>
          Bitcoin is a digital currency that runs on a public network instead of being issued by a government or bank. It was the first
          cryptocurrency, and it remains the largest by market value. Understanding Bitcoin makes almost everything else in crypto easier to follow.
        </p>
        <h2 id="origins">Where Bitcoin came from</h2>
        <p>
          In 2008 a person or group using the name Satoshi Nakamoto published a short paper describing a way to send electronic cash directly
          between people without a trusted intermediary. The network went live in January 2009. Satoshi stopped communicating publicly in 2010, and
          Bitcoin has since been maintained by an open community of developers, node operators and miners.
        </p>
        <h2 id="how-it-works">How the network works</h2>
        <p>
          Thousands of computers, called nodes, each keep a full copy of Bitcoin’s transaction history. Miners gather new transactions into blocks
          and compete to solve a computational puzzle; the winner adds the block and receives newly created bitcoin plus the fees attached to the
          transactions. A new block arrives roughly every ten minutes.
        </p>
        <p>
          Because each block references the one before it, rewriting history would mean redoing the work for every later block faster than the
          rest of the network. That is what makes confirmed bitcoin transactions extremely hard to reverse, and why we wait for confirmations before
          crediting a deposit.
        </p>
        <h2 id="supply">A fixed supply and the halving</h2>
        <p>
          Only 21 million bitcoin will ever exist. New coins are released as mining rewards, and that reward is cut in half every 210,000 blocks,
          roughly every four years, in an event known as the <strong>halving</strong>. Each halving slows the creation of new bitcoin, and the
          final fractions are expected to be mined around the year 2140.
        </p>
        <p>
          Bitcoin is divisible to eight decimal places. The smallest unit, one hundred-millionth of a bitcoin, is called a <strong>satoshi</strong>,
          so you never need to buy a whole coin.
        </p>
        <h2 id="uses">What people use it for</h2>
        <ul>
          <li><strong>Long-term saving:</strong> many holders see bitcoin as a scarce asset, sometimes called digital gold.</li>
          <li><strong>Moving value across borders:</strong> transfers work at any hour, without correspondent banks.</li>
          <li><strong>Collateral and trading:</strong> bitcoin is the most widely accepted collateral in crypto markets.</li>
        </ul>
        <h2 id="price">What moves the price</h2>
        <p>
          Bitcoin’s price is set by trading on exchanges around the world. Demand rises and falls with interest rates, investor sentiment, regulation,
          adoption by companies and funds, and news. Supply changes slowly and predictably, so swings in demand tend to show up as large price
          moves. Falls of 50% or more from a peak have happened several times. You can explore its history on the{' '}
          <Link href="/markets/btc">Bitcoin price page</Link>.
        </p>
        <h2 id="holding">Holding bitcoin with BitInvest Capital</h2>
        <p>
          You can deposit BTC to your own dedicated address, include it in your allocation and earn variable yield paid in bitcoin. Read{' '}
          <Link href="/buy/btc">how to buy Bitcoin</Link> for a step-by-step guide, and see <Link href="/earn/btc">BTC Earn</Link> for the current rate.
        </p>
      </>
    ),
  },
  {
    slug: 'what-is-ethereum',
    title: 'What is Ethereum? Smart contracts, ether and gas',
    summary: 'The programmable blockchain behind most tokens and decentralised apps, and how ether fits in.',
    category: 'Basics',
    minutes: 8,
    toc: [
      { id: 'a-world-computer', label: 'A programmable blockchain' },
      { id: 'ether-and-gas', label: 'Ether and gas fees' },
      { id: 'proof-of-stake', label: 'Proof of Stake and The Merge' },
      { id: 'tokens', label: 'Tokens and the ERC-20 standard' },
      { id: 'layer-2', label: 'Layer 2 networks' },
      { id: 'risks', label: 'Risks to understand' },
    ],
    Body: () => (
      <>
        <p>
          Ethereum is a blockchain that can run programs. Launched in 2015, it made it possible to build applications, tokens and financial services
          that run on a public network rather than on a company’s servers. Ether (ETH) is its native currency.
        </p>
        <h2 id="a-world-computer">A programmable blockchain</h2>
        <p>
          On Ethereum, developers deploy <strong>smart contracts</strong>: programs whose code and data live on the blockchain. Once deployed, a
          contract runs exactly as written for anyone who interacts with it. Exchanges, lending markets, stablecoins and digital collectibles are all
          built this way.
        </p>
        <h2 id="ether-and-gas">Ether and gas fees</h2>
        <p>
          Every action on Ethereum uses computing resources measured in <strong>gas</strong>, paid for in ETH. When the network is busy, people bid
          more for space in each block and fees rise. Part of every fee is burned, which permanently removes that ETH from circulation.
        </p>
        <p>
          That is why you always need a little ETH in your wallet to send tokens on Ethereum, including USDT.
        </p>
        <h2 id="proof-of-stake">Proof of Stake and The Merge</h2>
        <p>
          In September 2022 Ethereum switched from mining to Proof of Stake. Validators now lock up ETH as a security deposit and earn rewards for
          proposing and checking blocks; misbehaving validators can lose part of their deposit. The change reduced Ethereum’s energy use by more than
          99%.
        </p>
        <h2 id="tokens">Tokens and the ERC-20 standard</h2>
        <p>
          Most tokens on Ethereum follow a common interface called <strong>ERC-20</strong>, so wallets and exchanges can support them in the same
          way. USDT, USDC and thousands of other tokens are ERC-20 tokens. BNB Smart Chain uses a near-identical standard called BEP-20, and other
          networks have their own.
        </p>
        <h2 id="layer-2">Layer 2 networks</h2>
        <p>
          Layer 2 networks such as Arbitrum process transactions separately and post compressed results back to Ethereum, cutting fees while relying
          on Ethereum for security. Their addresses look identical to Ethereum addresses, so always choose the right network when sending.
        </p>
        <h2 id="risks">Risks to understand</h2>
        <ul>
          <li>ETH is volatile and has fallen sharply many times.</li>
          <li>Smart contracts can contain bugs that attackers exploit.</li>
          <li>Fees can make small transfers expensive at busy times.</li>
        </ul>
        <p>
          See the <Link href="/markets/eth">Ethereum price page</Link>, <Link href="/buy/eth">how to buy Ethereum</Link> and{' '}
          <Link href="/earn/eth">ETH Earn</Link>.
        </p>
      </>
    ),
  },
  {
    slug: 'how-to-read-crypto-charts',
    title: 'How to read crypto price charts',
    summary: 'Timeframes, highs and lows, percentage change, volume and market cap, without the jargon.',
    category: 'Using crypto',
    minutes: 7,
    toc: [
      { id: 'timeframes', label: 'Choosing a timeframe' },
      { id: 'change', label: 'Percentage change' },
      { id: 'high-low', label: 'High, low and open' },
      { id: 'trend', label: 'Trends and volatility' },
      { id: 'volume-cap', label: 'Volume and market cap' },
      { id: 'mistakes', label: 'Common mistakes' },
    ],
    Body: () => (
      <>
        <p>
          A price chart is the quickest way to understand how an asset has behaved. Every chart on our site works the same way, so once you can read
          one, you can read them all.
        </p>
        <h2 id="timeframes">Choosing a timeframe</h2>
        <p>
          Our charts offer 1D, 7D, 30D, 90D and 1Y. Short ranges show detail, with a point every five minutes on 1D. Long ranges show the bigger
          picture, with one point per day on 1Y. The same coin can look like it is crashing on 1D and climbing steadily on 1Y, so check more than
          one range before drawing conclusions.
        </p>
        <h2 id="change">Percentage change</h2>
        <p>
          Next to the price you will see the change over the selected range, green for up and red for down. It compares the latest price with the
          first price in the range. A 10% rise followed by a 10% fall does not bring you back to where you started: you end up 1% lower.
        </p>
        <h2 id="high-low">High, low and open</h2>
        <p>
          <strong>High</strong> and <strong>low</strong> are the highest and lowest prices within the range you selected; <strong>open</strong> is the
          first price in it. The gap between high and low is a simple way to see how much a coin moved.
        </p>
        <h2 id="trend">Trends and volatility</h2>
        <p>
          A series of higher highs and higher lows suggests an uptrend; the opposite suggests a downtrend. A jagged line with big swings means high
          volatility. Stablecoins such as USDT should look almost flat; if one doesn’t, that is worth noticing.
        </p>
        <h2 id="volume-cap">Volume and market cap</h2>
        <ul>
          <li><strong>24h volume</strong> is the value traded in the last day. Big price moves on low volume are less meaningful than moves on high volume.</li>
          <li><strong>Market cap</strong> is price multiplied by circulating supply. It shows a network’s size, not the money invested in it.</li>
        </ul>
        <p>Both appear on every coin page and on the <Link href="/markets">markets page</Link>.</p>
        <h2 id="mistakes">Common mistakes</h2>
        <ul>
          <li>Judging a coin by a single day.</li>
          <li>Assuming past moves will repeat. Charts describe the past; they don’t predict the future.</li>
          <li>Comparing coins by price instead of market cap. A $0.25 coin is not “cheaper” than a $2,000 coin in any useful sense.</li>
        </ul>
        <p>Practise on the <Link href="/markets/history">historical market data</Link> page, which shows a year of history for every coin.</p>
      </>
    ),
  },
  {
    slug: 'defi-and-staking-explained',
    title: 'DeFi and staking explained',
    summary: 'Decentralised finance, staking rewards, liquidity pools and the risks behind on-chain yield.',
    category: 'Earning',
    minutes: 8,
    toc: [
      { id: 'what-is-defi', label: 'What is DeFi?' },
      { id: 'staking', label: 'Staking' },
      { id: 'lending', label: 'Lending protocols' },
      { id: 'liquidity', label: 'Liquidity pools' },
      { id: 'risks', label: 'The risks' },
      { id: 'custodial', label: 'Custodial earning' },
    ],
    Body: () => (
      <>
        <p>
          Decentralised finance, or DeFi, recreates financial services such as lending, borrowing and trading with smart contracts on public
          blockchains. Staking is how proof-of-stake networks pay people to help secure them. Both are major sources of the yield you see across crypto.
        </p>
        <h2 id="what-is-defi">What is DeFi?</h2>
        <p>
          Instead of a bank matching borrowers and lenders, a DeFi protocol uses code. Anyone with a wallet can deposit assets, borrow against them
          or trade, and the rules are visible on the blockchain. Most DeFi activity happens on Ethereum and on networks compatible with it, such as
          BNB Smart Chain, Arbitrum, Polygon and Avalanche, as well as Solana.
        </p>
        <h2 id="staking">Staking</h2>
        <p>
          On proof-of-stake networks like Ethereum, Solana, Cardano and Cosmos, validators lock up coins to help produce blocks. In return, the
          network pays them rewards, usually a few percent a year. Holders can delegate their coins to validators and share in those rewards. Some
          networks require a waiting period, called unbonding, before staked coins can be moved again; on the Cosmos Hub it is 21 days.
        </p>
        <h2 id="lending">Lending protocols</h2>
        <p>
          Lending protocols let people deposit assets that others can borrow by posting more collateral than they borrow. Borrowers pay interest,
          which flows to lenders. Rates change automatically with supply and demand.
        </p>
        <h2 id="liquidity">Liquidity pools</h2>
        <p>
          Decentralised exchanges hold pairs of tokens in pools. People who supply tokens to a pool earn a share of trading fees, but can lose value
          compared with simply holding if prices move apart, an effect called impermanent loss.
        </p>
        <h2 id="risks">The risks</h2>
        <ul>
          <li><strong>Smart-contract risk:</strong> bugs have led to large losses.</li>
          <li><strong>Price risk:</strong> rewards paid in a volatile token can lose value faster than they accrue.</li>
          <li><strong>Slashing:</strong> validators that misbehave can lose part of their stake.</li>
          <li><strong>Unsustainable rewards:</strong> very high advertised rates are often paid in newly printed tokens and fall quickly.</li>
        </ul>
        <h2 id="custodial">Custodial earning</h2>
        <p>
          With BitInvest Capital you don’t need to manage wallets, validators or smart contracts yourself. You choose which assets earn, and yield is
          credited to your balance at the published variable rate. The trade-off is that we hold the assets on your behalf; read our{' '}
          <Link href="/risk-disclosure">risk warning</Link> and <Link href="/learn/how-crypto-yield-works">how yield works</Link> before you start.
        </p>
      </>
    ),
  }
];

export const ARTICLE_BY_SLUG = Object.fromEntries(ARTICLES.map((a) => [a.slug, a]));

export const GLOSSARY: { term: string; def: string }[] = [
  { term: 'Airdrop', def: 'Tokens distributed for free to many addresses, often to reward early users. Unexpected airdrops can be scams.' },
  { term: 'Altcoin', def: 'Any cryptocurrency other than Bitcoin.' },
  { term: 'APR', def: 'Annual percentage rate: a yearly rate without compounding.' },
  { term: 'Bear / bull market', def: 'A prolonged period of falling (bear) or rising (bull) prices.' },
  { term: 'Circulating supply', def: 'The number of coins currently available to trade.' },
  { term: 'Cold wallet', def: 'A wallet whose keys are kept offline, for example on a hardware device.' },
  { term: 'Compounding', def: 'Earning yield on previously earned yield, so growth speeds up over time.' },
  { term: 'Dollar-cost averaging', def: 'Buying a fixed amount at regular intervals to spread your entry price over time.' },
  { term: 'Exchange', def: 'A platform where crypto is bought and sold, either for other crypto or for traditional money.' },
  { term: 'Halving', def: 'The roughly four-yearly cut in Bitcoin’s mining reward, which slows new supply.' },
  { term: 'Hash', def: 'A fixed-length fingerprint of data. Each transaction and block has a unique hash.' },
  { term: 'KYC', def: 'Know your customer: identity checks that regulated services carry out.' },
  { term: 'Liquidity', def: 'How easily an asset can be bought or sold without moving its price.' },
  { term: 'Mainnet', def: 'The live version of a blockchain, as opposed to a test network.' },
  { term: 'Node', def: 'A computer that keeps a copy of a blockchain and checks the rules.' },
  { term: 'P2P trading', def: 'Buying or selling crypto directly with another person, usually through a marketplace that holds funds in escrow.' },
  { term: 'Seed phrase', def: 'Another name for a recovery phrase: 12 or 24 words that control a wallet.' },
  { term: 'Slashing', def: 'A penalty that removes part of a validator’s stake for breaking network rules.' },
  { term: 'Smart contract', def: 'A program that runs on a blockchain exactly as written.' },
  { term: 'Spread', def: 'The difference between the buying and selling price of an asset.' },
  { term: 'Staking', def: 'Locking coins to help secure a proof-of-stake network in return for rewards.' },
  { term: 'Transaction hash (TXID)', def: 'The unique ID of a blockchain transaction, used to look it up in a block explorer.' },
  { term: 'Validator', def: 'A participant that produces and checks blocks on a proof-of-stake network.' },
  { term: 'Address', def: 'A public identifier you share to receive crypto on a specific network, similar to an account number.' },
  { term: 'Allocation', def: 'How you split your portfolio between assets, and which assets you have switched on to earn yield.' },
  { term: 'APY', def: 'Annual percentage yield: the yearly return including compounding.' },
  { term: 'Block explorer', def: 'A website that shows every transaction and block on a public blockchain.' },
  { term: 'Bridge', def: 'A service that moves tokens from one blockchain to another.' },
  { term: 'Confirmation', def: 'Each new block added after the one containing your transaction. More confirmations make it harder to reverse.' },
  { term: 'Custodial', def: 'A service that holds assets on your behalf, as opposed to a wallet where only you hold the keys.' },
  { term: 'DeFi', def: 'Decentralised finance: lending, trading and other financial services run by smart contracts.' },
  { term: 'ERC-20 / BEP-20 / TRC-20', def: 'Token standards on Ethereum, BNB Smart Chain and TRON respectively.' },
  { term: 'Gas', def: 'The fee paid to process a transaction on Ethereum and similar networks.' },
  { term: 'Layer 2', def: 'A network that processes transactions separately and settles them on a main chain such as Ethereum, for lower fees.' },
  { term: 'Market cap', def: 'Price multiplied by the number of coins in circulation.' },
  { term: 'Memo / destination tag', def: 'A code that identifies the recipient when many customers share one address. Required when shown.' },
  { term: 'Private key / recovery phrase', def: 'The secret that controls a wallet. Never share it with anyone.' },
  { term: 'Proof of Stake', def: 'A way of securing a blockchain where validators lock up coins as a deposit.' },
  { term: 'Proof of Work', def: 'A way of securing a blockchain through computational work by miners.' },
  { term: 'Stablecoin', def: 'A token designed to keep a stable value, usually one US dollar.' },
  { term: 'Volatility', def: 'How much and how quickly a price moves up and down.' },
  { term: 'Watch-only key', def: 'A public key that can generate addresses and view balances but cannot move funds.' },
];
