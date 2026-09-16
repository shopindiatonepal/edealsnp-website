"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    let handled = false;

    const hash = window.location.hash;
    const code = new URLSearchParams(window.location.search).get("code");

    if (hash.includes("type=recovery")) {
      handled = true;
      setReady(true);
    } else if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        handled = true;
        if (error) setLinkError("This reset link is invalid or has expired — request a new one.");
        else setReady(true);
      });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        handled = true;
        setReady(true);
      }
    });

    // If none of the above ever fires, the link itself is broken/expired
    // rather than the page still legitimately loading — say so instead of
    // leaving "Verifying…" on screen forever.
    const timeout = setTimeout(() => {
      if (!handled) setLinkError("This reset link is invalid or has expired — request a new one.");
    }, 6000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  return (
    <>
      <Header />
      <div className="max-w-sm mx-auto px-5 py-16 min-h-[50vh]">
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Set a new password</h1>

        {done ? (
          <>
            <p className="text-sm text-ink-soft mb-5">Your password has been updated.</p>
            <a href="/account" className="inline-block bg-ink text-paper font-semibold text-sm px-6 py-3 rounded-full hover:bg-moss transition-colors">Go to sign in</a>
          </>
        ) : linkError ? (
          <>
            <p className="text-sm text-clay mb-5">{linkError}</p>
            <a href="/account" className="inline-block bg-ink text-paper font-semibold text-sm px-6 py-3 rounded-full hover:bg-moss transition-colors">Back to sign in</a>
          </>
        ) : !ready ? (
          <p className="text-sm text-ink-soft">Verifying your reset link…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
            <input
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="New password" className="border border-line rounded-sm bg-panel px-3.5 py-3 text-sm focus:outline-none focus:border-moss"
            />
            <input
              type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password" className="border border-line rounded-sm bg-panel px-3.5 py-3 text-sm focus:outline-none focus:border-moss"
            />
            {error && <p className="text-xs text-clay">{error}</p>}
            <button disabled={saving} className="bg-ink text-paper font-semibold text-sm py-3.5 rounded-sm hover:bg-moss transition-colors disabled:opacity-60">
              {saving ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </>
  );
}
