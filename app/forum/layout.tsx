import Link from "next/link";
import { forumWorkspace } from "@/lib/newsroom";

const links = [
  { href: "/forum", label: "Today" },
  ...forumWorkspace.desks.map((desk) => ({ href: `/forum/${desk.slug}`, label: desk.label }))
];

export default function ForumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <Link href="/" className="wordmark">Optical Lift <span>Newsroom</span></Link>
        <div className="workspace-id">
          <p className="eyebrow">Workspace</p>
          <strong>{forumWorkspace.publication}</strong>
          <span>{forumWorkspace.organization}</span>
        </div>
        <nav aria-label="Forum workspace">
          {links.map((link) => (
            <Link href={link.href} key={link.href}>{link.label}</Link>
          ))}
        </nav>
        <div className="shell-notice">
          <strong>Shell mode</strong>
          <span>No private Forum data is connected.</span>
        </div>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
