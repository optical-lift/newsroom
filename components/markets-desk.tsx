import Link from "next/link";
import MarketCopyButton from "@/components/market-copy-button";
import { collectMitchellMarkets } from "@/lib/markets/live";

function collectedLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function MarketsDesk() {
  const snapshot = await collectMitchellMarkets();
  const checkedAt = collectedLabel(snapshot.collectedAt);

  return (
    <>
      <style>{`
        .markets-header { margin-bottom: 22px; }
        .markets-header > p:last-child { margin-top: 8px; font-size: 13px; }
        .markets-card { max-width: 760px; padding: 24px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .market-block { margin: 0; padding: 22px; border-radius: 10px; background: var(--ink); color: #f7f4ec; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; line-height: 1.75; white-space: pre-wrap; }
        .market-actions { display: flex; gap: 10px; margin-top: 14px; }
        .market-copy-button, .market-refresh { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; border-radius: 7px; padding: 8px 12px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .market-copy-button { border: 0; background: var(--accent); color: white; }
        .market-refresh { border: 1px solid var(--line); background: transparent; color: var(--accent); }
        .markets-missing { max-width: 760px; margin: 14px 0 0; padding: 11px 13px; border-radius: 8px; background: #f7e8e5; color: #7b3028; font-size: 12px; line-height: 1.45; }
        .market-sources { max-width: 760px; margin-top: 14px; padding: 0 4px; }
        .market-sources summary { color: var(--muted); font-size: 12px; font-weight: 800; cursor: pointer; }
        .market-source-list { margin-top: 10px; border-top: 1px solid var(--line); }
        .market-source-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 12px; }
        .market-source-row span { color: var(--muted); }
        .market-source-row a { color: var(--accent); font-weight: 800; }
        @media (max-width: 680px) {
          .market-source-row { grid-template-columns: 1fr auto; }
          .market-source-row span { grid-column: 1 / -1; }
        }
      `}</style>

      <header className="page-header markets-header">
        <p className="eyebrow">Mitchell Republic</p>
        <div className="title-row">
          <h1>Markets</h1>
          <span className={`status ${snapshot.ready ? "status-connected" : "status-source-error"}`}>
            {snapshot.availableCount}/8 {snapshot.ready ? "ready" : "available"}
          </span>
        </div>
        <p>Updated {checkedAt}</p>
      </header>

      <section className="markets-card">
        <pre className="market-block">{snapshot.block}</pre>
        <div className="market-actions">
          {snapshot.ready ? <MarketCopyButton text={snapshot.block} /> : null}
          <Link className="market-refresh" href="/forum/markets">Refresh</Link>
        </div>
      </section>

      {!snapshot.ready ? (
        <p className="markets-missing">Missing: {snapshot.missing.join(", ")}.</p>
      ) : null}

      <details className="market-sources">
        <summary>Sources</summary>
        <div className="market-source-list">
          {snapshot.sources.map((source) => (
            <div className="market-source-row" key={source.key}>
              <strong>{source.label}</strong>
              <span>{source.ok ? (source.asOf ? `As of ${source.asOf}` : `Checked ${checkedAt}`) : "Unavailable"}</span>
              <a href={source.url} target="_blank" rel="noreferrer">Open</a>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
