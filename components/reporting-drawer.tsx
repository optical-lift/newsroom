"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

type ReportingDrawerProps = {
  label: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  variant?: "secondary" | "quiet";
};

function contextKeyFor(title: string) {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function ReportingDrawer({
  label,
  title,
  eyebrow = "Reporting details",
  children,
  variant = "secondary"
}: ReportingDrawerProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const drawerId = `${titleId}-drawer`;
  const contextKey = useMemo(() => contextKeyFor(title), [title]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === contextKey) setOpen(true);
    };
    window.addEventListener("newsroom:open-drawer", onOpen);
    return () => window.removeEventListener("newsroom:open-drawer", onOpen);
  }, [contextKey]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`newsroom-action newsroom-action--${variant} reporting-drawer-trigger`}
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open ? (
        <>
          <button type="button" className="reporting-drawer-scrim" aria-label={`Close ${title}`} onClick={() => setOpen(false)} />
          <aside id={drawerId} className="reporting-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header className="reporting-drawer__header">
              <div>
                <p>{eyebrow}</p>
                <h2 id={titleId}>{title}</h2>
              </div>
              <button type="button" className="reporting-drawer__close" aria-label={`Close ${title}`} onClick={() => setOpen(false)}>×</button>
            </header>
            <div className="reporting-drawer__body">{children}</div>
          </aside>
        </>
      ) : null}
    </>
  );
}
