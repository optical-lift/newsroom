import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";
import { requireForumMember } from "@/lib/auth/forum";
import { forumWorkspace } from "@/lib/newsroom";

const links = [
  { href: "/forum", label: "Today" },
  ...forumWorkspace.desks.map((desk) => ({ href: `/forum/${desk.slug}`, label: desk.label }))
];

export default async function ForumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireForumMember();

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <Link href="/forum" className="wordmark">Optical Lift <span>Newsroom</span></Link>
        <div className="workspace-id">
          <p className="eyebrow">Workspace</p>
          <strong>{forumWorkspace.publication}</strong>
          <span>{forumWorkspace.organization}</span>
        </div>
        <nav aria-label="Mitchell Republic workspace">
          {links.map((link) => (
            <Link href={link.href} key={link.href}>{link.label}</Link>
          ))}
        </nav>
        <SignOutButton />
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
