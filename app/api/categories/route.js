import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("categories").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(req) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { name, parent_id } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Category name is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({ name: name.trim(), parent_id: parent_id || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}
