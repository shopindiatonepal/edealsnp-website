import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the service role key, which bypasses Row Level
// Security — this file must never be imported from a "use client" component.
// It's only ever used inside app/api/** route handlers, which run on the server.
//
// The placeholder fallback below exists so a missing env var fails loudly at
// request time with a clear Supabase error, instead of crashing the entire
// Vercel build the moment this file is imported (which is a much more
// confusing error to debug). If you see Supabase errors at runtime, it means
// NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set correctly.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
  { auth: { persistSession: false } }
);
