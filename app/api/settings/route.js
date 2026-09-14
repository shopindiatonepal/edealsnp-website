import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PUT(req) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const body = await req.json();
  const updates = {};
  if ("payment_qr_url" in body) updates.payment_qr_url = body.payment_qr_url ?? null;
  if ("logo_url" in body) updates.logo_url = body.logo_url ?? null;
  if ("hero_image_url" in body) updates.hero_image_url = body.hero_image_url ?? null;
  if ("contact_image_url" in body) updates.contact_image_url = body.contact_image_url ?? null;

  const { data, error } = await supabaseAdmin
    .from("store_settings")
    .update(updates)
    .eq("id", 1)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
