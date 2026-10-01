import TranscriptWorkspaceClient from "@/components/transcript-workspace-client";

export default function TranscriptsDesk() {
  return (
    <>
      <style>{`
        .transcript-header { margin-bottom: 24px; }
        .transcript-header > p:last-child { margin-top: 8px; font-size: 13px; }
        .transcript-workspace { display: grid; gap: 16px; }
        .transcript-live-panel { padding: 24px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
        .transcript-live-panel h2 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 27px; font-weight: 500; }
        .transcript-live-panel > p:not(.eyebrow), .transcript-detail-empty p { color: var(--muted); line-height: 1.5; }
        .transcript-panel-heading, .recording-list-head, .active-recording-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .transcript-active-panel { padding: 28px 32px; }
        .active-recording-heading { align-items: flex-start; }
        .active-recording-heading .eyebrow { margin-bottom: 7px; }
        .active-recording-status { flex: 0 0 auto; padding: 7px 10px; border-radius: 999px; background: #ecebe5; color: var(--muted); font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; }
        .active-recording-status.ready, .active-recording-status.state-ready { background: #e4efe7; color: #2f6848; }
        .active-recording-status.state-processing, .active-recording-status.state-partially_processed, .active-recording-status.state-queued { background: #edf1ea; color: #405248; }
        .active-recording-status.state-failed_retryable, .active-recording-status.state-failed_terminal { background: #f7e8e5; color: #7b3028; }
        .transcript-library-grid { display: grid; grid-template-columns: minmax(300px, .72fr) minmax(0, 1.28fr); gap: 18px; align-items: start; margin-top: 18px; }
        .transcript-upload-card { display: grid; gap: 10px; padding: 18px; border-radius: 10px; background: #f0efe9; }
        .upload-card-heading { display: grid; gap: 3px; margin-bottom: 4px; }
        .upload-card-heading strong { font-size: 14px; }
        .upload-card-heading span { color: var(--muted); font-size: 11px; }
        .transcript-live-panel input, .transcript-live-panel button { font: inherit; }
        .transcript-live-panel input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid var(--line); border-radius: 8px; background: white; }
        .transcript-live-panel button { border: 0; border-radius: 8px; padding: 10px 13px; background: var(--ink); color: white; font-size: 12px; font-weight: 800; cursor: pointer; }
        .transcript-live-panel button:disabled { opacity: .5; cursor: not-allowed; }
        .transcript-live-panel .quiet-button { padding: 7px 9px; background: transparent; color: var(--muted); border: 1px solid var(--line); }
        .transcript-upload-card label > span { display: block; margin-bottom: 5px; color: var(--muted); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
        .transcript-upload-card small { color: var(--muted); line-height: 1.4; }
        .transcript-upload-card progress { width: 100%; }
        .transcript-notice, .transcript-error { padding: 11px 13px; border-radius: 8px; font-size: 12px; line-height: 1.45; }
        .transcript-global-notice { margin: 0; }
        .transcript-notice { background: #edf1ea; color: #405248; }
        .transcript-error { background: #f7e8e5; color: #7b3028; }
        .recording-list { min-width: 0; }
        .recording-list-head { margin-bottom: 8px; }
        .recording-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 13px 12px !important; border-radius: 8px !important; border: 1px solid transparent !important; border-top-color: #ecebe5 !important; background: transparent !important; color: var(--ink) !important; text-align: left; }
        .recording-row.selected { background: #edf1ea !important; border-color: #d9e2da !important; box-shadow: inset 3px 0 0 var(--accent); }
        .recording-row.selected strong::before { content: 'Current · '; color: var(--accent); font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; }
        .recording-row strong, .recording-row small { display: block; }
        .recording-row small { margin-top: 3px; color: var(--muted); font-weight: 500; }
        .recording-state { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
        .transcript-empty { color: var(--muted); font-size: 12px; }
        .source-meta { font-size: 11px; word-break: break-word; color: var(--muted); }
        .transcript-audio { width: 100%; margin: 18px 0; }
        .processing-card { margin: 14px 0 18px; padding: 14px; border: 1px solid var(--line); border-radius: 9px; background: #f0efe9; }
        .processing-card p { margin: 7px 0 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
        .processing-title { display: flex; align-items: center; gap: 9px; }
        .processing-pulse { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); animation: transcript-pulse 1.4s ease-in-out infinite; }
        .processing-error-state { background: #f7e8e5; border-color: #ead0cb; }
        .processing-error-state button { margin-top: 10px; }
        @keyframes transcript-pulse { 0%, 100% { opacity: .35; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.15); } }
        .transcript-search-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; margin: 20px 0 8px; }
        .transcript-search-row span { color: var(--muted); font-size: 10px; font-weight: 800; }
        .transcript-copy-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .transcript-tools-heading { margin-bottom: 4px; }
        .transcript-segments { max-height: 720px; overflow: auto; padding-right: 4px; }
        .transcript-segment { display: grid; grid-template-columns: 76px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid #ecebe5; }
        .transcript-segment button { align-self: start; padding: 5px 7px; background: var(--soft-accent); color: var(--accent); }
        .transcript-segment p { margin: 0; font-size: 13px; line-height: 1.55; }
        .transcript-detail-empty { padding: 26px 0; }
        .transcript-detail-empty.compact { padding: 18px 0 0; }
        .transcript-session-card { max-width: 760px; }
        .transcript-session-card a { color: var(--accent); font-weight: 800; }
        @media (max-width: 980px) {
          .transcript-library-grid { grid-template-columns: 1fr; }
          .active-recording-heading { align-items: flex-start; flex-direction: column; }
          .transcript-active-panel { padding: 24px; }
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
