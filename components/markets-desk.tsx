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

      <nav className="subnav" aria-label="Markets sections">
        <span className="subnav-active">Today</span>
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
