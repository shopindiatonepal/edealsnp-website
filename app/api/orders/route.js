import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";
import { sendOrderEmail, sendOrderWhatsApp, sendStoreOrderAlert } from "@/lib/notify";
import { calcDeliveryCharge } from "@/lib/delivery";
import { logStatusChange } from "@/lib/orderHistory";

function genOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ED-${stamp}${rand}`;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get("order_number");
  const phone = searchParams.get("phone");

  if (orderNumber && phone) {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("order_number, status, full_name, city, total, created_at, items")
      .eq("order_number", orderNumber.trim())
      .eq("phone", phone.trim())
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "No order found for that number and phone." }, { status: 404 });
    return NextResponse.json({ order: data });
  }

  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data });
}

export async function POST(req) {
  const body = await req.json();
  const {
    full_name, phone, alt_phone, email, address, city,
    items, subtotal,
    payment_method, payment_type, payment_screenshot_url,
  } = body;

  // Orders require a signed-in customer — no guest checkout. The
  // Authorization header carries the browser's Supabase session token.
  let customer_id = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    customer_id = data?.user?.id || null;
  }
  if (!customer_id) {
    return NextResponse.json({ error: "Please sign in before placing an order." }, { status: 401 });
  }

  const phoneOk = (v) => typeof v === "string" && /^\d{10}$/.test(v.trim());
  const emailOk = (v) => !v || /^\S+@\S+\.\S+$/.test(v.trim());

  if (
    !full_name?.trim() || !phoneOk(phone) ||
    (alt_phone && !phoneOk(alt_phone)) || !emailOk(email) ||
    !address?.trim() || !city?.trim() ||
    !Array.isArray(items) || items.length === 0 ||
    typeof subtotal !== "number"
  ) {
    return NextResponse.json({ error: "Missing or invalid order details." }, { status: 400 });
  }

  // A QR payment must come with proof — no confirming an order on QR
  // without a screenshot attached.
  if (payment_method === "qr" && !payment_screenshot_url) {
    return NextResponse.json({ error: "Please upload a payment screenshot before placing a QR payment order." }, { status: 400 });
  }

  // Look up the actual products to check stock/preorder and get the real
  // weight for delivery calculation — never trust these from the client.
  const productIds = items.map((i) => i.id);
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, name, stock_quantity, preorder, sold_out, weight_grams, variants")
    .in("id", productIds);
  if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });

  const productMap = Object.fromEntries((products || []).map((p) => [p.id, p]));
  const hasPreorderItem = items.some((i) => {
    const p = productMap[i.id];
    return p && p.stock_quantity <= 0 && !p.sold_out && p.preorder;
  });

  // Preorder items can't be paid for cash-on-delivery — advance or full
  // payment by QR only, since the item isn't in hand yet to collect on.
  if (hasPreorderItem && payment_method === "cod") {
    return NextResponse.json({ error: "Preorder items require advance or full payment — cash on delivery isn't available for these." }, { status: 400 });
  }

  // Delivery charge is Rs 200 per kg of real parcel weight (from the
  // product's own weight_grams, or its selected variant's override) —
  // recomputed here so a tampered client value can never under-charge.
  const weightedItems = items.map((i) => {
    const p = productMap[i.id];
    const variant = p?.variants?.find((v) => v.id === i.variant_id);
    return { qty: i.qty, weight_grams: variant?.weight_grams || p?.weight_grams || 200 };
  });
  const delivery_charge = calcDeliveryCharge(weightedItems);
  const total = subtotal + delivery_charge;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({
      order_number: genOrderNumber(),
      full_name: full_name.trim(),
      phone: phone.trim(),
      alt_phone: alt_phone?.trim() || null,
      email: email?.trim() || null,
      address: address.trim(),
      city: city.trim(),
      items,
      subtotal,
      delivery_charge,
      total,
      payment_method: payment_method || "cod",
      payment_type: payment_type || "full",
      payment_screenshot_url: payment_screenshot_url || null,
      status: "pending",
      customer_id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Decrement stock for each item ordered (never below 0) — variant stock if
  // the item has one, otherwise the product's own stock_quantity.
  for (const item of items) {
    const p = productMap[item.id];
    if (!p) continue;
    if (item.variant_id && Array.isArray(p.variants)) {
      const updatedVariants = p.variants.map((v) =>
        v.id === item.variant_id ? { ...v, stock_quantity: Math.max(0, (v.stock_quantity || 0) - item.qty) } : v
      );
      await supabaseAdmin.from("products").update({ variants: updatedVariants }).eq("id", item.id);
    } else {
      const newQty = Math.max(0, p.stock_quantity - item.qty);
      await supabaseAdmin.from("products").update({ stock_quantity: newQty }).eq("id", item.id);
    }
  }

  await logStatusChange({ orderId: data.id, status: "pending", createdBy: "customer" });

  sendOrderEmail(data).catch(() => {});
  sendOrderWhatsApp(data).catch(() => {});
  sendStoreOrderAlert(data).catch(() => {});

  return NextResponse.json({ order: data });
}
