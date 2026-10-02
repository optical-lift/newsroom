import { forumMemberFirstName, requireForumMember } from "@/lib/auth/forum";
import { forumWorkspace } from "@/lib/newsroom";

export const dynamic = "force-dynamic";

export default async function ForumHomePage() {
  const claims = await requireForumMember();
  const firstName = forumMemberFirstName(claims);

  return (
    <section className="newsroom-home" aria-labelledby="newsroom-home-greeting">
      <p className="eyebrow">{forumWorkspace.publication} · {forumWorkspace.organization}</p>
      <h1 id="newsroom-home-greeting">Hello, {firstName}.</h1>
    </section>
  );
}
