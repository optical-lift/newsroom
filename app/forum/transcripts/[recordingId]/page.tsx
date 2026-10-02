import TranscriptDocument from "@/components/transcript-document";
import TranscriptRecoveryPanel from "@/components/transcript-recovery-panel";
import { forumTranscriptWorkspaceBinding, requireForumContext } from "@/lib/auth/forum";

export const dynamic = "force-dynamic";

type TranscriptRecordingPageProps = {
  params: Promise<{ recordingId: string }>;
};

export default async function TranscriptRecordingPage({ params }: TranscriptRecordingPageProps) {
  const { recordingId } = await params;
  const { context } = await requireForumContext();
  const transcriptBinding = forumTranscriptWorkspaceBinding(context);

  if (!transcriptBinding) {
    return (
      <section className="empty-state">
        <h2>Transcripts are not connected for this publication.</h2>
        <p>The publication is available, but no Transcript Core workspace is bound.</p>
      </section>
    );
  }

  return (
    <>
      <TranscriptRecoveryPanel workspaceId={transcriptBinding.externalRef} recordingId={recordingId} />
      <TranscriptDocument
        publicationId={context.publication.id}
        publicationName={context.publication.name}
        workspaceId={transcriptBinding.externalRef}
        recordingId={recordingId}
      />
    </>
  );
}
