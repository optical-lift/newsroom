import Link from "next/link";

const stages = [
  ["1", "Source custody", "Create a Recording and preserve the original audio asset in private storage."],
  ["2", "Processing", "Validate, normalize, chunk and transcribe without making provider limits visible to the reporter."],
  ["3", "Addressable transcript", "Store stable timestamped segments and immutable transcript revisions."],
  ["4", "Correction", "Correct words and speakers without erasing prior machine or human states."],
  ["5", "Playback & search", "Search an archive, open a segment and hear the matching source audio."],
  ["6", "Speaker structure", "Keep diarization, speaker labels and human identity assignments distinct."],
  ["7", "Evidence contract", "Expose stable recording/segment/time references without leaking storage internals."]
] as const;

export default function TranscriptsDesk() {
  return (
    <>
      <style>{`
        .transcript-header { margin-bottom: 24px; }
        .transcript-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; padding: 18px 20px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .transcript-toolbar h2, .transcript-library h2, .transcript-proof h2 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 500; }
        .transcript-toolbar h2 { font-size: 25px; }
        .transcript-toolbar p { margin: 5px 0 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
        .disabled-upload { border: 0; border-radius: 8px; padding: 11px 15px; background: #d9ddd9; color: #717a74; font-weight: 800; cursor: not-allowed; }
        .transcript-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(300px, .7fr); gap: 16px; align-items: start; }
        .transcript-library, .transcript-proof { padding: 24px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .transcript-library h2, .transcript-proof h2 { font-size: 27px; }
        .library-empty { margin-top: 18px; padding: 30px 24px; border: 1px dashed #c8ccc7; border-radius: 10px; background: #f0efe9; }
        .library-empty strong { display: block; margin-bottom: 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 23px; font-weight: 500; }
        .library-empty p { margin: 0; max-width: 650px; color: var(--muted); font-size: 13px; line-height: 1.55; }
        .proof-list { display: grid; margin-top: 16px; }
        .proof-row { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid #ecebe5; }
        .proof-row:first-child { border-top: 0; }
        .proof-number { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; background: var(--soft-accent); color: var(--accent); font-size: 10px; font-weight: 900; }
        .proof-row strong { display: block; font-size: 12px; }
        .proof-row span { display: block; margin-top: 3px; color: var(--muted); font-size: 11px; line-height: 1.45; }
        .transcript-contract { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
        .transcript-contract article { padding: 20px; border-top: 2px solid var(--ink); }
        .transcript-contract h3 { margin: 0 0 8px; font-size: 13px; }
        .transcript-contract p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
        .transcript-backlink { margin-top: 24px; }
        .transcript-backlink a { color: var(--accent); font-weight: 800; }
        @media (max-width: 900px) {
          .transcript-grid, .transcript-contract { grid-template-columns: 1fr; }
          .transcript-toolbar { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      <header className="page-header transcript-header">
        <p className="eyebrow">Mitchell Republic · Transcript Core</p>
        <div className="title-row">
          <h1>Transcripts</h1>
          <span className="status status-architecture-ready">Custody spine defined</span>
        </div>
        <p>
          Recorded audio becomes durable, searchable, source-linked evidence. The recording remains the source; transcript text is a revisioned derivative.
        </p>
      </header>

      <section className="transcript-toolbar">
        <div>
          <p className="eyebrow">Recording library</p>
          <h2>Forum workspace</h2>
          <p>Private recording upload remains disabled until Newsroom authentication and private storage are connected.</p>
        </div>
        <button className="disabled-upload" type="button" disabled aria-disabled="true">Upload recording</button>
      </section>

      <div className="transcript-grid">
        <section className="transcript-library">
          <p className="eyebrow">Library</p>
          <h2>No private recordings are connected</h2>
          <div className="library-empty">
            <strong>This is intentionally empty.</strong>
            <p>
              The domain model, private-storage contract and workspace isolation rules now exist in code. We will not put Marshall&apos;s interviews or meeting audio here until the dedicated Newsroom data boundary and authorization path are live.
            </p>
          </div>
        </section>

        <section className="transcript-proof">
          <p className="eyebrow">Build spine</p>
          <h2>What has to become true</h2>
          <div className="proof-list">
            {stages.map(([number, title, description]) => (
              <div className="proof-row" key={number}>
                <div className="proof-number">{number}</div>
                <div>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="transcript-contract">
        <article>
          <h3>Newsroom owns access</h3>
          <p>One Forum workspace and membership model will serve Transcripts, Markets, Municipal and Sports. Transcript Core does not create a second account system.</p>
        </article>
        <article>
          <h3>Transcript Core owns evidence</h3>
          <p>Recording identity, original audio custody, processing state, transcript revisions, timestamped segments and playback references stay inside the transcript domain.</p>
        </article>
        <article>
          <h3>Atlas stays optional</h3>
          <p>Nothing about upload, transcription, correction, search or playback requires Atlas. A later adapter may consume stable evidence references.</p>
        </article>
      </section>

      <section className="evidence-rule">
        <strong>Next implementation</strong>
        <p>
          Provision the dedicated Newsroom auth/database/storage boundary, apply the shared workspace + Transcript Core migration, then enable the first private recording upload. Only after original-audio custody is proven do we connect long-recording transcription.
        </p>
      </section>

      <p className="quiet-note transcript-backlink"><Link href="/forum">← Back to Today</Link></p>
    </>
  );
}
