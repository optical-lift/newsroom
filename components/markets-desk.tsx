import Link from "next/link";

const sections = [
  {
    title: "Agriculture",
    description: "Commodities and agricultural market signals with relevance to the Mitchell region and South Dakota producers."
  },
  {
    title: "Energy",
    description: "Fuel, crude oil, natural gas and other energy-market movement that can affect households, agriculture, transportation and local business."
  },
  {
    title: "Equities",
    description: "Major market movement and company developments when they have broader economic or regional relevance."
  },
  {
    title: "Interest rates",
    description: "Federal Reserve, Treasury and lending-rate signals that can affect borrowing, housing, municipal finance and business investment."
  },
  {
    title: "Regional & economic signals",
    description: "Economic indicators, employment, inflation and regional developments that can change the reporting picture for South Dakota."
  },
  {
    title: "Potential local reporting relevance",
    description: "The bridge from market movement to reporting questions: what might matter to Mitchell-area readers, governments, farms, employers and households."
  }
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
        .markets-status-card h2, .markets-section-card h2, .markets-governance h2 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 500; }
        .markets-status-card h2 { max-width: 760px; font-size: 31px; line-height: 1.16; }
        .markets-status-card > div > p:last-child { color: var(--muted); line-height: 1.55; }
        .markets-status-meta { display: grid; align-content: start; grid-template-columns: 1fr; gap: 4px; padding-left: 24px; border-left: 1px solid var(--line); }
        .markets-status-meta span { margin-top: 8px; color: var(--muted); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
        .markets-status-meta span:first-child { margin-top: 0; }
        .markets-status-meta strong { font-size: 13px; line-height: 1.4; }
        .markets-section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
        .markets-section-card { display: flex; flex-direction: column; min-height: 220px; padding: 24px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .markets-section-card h2 { font-size: 26px; line-height: 1.14; }
        .markets-section-card > p:not(.eyebrow) { color: var(--muted); line-height: 1.5; }
        .markets-empty-row { margin-top: auto; padding-top: 14px; border-top: 1px solid #ecebe5; color: #8b938e; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
        .markets-governance { margin-top: 16px; }
        .markets-governance h2 { max-width: 780px; font-size: 30px; line-height: 1.15; }
        .markets-governance > p:last-child { max-width: 820px; color: var(--muted); line-height: 1.55; }
        .markets-backlink { margin-top: 24px; }
        .markets-backlink a { color: var(--accent); font-weight: 800; }
        @media (max-width: 850px) {
          .markets-status-card, .markets-section-grid { grid-template-columns: 1fr; }
          .markets-status-meta { padding-left: 0; padding-top: 18px; border-left: 0; border-top: 1px solid var(--line); }
        }
      `}</style>

      <header className="page-header markets-header">
        <p className="eyebrow">Mitchell Republic · shared newsroom process</p>
        <div className="title-row">
          <h1>Markets</h1>
          <span className="status status-architecture-ready">Structure ready</span>
        </div>
        <p>
          One canonical Markets Update for the Forum workspace. The update will be produced once, stored by edition, and shared with the newsroom rather than living inside one reporter&apos;s account.
        </p>
      </header>

      <nav className="markets-subnav" aria-label="Markets sections">
        <span className="active">Today</span>
        <span>Archive</span>
        <span>Sources</span>
      </nav>

      <section className="markets-status-card">
        <div>
          <p className="eyebrow">Current state</p>
          <h2>The Markets Update surface is built. Live collection is not connected yet.</h2>
          <p>
            We have intentionally not invented a run time, source list or current figures. The next tranche will define the source contract and scheduled collection before this page begins publishing editions.
          </p>
        </div>
        <div className="markets-status-meta">
          <span>Owner</span>
          <strong>Forum workspace</strong>
          <span>Output</span>
          <strong>Canonical shared edition</strong>
        </div>
      </section>

      <section className="markets-section-grid" aria-label="Markets Update sections">
        {sections.map((section) => (
          <article className="markets-section-card" key={section.title}>
            <p className="eyebrow">Update section</p>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <div className="markets-empty-row">
              <span>No live data connected</span>
            </div>
          </article>
        ))}
      </section>

      <section className="record-panel markets-governance">
        <p className="eyebrow">Reporting rule</p>
        <h2>Market movement is not a story until the local relevance is shown.</h2>
        <p>
          The update can surface changes and potential implications, but it should keep market facts, local effects and reporting questions distinct. Source links, timestamps and prior-edition comparison belong with each live item once collection is connected.
        </p>
      </section>

      <section className="evidence-rule">
        <strong>Next build</strong>
        <p>
          Define the recurring source set, retrieval cadence and edition schema, then connect the first live Markets Update. Transcript Core follows after Markets is producing a dependable shared edition.
        </p>
      </section>

      <p className="quiet-note markets-backlink">
        <Link href="/forum">← Back to Today</Link>
      </p>
    </>
  );
}
