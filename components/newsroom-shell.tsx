"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import SignOutButton from "@/components/sign-out-button";

type NewsroomShellLink = {
  href: string;
  label: string;
};

type NewsroomShellProps = {
  publication: string;
  organization: string;
  userName: string;
  links: NewsroomShellLink[];
  children: ReactNode;
};

type ContextAction =
  | { type: "scroll"; selector: string }
  | { type: "focus"; selector: string }
  | { type: "drawer"; key: string }
  | { type: "navigate"; href: string }
  | { type: "event"; name: string; detail?: Record<string, unknown> }
  | { type: "transcript-panel"; panel: "tools"; sectionSelector?: string };

type ContextItem = {
  key: string;
  label: string;
  action: ContextAction;
  default?: boolean;
};

function markFor(label: string) {
  if (label === "Home") return "H";
  if (label === "Legal Notices") return "L";
  if (label === "Municipal") return "M";
  if (label === "Transcripts") return "T";
  if (label === "Markets") return "$";
  if (label === "Sports") return "S";
  return label.slice(0, 1).toUpperCase();
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "R";
}

function contextItemsFor(pathname: string): ContextItem[] {
  if (pathname === "/forum/transcripts") {
    return [
      { key: "recent", label: "Recent", action: { type: "event", name: "newsroom:transcript-library-view", detail: { view: "recent" } }, default: true },
      { key: "all", label: "All", action: { type: "event", name: "newsroom:transcript-library-view", detail: { view: "all" } } },
      { key: "collections", label: "Collections", action: { type: "event", name: "newsroom:transcript-library-view", detail: { view: "collections" } } },
      { key: "processing", label: "Processing", action: { type: "event", name: "newsroom:transcript-library-view", detail: { view: "processing" } } }
    ];
  }

  if (pathname.startsWith("/forum/transcripts/")) {
    return [
      { key: "library", label: "Library", action: { type: "navigate", href: "/forum/transcripts" } },
      { key: "transcript", label: "Transcript", action: { type: "scroll", selector: ".transcript-document-heading" }, default: true },
      { key: "find", label: "Find", action: { type: "focus", selector: ".studio-search input" } },
      { key: "speakers", label: "Speakers", action: { type: "transcript-panel", panel: "tools", sectionSelector: ".studio-inspector section:nth-of-type(2)" } },
      { key: "organize", label: "Organize", action: { type: "event", name: "newsroom:transcript-organize" } },
      { key: "history", label: "History", action: { type: "transcript-panel", panel: "tools", sectionSelector: ".studio-inspector section:nth-of-type(4)" } }
    ];
  }

  if (pathname.startsWith("/forum/municipal")) {
    return [
      { key: "meeting", label: "Meeting", action: { type: "scroll", selector: ".meeting-hero" }, default: true },
      { key: "agenda", label: "Agenda", action: { type: "scroll", selector: ".municipal-columns .record-panel" } },
      { key: "minutes", label: "Minutes", action: { type: "scroll", selector: ".minutes-panel" } },
      { key: "sources", label: "Sources", action: { type: "drawer", key: "meeting-sources" } }
    ];
  }

  if (pathname.startsWith("/forum/markets")) {
    return [
      { key: "output", label: "Output", action: { type: "scroll", selector: ".markets-card" }, default: true },
      { key: "sources", label: "Sources", action: { type: "drawer", key: "market-sources" } }
    ];
  }

  if (pathname.startsWith("/forum/legal-notices")) {
    return [
      { key: "notices", label: "Notices", action: { type: "scroll", selector: ".legal-list" }, default: true },
      { key: "status", label: "Status", action: { type: "drawer", key: "legal-notice-queue" } }
    ];
  }

  return [];
}

