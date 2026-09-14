import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  // Supabase never exposes password hashes, let alone plaintext passwords —
  // nobody can retrieve those, including Anthropic or Supabase themselves.
  // This lists what's actually available: email, sign-up date, and status.
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const customers = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
    last_sign_in_at: u.last_sign_in_at,
  }));
  return NextResponse.json({ customers });
}
