import TranscriptsDesk from "@/components/transcripts-desk";
import { forumTranscriptWorkspaceBinding, requireForumContext } from "@/lib/auth/forum";

export const dynamic = "force-dynamic";

export default async function TranscriptLibraryPage() {
  const { context } = await requireForumContext();
  const transcriptBinding = forumTranscriptWorkspaceBinding(context);

  if (!transcriptBinding) {
    return (
      <section className="empty-state">
        <h2>Transcripts are not connected for this publication.</h2>
        <p>The Newsroom publication context is valid, but no Transcript Core workspace is bound.</p>
      </section>
    );
  }

  return (
    <TranscriptsDesk
      publicationId={context.publication.id}
      publicationName={context.publication.name}
      workspaceId={transcriptBinding.externalRef}
    />
  );
}
