import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function DELETE(req, { params }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  // Deleting a category also deletes its subcategories (on delete cascade in
  // the schema). Products that used this category keep their existing
  // category_id as null after this — they won't disappear, just show as
  // uncategorized until re-assigned.
  const { error } = await supabaseAdmin.from("categories").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
