import { notFound } from "next/navigation";
import LegalNoticesDesk from "@/components/legal-notices-desk";
import MarketsDesk from "@/components/markets-desk";
import MunicipalDesk from "@/components/municipal-desk";
import { requireForumContext } from "@/lib/auth/forum";
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

  if (!desk || desk.slug === "transcripts") notFound();

  const { context } = await requireForumContext();

  if (desk.slug === "municipal") {
    const queryParams = await searchParams;
    const query = municipalQuery(first(queryParams.body), first(queryParams.date));
    return <MunicipalDesk query={query} />;
  }

  if (desk.slug === "markets") return <MarketsDesk />;
  if (desk.slug === "legal-notices") return <LegalNoticesDesk />;

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">{context.publication.name}</p>
        <div className="title-row">
          <h1>{desk.label}</h1>
          <span className={`status status-${desk.status}`}>{desk.statusLabel}</span>
        </div>
      </header>

      <section className="empty-state">
        <h2>Not available yet.</h2>
        <p>{desk.description}</p>
      </section>
    </>
  );
}
