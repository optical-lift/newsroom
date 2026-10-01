import TranscriptStudio from "@/components/transcript-studio";

export default function TranscriptsDesk() {
  return (
    <>
      <style>{`
        .transcript-header { margin-bottom: 18px; }
        .transcript-header > p:last-child { margin-top: 7px; font-size: 13px; }
        .transcript-studio { position: relative; display: grid; grid-template-columns: 245px minmax(0, 1fr) 225px; min-height: 760px; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: #fff; box-shadow: 0 12px 38px rgba(22, 32, 27, .06); }
        .studio-library, .studio-inspector { background: #f4f3ee; min-width: 0; }
        .studio-library { border-right: 1px solid var(--line); }
        .studio-inspector { border-left: 1px solid var(--line); }
        .studio-library-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 20px 18px 14px; border-bottom: 1px solid var(--line); }
        .studio-library-top .eyebrow, .studio-document-header .eyebrow, .studio-inspector .eyebrow { margin: 0 0 4px; }
        .studio-library-top strong { font-size: 13px; }
        .transcript-studio button, .transcript-studio input, .transcript-studio textarea, .transcript-studio select { font: inherit; }
        .transcript-studio button { cursor: pointer; }
        .studio-new-button { border: 0; border-radius: 7px; padding: 7px 9px; background: var(--ink); color: #fff; font-size: 11px; font-weight: 800; }
        .studio-upload-card { display: grid; gap: 9px; margin: 12px; padding: 13px; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
        .studio-upload-card label > span { display: block; margin-bottom: 5px; color: var(--muted); font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
        .studio-upload-card input { box-sizing: border-box; width: 100%; border: 1px solid var(--line); border-radius: 7px; padding: 9px; background: #fff; font-size: 11px; }
        .studio-upload-card > button { border: 0; border-radius: 7px; padding: 9px; background: var(--accent); color: #fff; font-size: 11px; font-weight: 800; }
        .studio-upload-card small { color: var(--muted); font-size: 10px; line-height: 1.35; overflow-wrap: anywhere; }
        .studio-upload-card progress { width: 100%; }
        .studio-recording-list { padding: 8px; }
        .studio-recording-row { width: 100%; display: grid; gap: 4px; padding: 12px 10px; border: 0; border-radius: 9px; background: transparent; color: var(--ink); text-align: left; }
        .studio-recording-row:hover { background: rgba(255,255,255,.72); }
        .studio-recording-row.selected { background: #fff; box-shadow: 0 1px 4px rgba(22,32,27,.07); }
        .studio-recording-title { font-size: 12px; font-weight: 800; line-height: 1.25; }
        .studio-recording-meta { color: var(--muted); font-size: 9px; line-height: 1.35; }
        .studio-document { min-width: 0; background: #fff; }
        .studio-document-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 26px 30px 18px; }
        .studio-document-header h2 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 500; line-height: 1.08; }
        .studio-document-header p:last-child { margin: 7px 0 0; color: var(--muted); font-size: 10px; }
        .studio-status { flex: 0 0 auto; border-radius: 999px; padding: 7px 10px; background: #ecebe5; color: var(--muted); font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; }
        .studio-status.ready, .studio-status.state-ready { background: #e4efe7; color: #2f6848; }
        .studio-status.state-processing, .studio-status.state-partially_processed, .studio-status.state-queued { background: #edf1ea; color: #405248; }
        .studio-status.state-failed_retryable, .studio-status.state-failed_terminal { background: #f7e8e5; color: #7b3028; }
        .studio-player { position: sticky; top: 0; z-index: 8; padding: 12px 30px 11px; border-top: 1px solid #f1f0eb; border-bottom: 1px solid var(--line); background: rgba(252,252,249,.97); backdrop-filter: blur(10px); }
        .studio-player audio { width: 100%; height: 40px; }
        .studio-player-tools { display: flex; align-items: center; gap: 7px; min-height: 30px; }
        .studio-player-tools button { border: 1px solid var(--line); border-radius: 6px; padding: 5px 7px; background: #fff; color: var(--ink); font-size: 10px; font-weight: 800; }
        .studio-player-tools label { display: flex; align-items: center; gap: 5px; color: var(--muted); font-size: 9px; font-weight: 800; }
        .studio-player-tools select { border: 1px solid var(--line); border-radius: 6px; padding: 4px 6px; background: #fff; font-size: 10px; }
        .studio-source-hash { margin-left: auto; color: var(--muted); font-size: 9px; }
        .studio-processing-card { display: flex; gap: 12px; align-items: flex-start; margin: 22px 30px; padding: 16px; border: 1px solid #d9e2da; border-radius: 10px; background: #edf1ea; }
        .studio-processing-card.error { border-color: #ead0cb; background: #f7e8e5; }
        .studio-processing-card strong { font-size: 13px; }
        .studio-processing-card p { margin: 5px 0 0; color: var(--muted); font-size: 11px; line-height: 1.45; }
        .studio-processing-card button { margin-top: 9px; border: 0; border-radius: 7px; padding: 8px 10px; background: var(--ink); color: #fff; font-size: 10px; font-weight: 800; }
        .studio-pulse { width: 9px; height: 9px; margin-top: 4px; border-radius: 50%; background: var(--accent); animation: studio-pulse 1.25s ease-in-out infinite; }
        @keyframes studio-pulse { 0%,100% { opacity:.3; transform:scale(.85); } 50% { opacity:1; transform:scale(1.15); } }
        .studio-editor-toolbar { position: sticky; top: 93px; z-index: 7; display: grid; grid-template-columns: auto minmax(220px,1fr) auto; align-items: center; gap: 12px; padding: 11px 30px; border-bottom: 1px solid var(--line); background: rgba(255,255,255,.97); backdrop-filter: blur(10px); }
        .studio-view-toggle { display: inline-flex; padding: 2px; border-radius: 8px; background: #efeee9; }
        .studio-view-toggle button { border: 0; border-radius: 6px; padding: 6px 10px; background: transparent; color: var(--muted); font-size: 10px; font-weight: 800; }
        .studio-view-toggle button.active { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(20,30,25,.1); }
        .studio-search { display: grid; grid-template-columns: minmax(0,1fr) auto auto auto; align-items: center; gap: 5px; }
        .studio-search input { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; background: #fff; font-size: 11px; }
        .studio-search span { color: var(--muted); font-size: 9px; white-space: nowrap; }
        .studio-search button, .studio-copy-actions button { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; background: #fff; color: var(--ink); font-size: 9px; font-weight: 800; }
        .studio-copy-actions { display: flex; gap: 5px; }
        .studio-editor-meta { display: flex; justify-content: space-between; gap: 12px; padding: 10px 30px; color: var(--muted); font-size: 9px; border-bottom: 1px solid #f1f0eb; }
        .studio-editor-meta .save-saving { color: #866918; }
        .studio-editor-meta .save-saved { color: #2f6848; }
        .studio-editor-meta .save-error { color: #8a382e; }
        .studio-clean-view, .studio-raw-view { padding: 8px 30px 60px; }
        .studio-clean-note { margin: 12px 0 8px; padding: 9px 11px; border-radius: 7px; background: #f7f6f1; color: var(--muted); font-size: 10px; line-height: 1.4; }
        .studio-paragraph, .studio-segment { display: grid; grid-template-columns: 58px minmax(0,1fr); gap: 14px; padding: 14px 0; border-bottom: 1px solid #eeede8; }
        .studio-time { align-self: start; border: 0; border-radius: 6px; padding: 5px 6px; background: #e9f0ea; color: var(--accent); font-size: 9px; font-weight: 900; }
        .studio-speaker-name { display: block; margin-bottom: 5px; color: var(--ink); font-size: 11px; }
        .studio-paragraph p { margin: 0; font-size: 14px; line-height: 1.67; }
        .studio-segment.search-hit { margin-inline: -8px; padding-inline: 8px; border-radius: 8px; background: #fff8d9; }
        .studio-segment-body { display: grid; gap: 6px; }
        .studio-speaker-input { width: min(230px,100%); box-sizing: border-box; border: 0; border-bottom: 1px solid transparent; padding: 3px 0; background: transparent; color: var(--accent); font-size: 10px; font-weight: 900; }
        .studio-speaker-input:focus { outline: none; border-bottom-color: var(--line); }
        .studio-segment textarea { width: 100%; box-sizing: border-box; resize: vertical; border: 1px solid transparent; border-radius: 7px; padding: 8px 9px; background: transparent; color: var(--ink); font-family: inherit; font-size: 13px; line-height: 1.55; }
        .studio-segment textarea:hover { background: #faf9f5; }
        .studio-segment textarea:focus { outline: none; border-color: #d9ded8; background: #fff; box-shadow: 0 0 0 3px rgba(46,102,72,.06); }
        .studio-inspector { padding: 19px 16px; }
        .studio-inspector section { padding: 0 0 18px; margin-bottom: 18px; border-bottom: 1px solid var(--line); }
        .studio-inspector section:last-child { border-bottom: 0; }
        .studio-inspector h3 { margin: 0 0 10px; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 500; }
        .studio-inspector dl { display: grid; gap: 8px; margin: 0; }
        .studio-inspector dl > div { display: flex; justify-content: space-between; gap: 8px; }
        .studio-inspector dt { color: var(--muted); font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
        .studio-inspector dd { margin: 0; font-size: 10px; text-align: right; }
        .studio-speaker-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
        .studio-speaker-list li { padding: 7px 8px; border-radius: 7px; background: #fff; font-size: 10px; font-weight: 800; }
        .studio-muted { color: var(--muted); font-size: 10px; line-height: 1.45; }
        .studio-empty { padding: 28px; color: var(--muted); }
        .studio-empty h2 { margin: 0 0 8px; color: var(--ink); font-family: Georgia, 'Times New Roman', serif; font-weight: 500; }
        .studio-document-empty { padding: 70px 40px; }
        .studio-empty a { color: var(--accent); font-weight: 800; }
        .studio-toast { position: fixed; right: 24px; bottom: 24px; z-index: 40; display: flex; align-items: center; gap: 12px; max-width: 420px; padding: 12px 14px; border: 1px solid #d9e2da; border-radius: 9px; background: #edf1ea; color: #405248; box-shadow: 0 12px 35px rgba(22,32,27,.16); font-size: 11px; }
        .studio-toast.error { border-color: #ead0cb; background: #f7e8e5; color: #7b3028; }
        .studio-toast button { border: 0; background: transparent; color: inherit; font-size: 18px; line-height: 1; }
        @media (max-width: 1180px) { .transcript-studio { grid-template-columns: 210px minmax(0,1fr); } .studio-inspector { display: none; } }
        @media (max-width: 850px) { .transcript-studio { display: block; } .studio-library { border-right: 0; border-bottom: 1px solid var(--line); } .studio-recording-list { display: flex; overflow-x: auto; gap: 6px; } .studio-recording-row { min-width: 190px; } .studio-editor-toolbar { top: 0; grid-template-columns: 1fr; } .studio-player { top: 0; } .studio-source-hash { display: none; } .studio-copy-actions { justify-content: flex-start; } .studio-document-header { padding-inline: 20px; } .studio-player, .studio-editor-toolbar, .studio-editor-meta, .studio-clean-view, .studio-raw-view { padding-inline: 20px; } }
      `}</style>
      <header className="page-header transcript-header">
        <p className="eyebrow">Mitchell Republic</p>
        <div className="title-row"><h1>Transcripts</h1><span className="status status-connected">Studio</span></div>
        <p>Recordings, playback and transcript editing in one newsroom workspace.</p>
      </header>
      <TranscriptStudio />
    </>
  );
}
