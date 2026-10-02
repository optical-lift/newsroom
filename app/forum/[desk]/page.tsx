import { notFound } from "next/navigation";
import LegalNoticesDesk from "@/components/legal-notices-desk";
import MarketsDesk from "@/components/markets-desk";
import MunicipalDesk from "@/components/municipal-desk";
import TranscriptsDesk from "@/components/transcripts-desk";
import { forumTranscriptWorkspaceBinding, requireForumContext } from "@/lib/auth/forum";
import { municipalQuery } from "@/lib/municipal/civicclerk";
import { getDesk } from "@/lib/newsroom";
import { FORUM_WORKSPACE_ID } from "@/lib/supabase/config";

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

  const { context } = await requireForumContext();

  if (desk.slug === "municipal") {
    const queryParams = await searchParams;
    const query = municipalQuery(first(queryParams.body), first(queryParams.date));
    return <MunicipalDesk query={query} />;
  }

  if (desk.slug === "markets") return <MarketsDesk />;
  if (desk.slug === "legal-notices") return <LegalNoticesDesk />;

  if (desk.slug === "transcripts") {
    const transcriptBinding = forumTranscriptWorkspaceBinding(context);

    // Transcript Core remains its own authority. Until the client studio accepts the
    // bound workspace as a prop, fail closed unless the governed binding matches the
    // existing domain adapter's compatibility workspace.
    if (!transcriptBinding || transcriptBinding.externalRef !== FORUM_WORKSPACE_ID) {
      return (
        <section className="empty-state">
          <h2>Transcripts are not connected for this publication.</h2>
          <p>The Newsroom publication context is valid, but no matching Transcript Core workspace is bound.</p>
        </section>
      );
    }

    return <TranscriptsDesk />;
  }

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
