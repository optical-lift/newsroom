import { notFound } from "next/navigation";
import MarketsDesk from "@/components/markets-desk";
import MunicipalDesk from "@/components/municipal-desk";
import TranscriptsDesk from "@/components/transcripts-desk";
import { municipalQuery } from "@/lib/municipal/civicclerk";
import { getDesk } from "@/lib/newsroom";

export const dynamic = "force-dynamic";

type DeskPageProps = {
  params: Promise<{ desk: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DeskPage({ params, searchParams }: DeskPageProps) {
  const { desk: deskSlug } = await params;
  const desk = getDesk(deskSlug);

  if (!desk) notFound();

  if (desk.slug === "municipal") {
    const queryParams = await searchParams;
    const query = municipalQuery(first(queryParams.body), first(queryParams.date));
    return <MunicipalDesk query={query} />;
  }

  if (desk.slug === "markets") {
    return <MarketsDesk />;
  }

  if (desk.slug === "transcripts") {
    return <TranscriptsDesk />;
  }

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
          <h3>Before private data</h3>
          <p>Authentication and server-side authorization must be active and tested before private newsroom sources are connected.</p>
        </article>
      </section>
    </>
  );
}
