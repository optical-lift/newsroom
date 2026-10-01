import { notFound } from "next/navigation";
import { getDesk } from "@/lib/newsroom";

export default async function DeskPage({ params }: { params: Promise<{ desk: string }> }) {
  const { desk: deskSlug } = await params;
  const desk = getDesk(deskSlug);

  if (!desk) notFound();

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Mitchell Republic</p>
        <div className="title-row">
          <h1>{desk.label}</h1>
          <span className={`status status-${desk.status}`}>{desk.statusLabel}</span>
        </div>
        <p>{desk.description}</p>
      </header>

      <section className="empty-state">
        <p className="eyebrow">Current state</p>
        <h2>This desk is intentionally not connected to live newsroom data yet.</h2>
        <p>{desk.nextStep}</p>
      </section>

      <section className="boundary-grid">
        <article>
          <h3>What Newsroom will own</h3>
          <p>Human navigation, workspace access, presentation and the shared newsroom view.</p>
        </article>
        <article>
          <h3>What stays downstream</h3>
          <p>The source-specific service retains evidence custody, provenance and its own domain contract.</p>
        </article>
        <article>
          <h3>Before real data</h3>
          <p>Authentication and server-side authorization must be active and tested first.</p>
        </article>
      </section>
    </>
  );
}
