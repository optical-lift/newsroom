import { forumMemberFirstName, requireForumContext } from "@/lib/auth/forum";

export const dynamic = "force-dynamic";

export default async function ForumHomePage() {
  const { claims, context } = await requireForumContext();
  const firstName = forumMemberFirstName(claims);

  return (
    <section className="newsroom-home" aria-labelledby="newsroom-home-greeting">
      <p className="eyebrow">{context.publication.name} · {context.workspace.name}</p>
      <h1 id="newsroom-home-greeting">Hello, {firstName}.</h1>
    </section>
  );
}
