import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";
import { logStatusChange } from "@/lib/orderHistory";

const VALID_STATUSES = [
  "pending", "confirmed", "shipped", "in_transit", "delivered",
  "cancelled", "failed_delivery",
  "return_requested", "return_under_review", "return_accepted", "return_rejected",
  "return_in_transit", "return_reached_seller", "quality_check", "return_processed",
  "refunded",
];

// Statuses where stock is considered "held" for the customer (deducted).
// Anything not in this list means the item effectively came back to stock.
const HOLDING_STATUSES = ["pending", "confirmed", "shipped", "in_transit", "delivered"];

export async function PATCH(req, { params }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { status, note, courier_name, tracking_number, tracking_url } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("status, items")
    .eq("id", params.id)
    .single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const wasHolding = HOLDING_STATUSES.includes(existing.status);
  const nowHolding = HOLDING_STATUSES.includes(status);

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logStatusChange({
    orderId: params.id,
    status,
    note,
    courierName: courier_name,
    trackingNumber: tracking_number,
    trackingUrl: tracking_url,
    createdBy: "admin",
  });

  // Moving OUT of a holding status (e.g. cancelled/returned) restocks items.
  // Moving back INTO one re-deducts. This keeps stock accurate no matter how
  // many times an order's status changes back and forth — variant stock is
  // adjusted the same way as the product's own stock_quantity.
  if (wasHolding !== nowHolding) {
    const sign = wasHolding && !nowHolding ? 1 : -1; // +1 = give back, -1 = take again
    for (const item of existing.items || []) {
      const { data: p } = await supabaseAdmin.from("products").select("stock_quantity, variants").eq("id", item.id).maybeSingle();
      if (!p) continue;
      if (item.variant_id && Array.isArray(p.variants)) {
        const updatedVariants = p.variants.map((v) =>
          v.id === item.variant_id ? { ...v, stock_quantity: Math.max(0, (v.stock_quantity || 0) + sign * item.qty) } : v
        );
        await supabaseAdmin.from("products").update({ variants: updatedVariants }).eq("id", item.id);
      } else {
        await supabaseAdmin.from("products").update({ stock_quantity: Math.max(0, p.stock_quantity + sign * item.qty) }).eq("id", item.id);
      }
    }
  }

  return NextResponse.json({ order: data });
}

export async function DELETE(req, { params }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { error } = await supabaseAdmin.from("orders").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
