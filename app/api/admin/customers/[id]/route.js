import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

// Blocking bans the account from signing in (existing sessions stay valid
// until they expire) without deleting anything — their order history stays
// intact. A very long ban is effectively indefinite; passing "none" removes it.
export async function PATCH(req, { params }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { banned } = await req.json();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(params.id, {
    ban_duration: banned ? "876000h" : "none", // ~100 years, i.e. indefinite
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Deletes the account entirely. Their past orders stay in the database
// (customer_id just becomes unlinked) since orders reference the user with
// "on delete set null", not cascade — order history/revenue records aren't
// silently destroyed by removing an account.
export async function DELETE(req, { params }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