export default function NewsroomShell({ publication, organization, userName, links, children }: NewsroomShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [contextActive, setContextActive] = useState<string | null>(null);
  const [transcriptPanel, setTranscriptPanel] = useState<"tools" | null>(null);
  const contextItems = useMemo(() => contextItemsFor(pathname), [pathname]);

  useEffect(() => {
    setContextActive(contextItems.find((item) => item.default)?.key ?? contextItems[0]?.key ?? null);
    setTranscriptPanel(null);
  }, [contextItems]);

  useEffect(() => {
    if (!pathname.startsWith("/forum/transcripts/")) {
      delete document.body.dataset.transcriptPanel;
      return;
    }
    document.body.dataset.transcriptPanel = transcriptPanel ?? "closed";
    return () => { delete document.body.dataset.transcriptPanel; };
  }, [pathname, transcriptPanel]);

  useEffect(() => {
    if (!transcriptPanel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTranscriptPanel(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [transcriptPanel]);

  useEffect(() => {
    if (pathname !== "/forum/transcripts") return;
    const onLibraryViewState = (event: Event) => {
      const view = (event as CustomEvent<{ view?: string }>).detail?.view;
      if (view && ["recent", "all", "collections", "processing"].includes(view)) setContextActive(view);
    };
    window.addEventListener("newsroom:transcript-library-view-state", onLibraryViewState);
    return () => window.removeEventListener("newsroom:transcript-library-view-state", onLibraryViewState);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/forum") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function scrollToSelector(selector: string) {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function runContext(item: ContextItem) {
    setContextActive(item.key);
    setAccountOpen(false);
    const action = item.action;

    if (action.type === "scroll") {
      setTranscriptPanel(null);
      scrollToSelector(action.selector);
      return;
    }

    if (action.type === "focus") {
      setTranscriptPanel(null);
      const selector = action.selector;
      window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLInputElement>(selector);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus();
      });
      return;
    }

    if (action.type === "drawer") {
      setTranscriptPanel(null);
      window.dispatchEvent(new CustomEvent("newsroom:open-drawer", { detail: { key: action.key } }));
      return;
    }

    if (action.type === "navigate") {
      setTranscriptPanel(null);
      router.push(action.href);
      return;
    }

    if (action.type === "event") {
      setTranscriptPanel(null);
      window.dispatchEvent(new CustomEvent(action.name, { detail: action.detail ?? {} }));
      return;
    }

    setTranscriptPanel(action.panel);
    if (action.sectionSelector) {
      window.setTimeout(() => {
        const inspector = document.querySelector<HTMLElement>(".studio-inspector");
        const target = document.querySelector<HTMLElement>(action.sectionSelector!);
        if (inspector && target) inspector.scrollTo({ top: Math.max(0, target.offsetTop - 70), behavior: "smooth" });
      }, 40);
    }
  }

  return (
    <div className={`newsroom-shell${expanded ? " newsroom-shell--expanded" : ""}`}>
      <aside className="newsroom-rail" aria-label="Newsroom orientation">
        <div className="newsroom-rail__top">
          <Link className="newsroom-rail__brand" href="/forum" aria-label="Newsroom home" title="Newsroom">
            <span className="newsroom-rail__brand-mark" aria-hidden="true">N</span>
            <span className="newsroom-rail__brand-label">Newsroom</span>
          </Link>
          <button
            type="button"
            className="newsroom-rail__toggle"
            aria-label={expanded ? "Collapse Newsroom navigation" : "Expand Newsroom navigation"}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            <span aria-hidden="true">{expanded ? "‹" : "›"}</span>
          </button>
        </div>

        <nav className="newsroom-rail__nav" aria-label={`${publication} reporting tools`}>
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                href={link.href}
                key={link.href}
                className="newsroom-rail__link"
                data-active={active ? "true" : "false"}
                aria-current={active ? "page" : undefined}
                title={expanded ? undefined : link.label}
              >
                <span className="newsroom-rail__link-mark" aria-hidden="true">{markFor(link.label)}</span>
                <span className="newsroom-rail__link-label">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {contextItems.length ? (
          <nav className="newsroom-rail__context" aria-label="On this page">
            <span className="newsroom-rail__context-heading">On this page</span>
            {contextItems.map((item, index) => (
              <button
                type="button"
                key={item.key}
                className="newsroom-rail__context-link"
                data-active={contextActive === item.key ? "true" : "false"}
                title={expanded ? undefined : item.label}
                onClick={() => runContext(item)}
              >
                <span className="newsroom-rail__context-mark" aria-hidden="true">{index + 1}</span>
                <span className="newsroom-rail__context-label">{item.label}</span>
              </button>
            ))}
          </nav>
        ) : null}

        <div className="newsroom-rail__account-zone">
          {accountOpen ? (
            <div className="newsroom-account-panel" role="dialog" aria-label="Newsroom account">
              <span className="newsroom-account-panel__eyebrow">Signed in</span>
              <strong>{userName}</strong>
              <span>{publication}</span>
              <span>{organization}</span>
              <SignOutButton />
            </div>
          ) : null}
          <button
            type="button"
            className="newsroom-rail__account"
            aria-label="Newsroom account"
            aria-expanded={accountOpen}
            title={expanded ? undefined : userName}
            onClick={() => setAccountOpen((current) => !current)}
          >
            <span className="newsroom-rail__account-mark" aria-hidden="true">{initials(userName)}</span>
            <span className="newsroom-rail__account-label">{userName}</span>
          </button>
        </div>
      </aside>

      {transcriptPanel ? (
        <>
          <button type="button" className="newsroom-context-scrim" aria-label="Close transcript panel" onClick={() => setTranscriptPanel(null)} />
          <button type="button" className="newsroom-context-close" data-panel={transcriptPanel} aria-label="Close transcript panel" onClick={() => setTranscriptPanel(null)}>×</button>
        </>
      ) : null}

      <main className="workspace-main">{children}</main>
    </div>
  );
}
