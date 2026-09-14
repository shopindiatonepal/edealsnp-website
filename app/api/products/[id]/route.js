import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";
import { buildProductPayload } from "@/lib/productPayload";

export async function PUT(req, { params }) {
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

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(buildProductPayload(body))
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(req, { params }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { error } = await supabaseAdmin.from("products").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
