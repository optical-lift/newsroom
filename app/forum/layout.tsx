import NewsroomShell from "@/components/newsroom-shell";
import { forumMemberDisplayName, requireForumContext } from "@/lib/auth/forum";
import { forumWorkspace } from "@/lib/newsroom";

const links = [
  { href: "/forum", label: "Home" },
  ...forumWorkspace.desks.map((desk) => ({ href: `/forum/${desk.slug}`, label: desk.label }))
];

export default async function ForumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { claims, context } = await requireForumContext();

  return (
    <NewsroomShell
      publication={context.publication.name}
      organization={context.workspace.name}
      userName={forumMemberDisplayName(claims)}
      links={links}
    >
      {children}
    </NewsroomShell>
  );
}
