"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import SignOutButton from "@/components/sign-out-button";

type NewsroomShellLink = {
  href: string;
  label: string;
};

type NewsroomShellProps = {
  publication: string;
  organization: string;
  links: NewsroomShellLink[];
  children: ReactNode;
};

function markFor(label: string) {
  if (label === "Today") return "T";
  if (label === "Legal Notices") return "L";
  if (label === "Municipal") return "M";
  if (label === "Transcripts") return "T";
  if (label === "Markets") return "$";
  if (label === "Sports") return "S";
  return label.slice(0, 1).toUpperCase();
}

export default function NewsroomShell({ publication, organization, links, children }: NewsroomShellProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/forum") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
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

        <div className="newsroom-rail__account-zone">
          {accountOpen ? (
            <div className="newsroom-account-panel" role="dialog" aria-label="Newsroom account">
              <span className="newsroom-account-panel__eyebrow">Workspace</span>
              <strong>{publication}</strong>
              <span>{organization}</span>
              <SignOutButton />
            </div>
          ) : null}
          <button
            type="button"
            className="newsroom-rail__account"
            aria-label="Workspace account"
            aria-expanded={accountOpen}
            title={expanded ? undefined : publication}
            onClick={() => setAccountOpen((current) => !current)}
          >
            <span className="newsroom-rail__account-mark" aria-hidden="true">MR</span>
            <span className="newsroom-rail__account-label">{publication}</span>
          </button>
        </div>
      </aside>

      <main className="workspace-main">{children}</main>
    </div>
  );
}
