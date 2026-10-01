"use client";

import { FormEvent, useMemo, useState } from "react";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";

export default function LoginForm({ unauthorized = false }: { unauthorized?: boolean }) {
  const supabase = useMemo(() => getNewsroomBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;

    setBusy(true);
    setError(null);
    try {
      await supabase.auth.signOut({ scope: "local" });
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: false }
      });
      if (signInError) throw signInError;
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the sign-in code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    const token = code.trim();
    if (!address || !token) return;

    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: address,
        token,
        type: "email"
      });
      if (verifyError) throw verifyError;
      window.location.assign("/forum");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-card">
      <style>{`
        .login-card { width: min(430px, 100%); padding: 30px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); box-shadow: 0 18px 55px rgba(23,32,28,.08); }
        .login-card h1 { margin: 0 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 42px; font-weight: 500; letter-spacing: -.03em; }
        .login-card > p { margin: 0 0 22px; color: var(--muted); line-height: 1.5; }
        .login-form { display: grid; gap: 12px; }
        .login-form label { display: grid; gap: 6px; color: var(--muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
        .login-form input { min-height: 44px; padding: 10px 12px; border: 1px solid #c3c7c1; border-radius: 8px; background: white; color: var(--ink); }
        .login-form input:focus { outline: 2px solid #8aa597; outline-offset: 1px; border-color: var(--accent); }
        .login-form button { min-height: 44px; border: 0; border-radius: 8px; padding: 10px 14px; background: var(--accent); color: white; font-weight: 800; cursor: pointer; }
        .login-form button:disabled { opacity: .55; cursor: wait; }
        .login-message { margin: 0 !important; padding: 10px 12px; border-radius: 8px; background: #edf1ea; color: #405248 !important; font-size: 12px; }
        .login-error { margin: 0 0 14px !important; padding: 10px 12px; border-radius: 8px; background: #f7e8e5; color: #7b3028 !important; font-size: 12px; }
        .login-reset { margin-top: 8px; border: 0 !important; background: transparent !important; color: var(--accent) !important; min-height: auto !important; padding: 4px 0 !important; text-align: left; }
      `}</style>

      <p className="eyebrow">Optical Lift Newsroom</p>
      <h1>Sign in</h1>
      <p>Mitchell Republic workspace</p>

      {unauthorized ? (
        <p className="login-error">This account does not have access to this workspace.</p>
      ) : null}
      {error ? <p className="login-error">{error}</p> : null}

      {!sent ? (
        <form className="login-form" onSubmit={sendCode}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send sign-in code"}</button>
        </form>
      ) : (
        <form className="login-form" onSubmit={verifyCode}>
          <p className="login-message">Check your email for the six-digit sign-in code.</p>
          <label>
            Code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
          <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <button className="login-reset" type="button" onClick={() => { setSent(false); setCode(""); setError(null); }}>
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
