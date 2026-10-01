import Link from "next/link";
import { forumWorkspace } from "@/lib/newsroom";

export default function ForumTodayPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Thursday, Oct. 1, 2026</p>
        <h1>Today</h1>
        <p>One place for the reporting systems your newsroom uses. This first release establishes the workspace only; live source connections come after authentication.</p>
      </header>

      <section className="desk-grid" aria-label="Newsroom desks">
        {forumWorkspace.desks.map((desk) => (
          <Link className="desk-card" href={`/forum/${desk.slug}`} key={desk.slug}>
            <div className="desk-card-top">
              <h2>{desk.label}</h2>
              <span className={`status status-${desk.status}`}>{desk.statusLabel}</span>
            </div>
            <p>{desk.description}</p>
            <span className="card-link">Open desk →</span>
          </Link>
        ))}
      </section>

      <section className="principle-card">
        <p className="eyebrow">Governing rule</p>
        <h2>Evidence systems own the source. Newsroom owns the human workspace.</h2>
        <p>Reporters should be able to move from a signal to its underlying evidence without needing access to retrieval infrastructure, database credentials or Atlas.</p>
      </section>
    </>
  );
}
