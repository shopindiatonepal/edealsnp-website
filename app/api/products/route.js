import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";
import { buildProductPayload } from "@/lib/productPayload";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(req) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const body = await req.json();
  const { name, category, size, price } = body;

  if (!name || !category || !size || price === undefined || isNaN(price) || price < 0) {
    return NextResponse.json({ error: "Missing or invalid product fields" }, { status: 400 });
  }
  if (body.on_sale && (body.sale_price == null || isNaN(body.sale_price) || Number(body.sale_price) < 0 || Number(body.sale_price) >= Number(price))) {
    return NextResponse.json({ error: "Sale price must be a valid number between 0 and the regular price." }, { status: 400 });
  }
  if (Array.isArray(body.variants) && body.variants.some((v) => Number(v.price) < 0 || isNaN(Number(v.price)))) {
    return NextResponse.json({ error: "Each variant needs a valid price of 0 or more." }, { status: 400 });
  }

  const { data: minRow } = await supabaseAdmin
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  const sort_order = (minRow?.sort_order ?? 0) - 1;

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({ ...buildProductPayload(body), sort_order })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

// Bulk-update sort order after reordering in admin: body = { order: [id, id, id, ...] }
export async function PATCH(req) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { order } = await req.json();
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "Invalid order list" }, { status: 400 });
  }
  await Promise.all(
    order.map((id, index) => supabaseAdmin.from("products").update({ sort_order: index }).eq("id", id))
  );
  return NextResponse.json({ ok: true });
}
