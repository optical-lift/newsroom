"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15 15 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function openTranscriptNew() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>(".transcript-library-toolbar button"))
    .find((candidate) => candidate.textContent?.includes("New recording"));
  if (button) button.click();
  window.setTimeout(() => {
    const fileInput = document.querySelector<HTMLInputElement>(".transcript-capture-panel input[type='file']");
    fileInput?.scrollIntoView({ behavior: "smooth", block: "center" });
    fileInput?.focus();
  }, 40);
}

function focusTranscriptSearch() {
  window.requestAnimationFrame(() => {
    const input = document.querySelector<HTMLInputElement>(".transcript-library-search input");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus();
  });
}

export default function NewsroomGlobalChassis() {
  const pathname = usePathname();
  const router = useRouter();
  const [rail, setRail] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRail(document.querySelector<HTMLElement>(".newsroom-rail"));
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/forum/transcripts") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") window.setTimeout(openTranscriptNew, 80);
    if (params.get("search") === "1") window.setTimeout(focusTranscriptSearch, 80);
  }, [pathname]);

  function startNewRecording() {
    if (pathname === "/forum/transcripts") {
      openTranscriptNew();
      return;
    }
    router.push("/forum/transcripts?new=1");
  }

  function openGlobalSearch() {
    if (pathname === "/forum/transcripts") {
      focusTranscriptSearch();
      return;
    }
    router.push("/forum/transcripts?search=1");
  }

  if (!rail) return null;

  return createPortal(
    <nav className="newsroom-global-chassis" aria-label="Global Newsroom actions">
      <button type="button" className="newsroom-global-action" onClick={startNewRecording} title="New recording">
        <span className="newsroom-global-action__mark"><PlusIcon /></span>
        <span className="newsroom-global-action__label">New recording</span>
      </button>
      <button type="button" className="newsroom-global-action" onClick={openGlobalSearch} title="Search">
        <span className="newsroom-global-action__mark"><SearchIcon /></span>
        <span className="newsroom-global-action__label">Search</span>
      </button>
    </nav>,
    rail
  );
}
