"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Incorrect password.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel px-5">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-md p-8 w-full max-w-sm">
        <h1 className="text-xl font-extrabold mb-1">Store admin</h1>
        <p className="text-sm text-ink-soft mb-6">Enter your admin password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full border border-line rounded-sm bg-panel px-3.5 py-3 text-sm mb-3 focus:outline-none focus:border-moss"
        />
        {error && <p className="text-xs text-clay mb-3">{error}</p>}
        <button disabled={loading} className="w-full bg-ink text-paper font-semibold text-sm py-3.5 rounded-sm hover:bg-moss transition-colors disabled:opacity-60">
          {loading ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
