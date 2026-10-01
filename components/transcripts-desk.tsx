import TranscriptWorkspaceClient from "@/components/transcript-workspace-client";

export default function TranscriptsDesk() {
  return (
    <>
      <style>{`
        .transcript-header { margin-bottom: 24px; }
        .transcript-header > p:last-child { margin-top: 8px; font-size: 13px; }
        .transcript-live-grid { display: grid; grid-template-columns: minmax(360px, .8fr) minmax(0, 1.2fr); gap: 16px; align-items: start; }
        .transcript-live-panel { padding: 24px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .transcript-live-panel h2 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 27px; font-weight: 500; }
        .transcript-live-panel > p:not(.eyebrow), .transcript-detail-empty p { color: var(--muted); line-height: 1.5; }
        .transcript-panel-heading, .recording-list-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .transcript-upload-card { display: grid; gap: 10px; margin-top: 18px; padding: 18px; border-radius: 10px; background: #f0efe9; }
        .transcript-live-panel input, .transcript-live-panel button { font: inherit; }
        .transcript-live-panel input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid var(--line); border-radius: 8px; background: white; }
        .transcript-live-panel button { border: 0; border-radius: 8px; padding: 10px 13px; background: var(--ink); color: white; font-size: 12px; font-weight: 800; cursor: pointer; }
        .transcript-live-panel button:disabled { opacity: .5; cursor: not-allowed; }
        .transcript-live-panel .quiet-button { padding: 7px 9px; background: transparent; color: var(--muted); border: 1px solid var(--line); }
        .transcript-upload-card label > span { display: block; margin-bottom: 5px; color: var(--muted); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
        .transcript-upload-card small { color: var(--muted); line-height: 1.4; }
        .transcript-upload-card progress { width: 100%; }
        .transcript-notice, .transcript-error { margin-top: 14px; padding: 11px 13px; border-radius: 8px; font-size: 12px; line-height: 1.45; }
        .transcript-notice { background: #edf1ea; color: #405248; }
        .transcript-error { background: #f7e8e5; color: #7b3028; }
        .recording-list { margin-top: 22px; }
        .recording-list-head { margin-bottom: 8px; }
        .recording-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 13px 10px !important; border-radius: 0 !important; border-top: 1px solid #ecebe5 !important; background: transparent !important; color: var(--ink) !important; text-align: left; }
        .recording-row.selected { background: #f0efe9 !important; }
        .recording-row strong, .recording-row small { display: block; }
        .recording-row small { margin-top: 3px; color: var(--muted); font-weight: 500; }
        .recording-state { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
        .transcript-empty { color: var(--muted); font-size: 12px; }
        .source-meta { font-size: 11px; word-break: break-word; color: var(--muted); }
        .transcript-audio { width: 100%; margin: 14px 0; }
        .processing-card { margin: 14px 0; padding: 14px; border: 1px solid var(--line); border-radius: 9px; background: #f0efe9; }
        .processing-card p { color: var(--muted); font-size: 12px; line-height: 1.45; }
        .transcript-search-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; margin: 14px 0 8px; }
        .transcript-search-row span { color: var(--muted); font-size: 10px; font-weight: 800; }
        .transcript-copy-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .transcript-segments { max-height: 640px; overflow: auto; padding-right: 4px; }
        .transcript-segment { display: grid; grid-template-columns: 64px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid #ecebe5; }
        .transcript-segment button { align-self: start; padding: 5px 7px; background: var(--soft-accent); color: var(--accent); }
        .transcript-segment p { margin: 0; font-size: 13px; line-height: 1.55; }
        .transcript-detail-empty { padding: 26px 0; }
        .transcript-detail-empty.compact { padding: 18px 0 0; }
        .transcript-session-card { max-width: 760px; }
        .transcript-session-card a { color: var(--accent); font-weight: 800; }
        @media (max-width: 980px) {
          .transcript-live-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="page-header transcript-header">
        <p className="eyebrow">Mitchell Republic</p>
        <div className="title-row">
          <h1>Transcripts</h1>
          <span className="status status-connected">Pilot</span>
        </div>
        <p>Upload a recording, preserve the original source and work from a searchable timestamped transcript.</p>
      </header>

      <TranscriptWorkspaceClient />
    </>
  );
}
