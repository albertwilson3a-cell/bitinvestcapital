/**
 * Coins shown across the website and the client dashboard. Market figures come
 * live from the API; everything here is descriptive content. `deposits` says
 * whether clients can fund this coin today.
 */

export type DepositStatus = 'live' | 'soon';

export interface CoinFaq {
  q: string;
  a: string;
}

export interface CoinInfo {
  symbol: string;
  name: string;
  color: string;
  category: string;
  tagline: string;
  deposits: DepositStatus;
  /** Networks we accept (or will accept) this coin on, with the token standard. */
  networks: { name: string; standard?: string; note?: string }[];
  facts: { label: string; value: string }[];
  about: string[];
  useCases: { title: string; body: string }[];
  depositNotes: string[];
  risks: string;
  faq: CoinFaq[];
}

export const COIN_LIST: CoinInfo[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#e3a54c',
    category: 'Layer 1 · Store of value',
    tagline: 'The first cryptocurrency, and still the largest by market value.',
    deposits: 'live',
    networks: [{ name: 'Bitcoin', standard: 'Native SegWit (bc1q…)' }],
    facts: [
      { label: 'Launched', value: '2009' },
      { label: 'Created by', value: 'Satoshi Nakamoto (pseudonym)' },
      { label: 'Consensus', value: 'Proof of Work (SHA-256)' },
      { label: 'Maximum supply', value: '21,000,000 BTC' },
      { label: 'Average block time', value: 'About 10 minutes' },
      { label: 'Smallest unit', value: '1 satoshi = 0.00000001 BTC' },
    ],
    about: [
      'Bitcoin was described in a 2008 white paper as “a purely peer-to-peer version of electronic cash” and went live in January 2009. It lets two people send value to each other over the internet without a bank in between. Transactions are grouped into blocks roughly every ten minutes and secured by miners, who compete to solve a computational puzzle. The longest valid chain of blocks is the shared record everyone agrees on.',
      'Bitcoin’s supply is capped at 21 million coins. New bitcoin enters circulation as a reward to miners, and that reward halves every 210,000 blocks, roughly every four years. This predictable, shrinking issuance is the main reason many people treat bitcoin as a long-term store of value, sometimes called “digital gold”.',
      'Because the network has run continuously for well over a decade, has thousands of independent nodes and has no company that can change its rules on its own, bitcoin is widely regarded as the most battle-tested blockchain. The trade-off is that its base layer is deliberately simple and relatively slow, which is why payment-focused tools such as the Lightning Network are built on top of it.',
    ],
    useCases: [
      { title: 'Long-term savings', body: 'Many holders buy bitcoin as a hedge against currency debasement and keep it for years rather than spending it.' },
      { title: 'Cross-border transfers', body: 'Value can move between countries at any hour without correspondent banks, with fees set by network demand rather than the amount sent.' },
      { title: 'Collateral', body: 'Bitcoin is accepted as collateral by many lenders and trading venues because it is liquid and widely traded.' },
    ],
    depositNotes: [
      'Send only BTC on the Bitcoin network to your BitInvest Capital BTC address.',
      'Your address starts with bc1q. Addresses from other networks (for example BNB Smart Chain “BTCB”) are not compatible.',
      'After sending, report the transaction ID from your dashboard. We credit it once it has 3 network confirmations and our team has checked it.',
    ],
    risks: 'Bitcoin’s price can move 10% or more in a day and has fallen by more than 70% from previous peaks several times. Transactions cannot be reversed once confirmed, so sending to a wrong address means the funds are lost.',
    faq: [
      { q: 'How long does a BTC deposit take?', a: 'Bitcoin produces a block about every 10 minutes. After you report the transaction, our team checks it once it has 3 confirmations (30 to 60 minutes, depending on the fee paid) and credits your balance, usually within a few hours.' },
      { q: 'Can I send bitcoin from an exchange?', a: 'Yes. Choose the Bitcoin network (sometimes labelled BTC or “Bitcoin (SegWit)”) when you withdraw, and paste your BitInvest Capital BTC address.' },
      { q: 'What is a satoshi?', a: 'The smallest unit of bitcoin: one hundred-millionth of a BTC. Balances are tracked to 8 decimal places.' },
    ],
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#8e9eff',
    category: 'Layer 1 · Smart contracts',
    tagline: 'The programmable blockchain behind most tokens, DeFi and NFTs.',
    deposits: 'live',
    networks: [{ name: 'Ethereum', standard: 'Native ETH' }],
    facts: [
      { label: 'Launched', value: '2015' },
      { label: 'Proposed by', value: 'Vitalik Buterin' },
      { label: 'Consensus', value: 'Proof of Stake (since September 2022)' },
      { label: 'Maximum supply', value: 'No fixed cap' },
      { label: 'Block time', value: 'About 12 seconds' },
      { label: 'Token standard', value: 'ERC-20 (fungible tokens)' },
    ],
    about: [
      'Ethereum is a blockchain that runs programs called smart contracts. Where bitcoin mainly records who owns which coins, Ethereum can also record and execute rules: lending agreements, exchanges, games, digital collectibles and the tokens of thousands of other projects. Ether (ETH) is the network’s native currency and is used to pay “gas”, the fee for every transaction and contract call.',
      'In September 2022 Ethereum switched from mining to Proof of Stake in an upgrade known as The Merge, cutting its energy use by more than 99%. Validators now lock up ETH as a security deposit and earn rewards for proposing and checking blocks. Part of every transaction fee is burned, so the total supply of ETH can shrink when the network is busy.',
      'Most stablecoins and a large share of decentralised finance (DeFi) live on Ethereum or on “layer 2” networks such as Arbitrum that settle back to it. That ecosystem is Ethereum’s main strength; its main weakness is that fees on the base layer can rise sharply when demand is high.',
    ],
    useCases: [
      { title: 'Paying network fees', body: 'Every action on Ethereum and on many layer 2 networks is paid for in ETH.' },
      { title: 'Staking', body: 'ETH can be staked to help secure the network in exchange for protocol rewards.' },
      { title: 'DeFi collateral', body: 'ETH is the most widely used collateral in on-chain lending and trading.' },
    ],
    depositNotes: [
      'Send only ETH on the Ethereum mainnet to your BitInvest Capital ETH address.',
      'Do not send ETH from Arbitrum, BNB Smart Chain or other networks to this address: even though the address looks the same, those are different networks.',
      'After sending, report the transaction hash from your dashboard. We credit it once it has 12 network confirmations and our team has checked it.',
    ],
    risks: 'ETH is volatile and its value depends heavily on activity in the Ethereum ecosystem. Smart contracts can contain bugs, and network fees can make small transfers expensive at busy times.',
    faq: [
      { q: 'Is my ETH address the same as my USDT address?', a: 'Both are Ethereum addresses. When you report a deposit, choose the asset you actually sent (ETH or USDT) so it is credited to the right balance.' },
      { q: 'Why do I need ETH to send tokens on Ethereum?', a: 'Network fees on Ethereum are always paid in ETH, even when you are sending a token such as USDT. Keep a little ETH in the wallet you are sending from.' },
      { q: 'What happened in The Merge?', a: 'Ethereum replaced mining with Proof of Stake in September 2022. Blocks are now produced by validators who lock up ETH, which drastically reduced the network’s energy consumption.' },
    ],
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    color: '#40b79f',
    category: 'Stablecoin · US dollar',
    tagline: 'The most widely used dollar stablecoin, designed to stay at $1.',
    deposits: 'live',
    networks: [
      { name: 'Ethereum', standard: 'ERC-20', note: 'Accepted now' },
      { name: 'TRON', standard: 'TRC-20', note: 'Coming soon' },
      { name: 'BNB Smart Chain', standard: 'BEP-20', note: 'Coming soon' },
    ],
    facts: [
      { label: 'Launched', value: '2014' },
      { label: 'Issuer', value: 'Tether Limited' },
      { label: 'Peg', value: '1 USDT ≈ 1 US dollar' },
      { label: 'Backing', value: 'Reserves held by the issuer' },
      { label: 'Decimals on Ethereum', value: '6' },
      { label: 'Contract (Ethereum)', value: '0xdAC1…1ec7' },
    ],
    about: [
      'Tether (USDT) is a stablecoin: a token designed to keep a steady value of one US dollar. The issuer creates new USDT when customers deposit dollars and destroys USDT when they redeem, and says it holds reserves such as US Treasury bills to back the tokens in circulation.',
      'USDT exists on many blockchains, including Ethereum (as an ERC-20 token) and TRON (TRC-20). The same token on different networks is not interchangeable without a bridge or an exchange, so the network you choose when sending matters.',
      'Because its price is stable, USDT is the most common way people hold cash-like balances in crypto, move money between exchanges, and earn yield without taking on the price swings of coins like bitcoin.',
    ],
    useCases: [
      { title: 'A stable balance', body: 'Hold a dollar-denominated balance without leaving the crypto ecosystem.' },
      { title: 'Earning yield', body: 'Stablecoins typically earn steadier, more predictable yield than volatile coins.' },
      { title: 'Payments and transfers', body: 'Send dollar value across borders at any time, often more cheaply than a bank wire.' },
    ],
    depositNotes: [
      'We currently accept USDT on Ethereum (ERC-20) only. Choose “Ethereum” or “ERC-20” as the network when you send.',
      'Sending TRC-20 or BEP-20 USDT to your Ethereum address will not be credited.',
      'Report the transaction hash after sending; it is credited once it has 12 Ethereum confirmations and has been checked.',
    ],
    risks: 'A stablecoin is only as good as its issuer and reserves. USDT has briefly traded below $1 during market stress, and stablecoin issuers can freeze tokens at specific addresses.',
    faq: [
      { q: 'Which USDT network should I use?', a: 'Ethereum (ERC-20). Support for TRON (TRC-20) and BNB Smart Chain (BEP-20) is planned. Always check the network shown on your deposit screen.' },
      { q: 'Is USDT always worth exactly $1?', a: 'It is designed to be, and usually trades within a fraction of a cent of $1, but it is not guaranteed. On BitInvest Capital, USDT balances are valued at $1.' },
      { q: 'Why does USDT earn a higher rate than BTC?', a: 'Demand to borrow stablecoins is usually higher, so they tend to earn more. Rates are variable and set by our team.' },
    ],
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    color: '#e8c547',
    category: 'Layer 1 · Exchange ecosystem',
    tagline: 'The native coin of BNB Smart Chain, home of BEP-20 tokens.',
    deposits: 'soon',
    networks: [{ name: 'BNB Smart Chain', standard: 'Native BNB · BEP-20 tokens' }],
    facts: [
      { label: 'Launched', value: '2017' },
      { label: 'Ecosystem', value: 'BNB Chain' },
      { label: 'Consensus', value: 'Proof of Staked Authority' },
      { label: 'Supply policy', value: 'Regular token burns toward 100M' },
      { label: 'Token standard', value: 'BEP-20' },
      { label: 'EVM compatible', value: 'Yes' },
    ],
    about: [
      'BNB began in 2017 as a token tied to the Binance exchange and became the native coin of BNB Smart Chain (BSC), which launched in 2020. BSC is compatible with Ethereum’s software, so wallets and smart contracts written for Ethereum work on it with little change.',
      'BSC uses a small set of validators chosen by stake, which keeps fees low and blocks fast at the cost of being more centralised than Ethereum. Tokens on BSC follow the BEP-20 standard, which mirrors Ethereum’s ERC-20.',
      'BNB is used to pay network fees on BSC, and part of the supply is periodically burned, reducing the total over time.',
    ],
    useCases: [
      { title: 'Low-cost transfers', body: 'BSC fees are usually a few cents, making it popular for moving stablecoins.' },
      { title: 'BEP-20 tokens', body: 'BNB pays the fees for every BEP-20 token transfer on the chain.' },
      { title: 'DeFi on BSC', body: 'A large ecosystem of exchanges and lending apps runs on BNB Smart Chain.' },
    ],
    depositNotes: ['BNB and BEP-20 deposits are being added in our next update. Prices and charts are available now.'],
    risks: 'BNB’s value is closely linked to the Binance ecosystem and to regulatory actions involving it. BSC’s small validator set makes it more centralised than many other chains.',
    faq: [
      { q: 'Can I deposit BNB today?', a: 'Not yet. BNB Smart Chain deposits, including BEP-20 tokens, are part of our next update. You can follow BNB’s price and chart in the meantime.' },
      { q: 'What is BEP-20?', a: 'The token standard on BNB Smart Chain. It works like Ethereum’s ERC-20, but tokens live on a different network and must be sent on BSC.' },
    ],
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    color: '#b38cff',
    category: 'Layer 1 · High throughput',
    tagline: 'A fast, low-fee blockchain built for high transaction volumes.',
    deposits: 'soon',
    networks: [{ name: 'Solana', standard: 'Native SOL · SPL tokens' }],
    facts: [
      { label: 'Launched', value: '2020' },
      { label: 'Founded by', value: 'Anatoly Yakovenko' },
      { label: 'Consensus', value: 'Proof of Stake with Proof of History' },
      { label: 'Slot time', value: 'About 0.4 seconds' },
      { label: 'Token standard', value: 'SPL' },
      { label: 'Smart contracts', value: 'Yes (Rust-based programs)' },
    ],
    about: [
      'Solana is a blockchain designed to process many thousands of transactions per second with fees that are usually a fraction of a cent. It uses Proof of Stake together with a timekeeping technique called Proof of History, which lets validators agree on the order of events quickly.',
      'Its speed has made Solana popular for trading, payments, consumer apps and digital collectibles. Tokens on Solana follow the SPL standard, and stablecoins such as USDC are widely used on it.',
      'Solana has suffered several network outages in its history, although reliability has improved substantially. Running a validator requires powerful hardware, which is a common point of debate about its decentralisation.',
    ],
    useCases: [
      { title: 'Fast payments', body: 'Transfers confirm in seconds for a tiny fee.' },
      { title: 'Trading', body: 'Many high-volume decentralised exchanges run on Solana.' },
      { title: 'Staking', body: 'SOL can be delegated to validators to earn protocol rewards.' },
    ],
    depositNotes: [
      'Solana deposits need a dedicated custody integration, because Solana addresses cannot be generated safely in watch-only mode. They will be enabled once that integration is live.',
    ],
    risks: 'SOL is highly volatile. The network has experienced outages, and its ecosystem includes many speculative tokens.',
    faq: [
      { q: 'When can I deposit SOL?', a: 'Once our custody partner integration is connected. Until then you can follow SOL’s price and chart here.' },
      { q: 'Why is Solana different from the others?', a: 'Solana uses a different kind of cryptography (Ed25519) for which deposit addresses can’t be derived from a public key alone, so a custody provider has to issue them.' },
    ],
  },
  {
    symbol: 'XRP',
    name: 'XRP',
    color: '#9fb2c8',
    category: 'Layer 1 · Payments',
    tagline: 'The native asset of the XRP Ledger, built for fast settlement.',
    deposits: 'soon',
    networks: [{ name: 'XRP Ledger', standard: 'Native XRP', note: 'Requires a destination tag' }],
    facts: [
      { label: 'Launched', value: '2012' },
      { label: 'Associated company', value: 'Ripple' },
      { label: 'Consensus', value: 'XRP Ledger Consensus Protocol' },
      { label: 'Total supply', value: '100 billion XRP (created at launch)' },
      { label: 'Settlement time', value: '3–5 seconds' },
      { label: 'Address reserve', value: 'A small minimum balance per account' },
    ],
    about: [
      'The XRP Ledger is a public blockchain launched in 2012, focused on fast and cheap payments. Instead of mining or staking, a set of independent validators agree on each new ledger every few seconds.',
      'All 100 billion XRP were created when the ledger launched; there is no mining. A large share has been held by Ripple, the company that helps develop the ecosystem, and is released over time.',
      'Exchanges and custodians often receive XRP at a single address and tell customers apart using a destination tag, a number that must be included with the payment.',
    ],
    useCases: [
      { title: 'Cross-border payments', body: 'Designed for moving value between currencies and countries in seconds.' },
      { title: 'Low-cost transfers', body: 'Transaction fees are a tiny fraction of a cent.' },
      { title: 'Built-in exchange', body: 'The ledger includes a native exchange for issued currencies.' },
    ],
    depositNotes: ['XRP deposits are planned for our next update. When enabled, you will need to include your personal destination tag.'],
    risks: 'XRP is volatile and has been subject to long-running regulatory proceedings in the United States. Payments sent without the correct destination tag can be difficult to recover.',
    faq: [
      { q: 'What is a destination tag?', a: 'A number that identifies your account when many customers share one XRP address. Forgetting it is the most common reason XRP deposits go missing.' },
      { q: 'Can I deposit XRP now?', a: 'Not yet. XRP is part of our next multi-chain update.' },
    ],
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    color: '#4f8fe0',
    category: 'Stablecoin · US dollar',
    tagline: 'A fully reserved dollar stablecoin issued by Circle.',
    deposits: 'soon',
    networks: [
      { name: 'Ethereum', standard: 'ERC-20' },
      { name: 'BNB Smart Chain', standard: 'BEP-20' },
      { name: 'Arbitrum, Polygon, Avalanche', standard: 'Native USDC' },
    ],
    facts: [
      { label: 'Launched', value: '2018' },
      { label: 'Issuer', value: 'Circle' },
      { label: 'Peg', value: '1 USDC ≈ 1 US dollar' },
      { label: 'Backing', value: 'Cash and short-term US Treasuries' },
      { label: 'Reserve reports', value: 'Published regularly' },
      { label: 'Decimals', value: '6' },
    ],
    about: [
      'USD Coin (USDC) is a stablecoin issued by Circle and designed to be redeemable one-for-one for US dollars. Circle publishes regular reports on the reserves backing USDC, which are held in cash and short-term US government securities.',
      'USDC is available natively on many blockchains, including Ethereum, Solana, Arbitrum, Polygon and Avalanche. As with any token, the network matters: USDC on one chain must be bridged or swapped to reach another.',
      'In March 2023 USDC briefly fell below $1 after part of its reserves was caught up in the failure of a US bank; it returned to its peg within days once those funds were secured.',
    ],
    useCases: [
      { title: 'Dollar savings', body: 'Hold a dollar balance with frequent reserve reporting.' },
      { title: 'Settlement', body: 'Widely used by businesses and apps to settle payments on-chain.' },
      { title: 'Earning yield', body: 'Like USDT, USDC is commonly used to earn stable, variable yield.' },
    ],
    depositNotes: ['USDC deposits on Ethereum (ERC-20) are part of our next update, together with other popular ERC-20 and BEP-20 tokens.'],
    risks: 'USDC depends on its issuer and the banks holding its reserves. Issuers can freeze tokens at specific addresses.',
    faq: [
      { q: 'What is the difference between USDT and USDC?', a: 'Both aim to be worth $1. They are issued by different companies with different reserve and reporting practices, and many people hold both to spread issuer risk.' },
      { q: 'When will USDC deposits open?', a: 'In our next update, which adds ERC-20 and BEP-20 token support.' },
    ],
  },
  {
    symbol: 'TRX',
    name: 'TRON',
    color: '#e0605a',
    category: 'Layer 1 · Stablecoin transfers',
    tagline: 'A high-throughput chain that carries a large share of USDT transfers.',
    deposits: 'soon',
    networks: [{ name: 'TRON', standard: 'Native TRX · TRC-20 tokens' }],
    facts: [
      { label: 'Mainnet', value: '2018' },
      { label: 'Founded by', value: 'Justin Sun' },
      { label: 'Consensus', value: 'Delegated Proof of Stake' },
      { label: 'Block producers', value: '27 Super Representatives' },
      { label: 'Block time', value: 'About 3 seconds' },
      { label: 'Token standard', value: 'TRC-20' },
    ],
    about: [
      'TRON is a blockchain whose blocks are produced by 27 elected “Super Representatives”. That design keeps transactions fast and cheap, and it has made TRON one of the most used networks for sending USDT, especially in emerging markets.',
      'Fees on TRON are paid with resources called bandwidth and energy, which can be obtained by staking TRX or paid for by burning a small amount of TRX.',
      'TRON addresses start with the letter T. Tokens on TRON follow the TRC-20 standard.',
    ],
    useCases: [
      { title: 'USDT transfers', body: 'A large share of all USDT moves on TRON as TRC-20.' },
      { title: 'Cheap payments', body: 'Transfers settle in seconds with low fees.' },
      { title: 'Staking for resources', body: 'Staked TRX provides the energy needed for transactions.' },
    ],
    depositNotes: ['TRX and TRC-20 USDT deposits are planned for our next update.'],
    risks: 'TRON’s small set of block producers makes it relatively centralised, and TRX’s price is volatile.',
    faq: [
      { q: 'Can I send TRC-20 USDT now?', a: 'Not yet. Please use Ethereum (ERC-20) USDT until TRON support is announced.' },
      { q: 'Why are TRON fees so low?', a: 'TRON uses staked resources (bandwidth and energy) instead of a fee market, and its small validator set processes blocks quickly.' },
    ],
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    color: '#4a7fd4',
    category: 'Layer 1 · Research-driven',
    tagline: 'A proof-of-stake blockchain built through peer-reviewed research.',
    deposits: 'soon',
    networks: [{ name: 'Cardano', standard: 'Native ADA · native assets' }],
    facts: [
      { label: 'Launched', value: '2017' },
      { label: 'Founded by', value: 'Charles Hoskinson' },
      { label: 'Consensus', value: 'Ouroboros Proof of Stake' },
      { label: 'Maximum supply', value: '45 billion ADA' },
      { label: 'Epoch length', value: '5 days' },
      { label: 'Ledger model', value: 'Extended UTXO' },
    ],
    about: [
      'Cardano is a proof-of-stake blockchain whose development emphasises academic research and formal methods. Its consensus protocol, Ouroboros, was published and peer reviewed before it was deployed.',
      'Holders can delegate ADA to stake pools without locking it up, and rewards are paid every five-day epoch. Cardano added smart contracts in 2021 and uses an “extended UTXO” model, which works differently from Ethereum’s account model.',
      'Tokens on Cardano are “native assets”, handled directly by the ledger rather than by smart contracts.',
    ],
    useCases: [
      { title: 'Liquid staking', body: 'Delegate ADA to a pool and earn rewards while keeping your coins spendable.' },
      { title: 'Governance', body: 'ADA holders take part in on-chain governance decisions.' },
      { title: 'Native tokens', body: 'Create and move tokens without custom contracts.' },
    ],
    depositNotes: ['Cardano deposits are planned for our next update.'],
    risks: 'ADA is volatile, and Cardano’s smart-contract ecosystem is smaller than Ethereum’s.',
    faq: [
      { q: 'Can I deposit ADA now?', a: 'Not yet. Cardano is part of our multi-chain update.' },
      { q: 'Does staking ADA lock it up?', a: 'On Cardano itself, delegation does not lock coins. On BitInvest Capital, yield is paid by our platform at the rates shown, not by Cardano staking.' },
    ],
  },
  {
    symbol: 'TON',
    name: 'Toncoin',
    color: '#2fb5e8',
    category: 'Layer 1 · Messaging integration',
    tagline: 'The Open Network, closely integrated with the Telegram app.',
    deposits: 'soon',
    networks: [{ name: 'TON', standard: 'Native TON · Jettons', note: 'Requires a memo (comment)' }],
    facts: [
      { label: 'Origin', value: 'Designed by the Telegram team, 2018' },
      { label: 'Maintained by', value: 'The TON community and TON Foundation' },
      { label: 'Consensus', value: 'Proof of Stake' },
      { label: 'Architecture', value: 'Sharded (“infinite sharding”)' },
      { label: 'Token standard', value: 'Jettons' },
      { label: 'Deposits on exchanges', value: 'Usually by memo/comment' },
    ],
    about: [
      'TON (The Open Network) was originally designed by the team behind Telegram. Telegram stepped back from the project in 2020, and it has since been developed by an open-source community and the TON Foundation.',
      'TON splits its workload across many shards so it can scale as usage grows. Its close integration with Telegram, including a built-in wallet, has brought it a large number of users.',
      'Exchanges usually receive TON at a shared address and identify customers by a memo (also called a comment) attached to the transfer.',
    ],
    useCases: [
      { title: 'In-app payments', body: 'Send and receive value inside Telegram.' },
      { title: 'Mini-apps', body: 'Telegram mini-apps use TON for payments and rewards.' },
      { title: 'Staking', body: 'TON can be staked through nominator pools.' },
    ],
    depositNotes: ['TON deposits will open with memo-based deposits once our custody integration is live.'],
    risks: 'Toncoin is volatile and its growth depends heavily on Telegram. Transfers without the correct memo can be hard to recover.',
    faq: [
      { q: 'When can I deposit TON?', a: 'After our custody integration goes live. Prices and charts are available now.' },
      { q: 'What is a memo?', a: 'A short code you include with a TON transfer so the receiving platform knows which customer it belongs to.' },
    ],
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    color: '#f08a5d',
    category: 'Layer 1 · Subnets',
    tagline: 'A fast-finality platform with an Ethereum-compatible C-Chain.',
    deposits: 'soon',
    networks: [{ name: 'Avalanche C-Chain', standard: 'Native AVAX · ERC-20-style tokens' }],
    facts: [
      { label: 'Mainnet', value: 'September 2020' },
      { label: 'Developed by', value: 'Ava Labs' },
      { label: 'Consensus', value: 'Avalanche consensus (Proof of Stake)' },
      { label: 'Maximum supply', value: '720 million AVAX' },
      { label: 'Finality', value: 'Typically under 2 seconds' },
      { label: 'EVM compatible', value: 'Yes (C-Chain)' },
    ],
    about: [
      'Avalanche is a smart-contract platform known for confirming transactions in about a second. Its primary network has three chains; the C-Chain runs the Ethereum Virtual Machine, so Ethereum tools and addresses work on it.',
      'Projects can launch their own custom blockchains, called subnets or L1s, that use Avalanche’s validator network. Part of every transaction fee is burned.',
      'Because C-Chain addresses look exactly like Ethereum addresses, choosing the correct network when sending is essential.',
    ],
    useCases: [
      { title: 'Fast DeFi', body: 'Near-instant finality suits trading and lending.' },
      { title: 'Custom chains', body: 'Institutions and games run dedicated Avalanche L1s.' },
      { title: 'Staking', body: 'AVAX secures the network through staking.' },
    ],
    depositNotes: ['Avalanche C-Chain deposits are planned for our next update.'],
    risks: 'AVAX is volatile, and its ecosystem competes with many other EVM-compatible chains.',
    faq: [
      { q: 'Is an Avalanche address the same as an Ethereum address?', a: 'C-Chain addresses use the same format, but the networks are separate. Funds sent on the wrong network won’t arrive where you expect.' },
    ],
  },
  {
    symbol: 'POL',
    name: 'Polygon',
    color: '#8a63d2',
    category: 'Ethereum scaling',
    tagline: 'Polygon’s token (formerly MATIC), powering the Polygon PoS chain.',
    deposits: 'soon',
    networks: [{ name: 'Polygon PoS', standard: 'Native POL · ERC-20-style tokens' }],
    facts: [
      { label: 'Project launched', value: '2017 (as Matic Network)' },
      { label: 'Token migration', value: 'MATIC → POL, September 2024' },
      { label: 'Main chain', value: 'Polygon PoS' },
      { label: 'Consensus', value: 'Proof of Stake' },
      { label: 'EVM compatible', value: 'Yes' },
      { label: 'Typical fee', value: 'Fractions of a cent' },
    ],
    about: [
      'Polygon started in 2017 as Matic Network, a project to make Ethereum cheaper and faster to use. Its Polygon PoS chain is compatible with Ethereum and is widely used for payments, games and stablecoin transfers.',
      'In September 2024 the MATIC token was upgraded to POL, which now pays fees on Polygon PoS and secures the network through staking. Older references to MATIC usually mean the same project.',
      'Polygon also develops an “aggregation layer” intended to connect many chains so they can share liquidity.',
    ],
    useCases: [
      { title: 'Cheap transfers', body: 'Move stablecoins and tokens for a fraction of a cent.' },
      { title: 'Payments and games', body: 'Popular with brands and gaming studios.' },
      { title: 'Staking', body: 'POL secures Polygon PoS through validators.' },
    ],
    depositNotes: ['Polygon deposits are planned for our next update.'],
    risks: 'POL is volatile, and the Polygon ecosystem competes with many Ethereum layer 2 networks.',
    faq: [
      { q: 'Is POL the same as MATIC?', a: 'POL replaced MATIC in September 2024 at a 1:1 rate. Most exchanges converted balances automatically.' },
    ],
  },
  {
    symbol: 'ATOM',
    name: 'Cosmos',
    color: '#7b83c9',
    category: 'Layer 1 · Interoperability',
    tagline: 'The hub of an “internet of blockchains” connected by IBC.',
    deposits: 'soon',
    networks: [{ name: 'Cosmos Hub', standard: 'Native ATOM', note: 'Requires a memo' }],
    facts: [
      { label: 'Launched', value: '2019' },
      { label: 'Consensus', value: 'CometBFT (formerly Tendermint) Proof of Stake' },
      { label: 'Interoperability', value: 'Inter-Blockchain Communication (IBC)' },
      { label: 'Developer kit', value: 'Cosmos SDK' },
      { label: 'Unbonding period', value: '21 days' },
      { label: 'Address prefix', value: 'cosmos1…' },
    ],
    about: [
      'Cosmos is an ecosystem of independent blockchains that can talk to each other through a standard called IBC (Inter-Blockchain Communication). Many well-known chains are built with the Cosmos SDK.',
      'ATOM is the native token of the Cosmos Hub, one chain in that ecosystem. It is used for staking, network fees and governance.',
      'Exchanges often receive ATOM at a shared address and identify customers with a memo.',
    ],
    useCases: [
      { title: 'Cross-chain transfers', body: 'IBC moves tokens between Cosmos chains natively.' },
      { title: 'Staking', body: 'ATOM is staked to validators to secure the Hub.' },
      { title: 'Governance', body: 'Holders vote on Hub proposals.' },
    ],
    depositNotes: ['Cosmos Hub deposits are planned for our next update and will require a memo.'],
    risks: 'ATOM is volatile, and value in the Cosmos ecosystem is spread across many separate chains.',
    faq: [
      { q: 'What is IBC?', a: 'A protocol that lets independent blockchains send tokens and messages to each other without a central bridge operator.' },
    ],
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    color: '#5b8ff0',
    category: 'Ethereum layer 2',
    tagline: 'The governance token of Arbitrum, a leading Ethereum rollup.',
    deposits: 'soon',
    networks: [{ name: 'Arbitrum One', standard: 'ERC-20 (fees paid in ETH)' }],
    facts: [
      { label: 'Network launched', value: '2021' },
      { label: 'Developed by', value: 'Offchain Labs' },
      { label: 'Technology', value: 'Optimistic rollup' },
      { label: 'Token launched', value: 'March 2023' },
      { label: 'Maximum supply', value: '10 billion ARB' },
      { label: 'Gas token', value: 'ETH' },
    ],
    about: [
      'Arbitrum One is a “layer 2” network that processes transactions off Ethereum and posts compressed results back to it. This keeps fees low while inheriting much of Ethereum’s security.',
      'It is an optimistic rollup: transactions are assumed valid unless someone proves otherwise during a challenge period. Withdrawals back to Ethereum through the official bridge therefore take about a week.',
      'ARB is Arbitrum’s governance token, used to vote on upgrades and treasury decisions. Network fees on Arbitrum are paid in ETH, not ARB.',
    ],
    useCases: [
      { title: 'Cheaper Ethereum', body: 'Use Ethereum apps with much lower fees.' },
      { title: 'DeFi', body: 'Arbitrum hosts one of the largest DeFi ecosystems outside Ethereum.' },
      { title: 'Governance', body: 'ARB holders vote on the network’s future.' },
    ],
    depositNotes: ['Arbitrum One deposits are planned for our next update.'],
    risks: 'ARB is volatile, and a large share of its supply unlocks to team members and investors over time.',
    faq: [
      { q: 'Do I need ARB to use Arbitrum?', a: 'No. Fees on Arbitrum are paid in ETH. ARB is used for governance.' },
    ],
  },
];

