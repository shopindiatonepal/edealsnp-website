import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logStatusChange } from "@/lib/orderHistory";

// Statuses a customer is allowed to cancel from (before it's shipped out).
const CANCELLABLE_FROM = ["pending", "confirmed"];
// A return can only be requested once the order actually arrived.
const RETURNABLE_FROM = ["delivered"];

export async function POST(req, { params }) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { data: userData } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  const userId = userData?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { action, reason, description } = await req.json();
  if (!["cancel", "return"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Please select a reason." }, { status: 400 });
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id, status, items")
    .eq("id", params.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!order || order.customer_id !== userId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (action === "cancel" && !CANCELLABLE_FROM.includes(order.status)) {
    return NextResponse.json({ error: "This order can no longer be cancelled — it's already on its way." }, { status: 400 });
  }
  if (action === "return" && !RETURNABLE_FROM.includes(order.status)) {
    return NextResponse.json({ error: "A return can only be requested after the order has been delivered." }, { status: 400 });
  }

  const newStatus = action === "cancel" ? "cancelled" : "return_requested";
  const note = description?.trim() ? `${reason} — ${description.trim()}` : reason;

  const { data, error } = await supabaseAdmin.from("orders").update({ status: newStatus }).eq("id", order.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logStatusChange({ orderId: order.id, status: newStatus, note, createdBy: "customer" });

  // Give stock back for a cancel. A return only restocks once the admin
  // marks it processed, since the item hasn't physically come back yet.
  if (action === "cancel") {
    for (const item of order.items || []) {
      const { data: p } = await supabaseAdmin.from("products").select("stock_quantity, variants").eq("id", item.id).maybeSingle();
      if (!p) continue;
      if (item.variant_id && Array.isArray(p.variants)) {
        const updatedVariants = p.variants.map((v) =>
          v.id === item.variant_id ? { ...v, stock_quantity: (v.stock_quantity || 0) + item.qty } : v
        );
        await supabaseAdmin.from("products").update({ variants: updatedVariants }).eq("id", item.id);
      } else {
        await supabaseAdmin.from("products").update({ stock_quantity: p.stock_quantity + item.qty }).eq("id", item.id);
      }
    }
  }

  return NextResponse.json({ order: data });
}
