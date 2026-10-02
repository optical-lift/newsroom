import TranscriptLibrary from "@/components/transcript-library";

type TranscriptsDeskProps = {
  publicationId: string;
  publicationName: string;
  workspaceId: string;
};

export default function TranscriptsDesk({ publicationId, publicationName, workspaceId }: TranscriptsDeskProps) {
  return (
    <>
      <header className="page-header transcript-library-header">
        <p className="eyebrow">{publicationName}</p>
        <h1>Transcripts</h1>
        <p>Recent recordings, reporting collections and transcript work.</p>
      </header>
      <TranscriptLibrary publicationId={publicationId} publicationName={publicationName} workspaceId={workspaceId} />
    </>
  );
}
