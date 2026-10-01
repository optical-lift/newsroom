import Link from "next/link";

const sourceRows = [
  { label: "Dow Jones", source: "MarketWatch", state: "Not connected" },
  { label: "S&P 500", source: "MarketWatch", state: "Not connected" },
  { label: "Nasdaq", source: "MarketWatch", state: "Not connected" },
  { label: "Local Grain — corn", source: "CHS Farmers Alliance · Mitchell cash bids", state: "Not connected" },
  { label: "Local Grain — beans", source: "CHS Farmers Alliance · Mitchell cash bids", state: "Not connected" },
  { label: "Local Grain — wheat", source: "CHS Farmers Alliance · Mitchell cash bids", state: "Not connected" },
  { label: "POET Mitchell — corn", source: "POET Mitchell", state: "Not connected" },
  { label: "High Plains Processing — beans", source: "HPP cash bids", state: "Not connected" }
] as const;

export default function MarketsDesk() {
  return (
    <>
      <style>{`
        .markets-header { margin-bottom: 24px; }
        .markets-subnav { display: flex; gap: 8px; margin: 0 0 22px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
        .markets-subnav span { padding: 8px 11px; border-radius: 7px; color: var(--muted); font-size: 12px; font-weight: 800; }
        .markets-subnav .active { background: var(--ink); color: white; }
        .markets-status-card { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(220px, .6fr); gap: 28px; padding: 28px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .markets-status-card h2, .markets-preview h2, .markets-sources h2 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 500; }
        .markets-status-card h2 { max-width: 760px; font-size: 31px; line-height: 1.16; }
        .markets-status-card > div > p:last-child { color: var(--muted); line-height: 1.55; }
        .markets-status-meta { display: grid; align-content: start; grid-template-columns: 1fr; gap: 4px; padding-left: 24px; border-left: 1px solid var(--line); }
        .markets-status-meta span { margin-top: 8px; color: var(--muted); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
        .markets-status-meta span:first-child { margin-top: 0; }
        .markets-status-meta strong { font-size: 13px; line-height: 1.4; }
        .markets-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .78fr); gap: 16px; margin-top: 16px; align-items: start; }
        .markets-preview, .markets-sources { padding: 24px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .markets-preview h2, .markets-sources h2 { font-size: 27px; }
        .market-block { margin: 18px 0 0; padding: 22px; border-radius: 10px; background: var(--ink); color: #f7f4ec; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; line-height: 1.75; white-space: pre-wrap; }
        .market-block .section { color: #aeb9b2; font-size: 11px; font-weight: 800; letter-spacing: .09em; }
        .market-block .placeholder { color: #d8ded9; }
        .market-rule { margin: 14px 0 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
        .source-contract { display: grid; margin-top: 16px; }
        .source-contract-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 12px; padding: 11px 0; border-top: 1px solid #ecebe5; }
        .source-contract-row:first-child { border-top: 0; }
        .source-contract-row strong { font-size: 12px; line-height: 1.35; }
        .source-contract-row span { color: var(--muted); font-size: 11px; line-height: 1.4; }
        .source-contract-row small { grid-column: 1 / -1; color: #8b938e; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
        .readiness-strip { display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: center; margin-top: 16px; padding: 18px 22px; border: 1px solid var(--line); border-radius: 12px; background: #ebece6; }
        .readiness-strip strong { font-family: Georgia, 'Times New Roman', serif; font-size: 27px; font-weight: 500; }
        .readiness-strip p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
        .markets-backlink { margin-top: 24px; }
        .markets-backlink a { color: var(--accent); font-weight: 800; }
        @media (max-width: 900px) {
          .markets-status-card, .markets-layout { grid-template-columns: 1fr; }
          .markets-status-meta { padding-left: 0; padding-top: 18px; border-left: 0; border-top: 1px solid var(--line); }
        }
      `}</style>

      <header className="page-header markets-header">
        <p className="eyebrow">Mitchell Republic · shared newsroom process</p>
        <div className="title-row">
          <h1>Markets</h1>
          <span className="status status-architecture-ready">Mitchell spec recovered</span>
        </div>
        <p>
          The Mitchell Markets Update is an exact eight-value block shared by the Forum workspace. It is designed for repeatable publication use, not a prose market summary.
        </p>
      </header>

      <nav className="markets-subnav" aria-label="Markets sections">
        <span className="active">Today</span>
        <span>Archive</span>
        <span>Sources</span>
      </nav>

      <section className="markets-status-card">
        <div>
          <p className="eyebrow">Recovered Marshall specification</p>
          <h2>Eight values, four source families, one exact Mitchell block.</h2>
          <p>
            Live collection is not connected yet. The page now reflects the original Mitchell output instead of a generic markets dashboard, and each edition will stay incomplete until every required value is present and current.
          </p>
        </div>
        <div className="markets-status-meta">
          <span>Owner</span>
          <strong>Forum workspace</strong>
          <span>Required values</span>
          <strong>8</strong>
          <span>Publication state</span>
          <strong>READY only at 8/8</strong>
        </div>
      </section>

      <div className="markets-layout">
        <section className="markets-preview">
          <p className="eyebrow">Exact-format preview</p>
          <h2>Mitchell Markets Update</h2>
          <div className="market-block" aria-label="Markets Update format preview">
            <span className="section">MARKETS</span>{"\n"}
            Dow Jones: <span className="placeholder">— (—)</span>{"\n"}
            S&amp;P 500: <span className="placeholder">— (—)</span>{"\n"}
            Nasdaq: <span className="placeholder">— (—)</span>{"\n\n"}
            <span className="section">LOCAL GRAIN</span>{"\n"}
            Corn: <span className="placeholder">—</span>{"\n"}
            Beans: <span className="placeholder">—</span>{"\n"}
            Wheat: <span className="placeholder">—</span>{"\n\n"}
            POET Mitchell Corn: <span className="placeholder">—</span>{"\n"}
            High Plains Processing Beans: <span className="placeholder">—</span>
          </div>
          <p className="market-rule">
            Change formatting is preserved as a signed parenthetical value—for example <code>(-0.06)</code>—rather than being rewritten into prose.
          </p>
        </section>

        <section className="markets-sources">
          <p className="eyebrow">Source contract</p>
          <h2>Required collection</h2>
          <div className="source-contract">
            {sourceRows.map((row) => (
              <div className="source-contract-row" key={row.label}>
                <strong>{row.label}</strong>
                <span>{row.source}</span>
                <small>{row.state}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="readiness-strip">
        <strong>0/8 LIVE</strong>
        <p>
          The first automation tranche will fetch and timestamp all eight values, validate freshness, and return either <b>8/8 READY</b> or name the stale/missing field. We will shadow-run it against Marshall&apos;s manual block before scheduled delivery is trusted.
        </p>
      </section>

      <section className="evidence-rule">
        <strong>Next build</strong>
        <p>
          Connect the four source families and certify the eight-value shadow run. Once Markets is dependable, the next product tranche is Transcript Core; Sports follows after that.
        </p>
      </section>

      <p className="quiet-note markets-backlink">
        <Link href="/forum">← Back to Today</Link>
      </p>
    </>
  );
}
