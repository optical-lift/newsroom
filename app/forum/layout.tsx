import NewsroomShell from "@/components/newsroom-shell";
import { requireForumMember } from "@/lib/auth/forum";
import { forumWorkspace } from "@/lib/newsroom";

const links = [
  { href: "/forum", label: "Today" },
  ...forumWorkspace.desks.map((desk) => ({ href: `/forum/${desk.slug}`, label: desk.label }))
];

export default async function ForumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireForumMember();

  return (
    <NewsroomShell
      publication={forumWorkspace.publication}
      organization={forumWorkspace.organization}
      links={links}
    >
      {children}
    </NewsroomShell>
  );
}