export const COIN_INFO: Record<string, CoinInfo> = Object.fromEntries(COIN_LIST.map((c) => [c.symbol, c]));

export const coinColor = (symbol: string) => COIN_INFO[symbol]?.color ?? 'var(--mist)';

export const LIVE_DEPOSIT_COINS = COIN_LIST.filter((c) => c.deposits === 'live').map((c) => c.symbol);

/** Networks on the roadmap, with what they unlock. */
export const NETWORKS: { name: string; coins: string; standard: string; status: DepositStatus }[] = [
  { name: 'Bitcoin', coins: 'BTC', standard: 'Native SegWit', status: 'live' },
  { name: 'Ethereum', coins: 'ETH, USDT and selected ERC-20 tokens', standard: 'ERC-20', status: 'live' },
  { name: 'BNB Smart Chain', coins: 'BNB and selected BEP-20 tokens', standard: 'BEP-20', status: 'soon' },
  { name: 'Solana', coins: 'SOL', standard: 'SPL', status: 'soon' },
  { name: 'Polygon PoS', coins: 'POL', standard: 'EVM', status: 'soon' },
  { name: 'Cardano', coins: 'ADA', standard: 'Native assets', status: 'soon' },
  { name: 'XRP Ledger', coins: 'XRP', standard: 'Destination tag', status: 'soon' },
  { name: 'TRON', coins: 'TRX, USDT (TRC-20)', standard: 'TRC-20', status: 'soon' },
  { name: 'Avalanche C-Chain', coins: 'AVAX', standard: 'EVM', status: 'soon' },
  { name: 'Cosmos Hub', coins: 'ATOM', standard: 'Memo', status: 'soon' },
  { name: 'TON', coins: 'TON', standard: 'Memo', status: 'soon' },
  { name: 'Arbitrum One', coins: 'ARB', standard: 'EVM (layer 2)', status: 'soon' },
];
