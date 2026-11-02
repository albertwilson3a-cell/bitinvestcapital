/**
 * Illustration of the client dashboard (static sample figures, clearly
 * labelled), so visitors can see what they get after signing up.
 */
export function PortfolioPreview() {
  const holdings = [
    { sym: 'USDT', name: 'Tether USD', share: 50, color: 'var(--asset-usdt)', value: '$5,000.00' },
    { sym: 'BTC', name: 'Bitcoin', share: 30, color: 'var(--asset-btc)', value: '$3,000.00' },
    { sym: 'ETH', name: 'Ether', share: 20, color: 'var(--asset-eth)', value: '$2,000.00' },
  ];
  const bars = [18, 22, 21, 27, 30, 29, 34, 38, 37, 42, 46, 50];
  return (
    <div className="relative" aria-label="Illustration of the client dashboard">
      <div aria-hidden="true" className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--brass)_14%,transparent),transparent_70%)]" />
      <div className="relative rounded-2xl border border-rule-strong bg-vault p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-mist">Net worth</p>
          <span className="rounded-sm border border-rule-strong px-1.5 py-0.5 text-[10px] text-mist">Sample illustration</span>
        </div>
        <p className="mt-1 font-display text-[40px] leading-none">$10,000<span className="text-[22px] text-mist">.00</span></p>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full">
          {holdings.map((h) => <span key={h.sym} style={{ width: `${h.share}%`, background: h.color }} />)}
        </div>
        <ul className="mt-4 space-y-2.5 text-[13px]">
          {holdings.map((h) => (
            <li key={h.sym} className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="size-2 rounded-[2px]" style={{ background: h.color }} /> {h.name}</span>
              <span className="tabular text-mist">{h.share}% · {h.value}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-xl border border-rule bg-ink/50 p-4">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-mist">Projected returns</span>
            <span className="text-up">12 months</span>
          </div>
          <div className="mt-3 flex h-20 items-end gap-1.5">
            {bars.map((b, i) => <span key={i} className="flex-1 rounded-t-sm bg-brass/70" style={{ height: `${b * 1.6}%` }} />)}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-brass/30 bg-brass/10 px-4 py-3 text-[13px]">
          <span>Live chat with support</span>
          <span className="rounded-full bg-brass px-3 py-1 text-[12px] font-semibold text-primary-foreground">Open</span>
        </div>
      </div>
    </div>
  );
}
