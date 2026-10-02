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
  const activeDesks = forumWorkspace.desks.filter((desk) => desk.status === "connected");
  const laterDesks = forumWorkspace.desks.filter((desk) => desk.status !== "connected");

  return (
    <>
      <header className="today-header">
        <div>
          <p className="eyebrow">{todayLabel()}</p>
          <h1>Today</h1>
        </div>
        <p>One reporting desk for source records, recordings, recurring copy and production work.</p>
      </header>

      <div className="today-workspace">
        <section className="today-section" aria-labelledby="today-reporting-tools">
          <div className="today-section-head">
            <h2 id="today-reporting-tools">Reporting tools</h2>
            <span>{activeDesks.length} available</span>
          </div>
          <div className="today-tool-list">
            {activeDesks.map((desk) => (
              <Link className="today-tool-row" href={`/forum/${desk.slug}`} key={desk.slug}>
                <span className="today-tool-title">{desk.label}</span>
                <span className="today-tool-description">{desk.description}</span>
                <span className="today-tool-open">Open →</span>
              </Link>
            ))}
          </div>
        </section>

        {laterDesks.length ? (
          <section className="today-section today-later" aria-labelledby="today-later-tools">
            <div className="today-section-head">
              <h2 id="today-later-tools">Coming later</h2>
            </div>
            <div className="today-tool-list">
              {laterDesks.map((desk) => (
                <div className="today-tool-row" key={desk.slug}>
                  <span className="today-tool-title">{desk.label}</span>
                  <span className="today-tool-description">{desk.description}</span>
                  <span className="today-tool-open">Not available</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
