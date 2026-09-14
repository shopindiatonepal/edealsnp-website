import { createClient } from "@supabase/supabase-js";

// Used in the browser — only ever sees the public anon key, which
// is safe to expose (RLS controls what it can actually do).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);
