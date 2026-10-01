import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { FORUM_WORKSPACE_ID } from "@/lib/supabase/config";
import { createNewsroomServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createNewsroomServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (claimsData?.claims?.sub) {
    const { data: isMember } = await supabase.rpc("transcript_core_is_workspace_member", {
      target_workspace: FORUM_WORKSPACE_ID
    });
    if (isMember === true) redirect("/forum");
  }

  const params = await searchParams;
  const unauthorized = first(params.error) === "unauthorized";

  return (
    <main className="login-shell">
      <style>{`
        .login-shell { min-height: 100vh; display: grid; place-items: center; padding: 32px; background: var(--paper); }
      `}</style>
      <LoginForm unauthorized={unauthorized} />
    </main>
  );
}
