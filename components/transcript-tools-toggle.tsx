"use client";

import { useEffect, useState } from "react";

export default function TranscriptToolsToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const inspector = document.querySelector<HTMLElement>(".studio-inspector");
    if (inspector) {
      inspector.id = "transcript-reporting-drawer";
      inspector.setAttribute("role", "dialog");
      inspector.setAttribute("aria-label", "Transcript tools");
      inspector.setAttribute("aria-hidden", open ? "false" : "true");
    }
    document.body.dataset.transcriptTools = open ? "open" : "closed";
    return () => {
      delete document.body.dataset.transcriptTools;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="transcript-tools-control">
      <button
        type="button"
        className="newsroom-action newsroom-action--secondary transcript-tools-trigger"
        aria-expanded={open}
        aria-controls="transcript-reporting-drawer"
        onClick={() => setOpen((current) => !current)}
      >
        Tools
      </button>
      {open ? (
        <>
          <button type="button" className="reporting-drawer-scrim" aria-label="Close transcript tools" onClick={() => setOpen(false)} />
          <button type="button" className="transcript-tools-close" aria-label="Close transcript tools" onClick={() => setOpen(false)}>×</button>
        </>
      ) : null}
    </div>
  );
}
