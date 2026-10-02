import Link from "next/link";
import MarketCopyButton from "@/components/market-copy-button";
import ReportingDrawer from "@/components/reporting-drawer";
import { recordMarketsEdition } from "@/lib/markets/editions";
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
  const blockWithChanges = await recordMarketsEdition(snapshot);

  return (
    <>
      <style>{`
        .markets-header { margin-bottom: 16px; }
        .markets-card { max-width: 1040px; }
        .market-block { margin: 0; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .markets-missing { max-width: 1040px; margin: 14px 0 0; padding: 11px 13px; border-radius: 8px; background: #f7e8e5; color: #7b3028; font-size: 12px; line-height: 1.45; }
        .market-source-list { margin-top: 4px; border-top: 1px solid var(--line); }
        .market-source-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 11px; }
        .market-source-row span { grid-column: 1 / -1; color: var(--muted); font-size: 10px; }
        .market-source-row a { color: var(--accent); font-weight: 800; }
      `}</style>

      <header className="page-header markets-header">
        <div className="title-row">
          <div className="page-heading-copy">
            <p className="eyebrow">Mitchell Republic</p>
            <h1>Markets</h1>
            <p className="page-heading-meta">Updated {checkedAt} · <strong>{snapshot.availableCount}/8 sources {snapshot.ready ? "ready" : "available"}</strong></p>
          </div>
          <div className="newsroom-actions">
            {snapshot.ready ? <MarketCopyButton text={snapshot.block} label="Copy" /> : null}
            {blockWithChanges ? <MarketCopyButton text={blockWithChanges} label="Copy changes" variant="secondary" /> : null}
            <Link className="newsroom-action newsroom-action--secondary" href="/forum/markets">Refresh</Link>
            <ReportingDrawer label="Sources" title="Market sources" eyebrow="Source state">
              <div className="market-source-list">
                {snapshot.sources.map((source) => (
                  <div className="market-source-row" key={source.key}>
                    <strong>{source.label}</strong>
                    <a href={source.url} target="_blank" rel="noreferrer">Open ↗</a>
                    <span>{source.ok ? (source.asOf ? `As of ${source.asOf}` : `Checked ${checkedAt}`) : "Unavailable"}</span>
                  </div>
                ))}
              </div>
            </ReportingDrawer>
          </div>
        </div>
      </header>

      <section className="markets-card">
        <pre className="market-block">{snapshot.block}</pre>
      </section>

      {!snapshot.ready ? (
        <p className="markets-missing">Missing: {snapshot.missing.join(", ")}.</p>
      ) : null}
    </>
  );
}
