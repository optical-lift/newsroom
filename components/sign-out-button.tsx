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
      onClick={signOut}
      disabled={busy}
      style={{
        marginTop: "auto",
        border: "1px solid #38443d",
        borderRadius: 7,
        padding: "9px 10px",
        background: "transparent",
        color: "#aeb9b2",
        fontSize: 12,
        fontWeight: 700,
        cursor: busy ? "wait" : "pointer"
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
