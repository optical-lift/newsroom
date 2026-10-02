"use client";

import { useState } from "react";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = getNewsroomBrowserClient();
    await supabase.auth.signOut({ scope: "local" });
    window.location.assign("/login");
  }

  return (
    <button
      type="button"
      className="newsroom-signout"
      onClick={signOut}
      disabled={busy}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
