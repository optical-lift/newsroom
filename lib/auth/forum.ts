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
