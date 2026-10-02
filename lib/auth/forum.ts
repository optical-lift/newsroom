import { redirect } from "next/navigation";
import { FORUM_WORKSPACE_ID } from "@/lib/supabase/config";
import { createNewsroomServerClient } from "@/lib/supabase/server";

export async function requireForumMember() {
  const supabase = await createNewsroomServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const { data: isMember, error: membershipError } = await supabase.rpc(
    "transcript_core_is_workspace_member",
    { target_workspace: FORUM_WORKSPACE_ID }
  );

  if (membershipError || isMember !== true) {
    redirect("/login?error=unauthorized");
  }

  return claimsData.claims;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function forumMemberDisplayName(claims: unknown) {
  const bag = claims && typeof claims === "object" ? claims as Record<string, unknown> : {};
  const metadata = bag.user_metadata && typeof bag.user_metadata === "object"
    ? bag.user_metadata as Record<string, unknown>
    : {};

  const named = [
    text(metadata.display_name),
    text(metadata.full_name),
    text(metadata.name),
    text(bag.full_name),
    text(bag.name)
  ].find(Boolean);

  if (named) return named;

  const email = text(bag.email);
  if (email) {
    const local = email.split("@")[0] ?? "";
    const first = local.split(/[._-]+/).filter(Boolean)[0] ?? local;
    return first ? `${first[0]?.toUpperCase() ?? ""}${first.slice(1)}` : "Reporter";
  }

  return "Reporter";
}

export function forumMemberFirstName(claims: unknown) {
  return forumMemberDisplayName(claims).split(/\s+/).filter(Boolean)[0] || "Reporter";
}
