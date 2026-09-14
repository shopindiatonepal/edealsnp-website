import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function DELETE(req, { params }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { error } = await supabaseAdmin.from("reviews").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
