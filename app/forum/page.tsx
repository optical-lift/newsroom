import Link from "next/link";
import { forumWorkspace } from "@/lib/newsroom";

export const dynamic = "force-dynamic";

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

export default function ForumTodayPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">{todayLabel()}</p>
        <h1>Today</h1>
      </header>

      <section className="desk-grid" aria-label="Newsroom desks">
        {forumWorkspace.desks.map((desk) => (
          <Link className="desk-card" href={`/forum/${desk.slug}`} key={desk.slug}>
            <div className="desk-card-top">
              <h2>{desk.label}</h2>
              <span className={`status status-${desk.status}`}>{desk.statusLabel}</span>
            </div>
            <p>{desk.description}</p>
            <span className="card-link">Open →</span>
          </Link>
        ))}
      </section>
    </>
  );
}
