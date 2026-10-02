import NewsroomShell from "@/components/newsroom-shell";
import { forumMemberDisplayName, requireForumMember } from "@/lib/auth/forum";
import { forumWorkspace } from "@/lib/newsroom";

const links = [
  { href: "/forum", label: "Home" },
  ...forumWorkspace.desks.map((desk) => ({ href: `/forum/${desk.slug}`, label: desk.label }))
];

export default async function ForumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const claims = await requireForumMember();

  return (
    <NewsroomShell
      publication={forumWorkspace.publication}
      organization={forumWorkspace.organization}
      userName={forumMemberDisplayName(claims)}
      links={links}
    >
      {children}
    </NewsroomShell>
  );
}
