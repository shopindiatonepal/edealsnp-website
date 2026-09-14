import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  return data?.user || null;
}

// A customer is eligible to review a product if they're signed in, have at
// least one delivered order containing that product, and haven't already
// reviewed it.
async function checkEligibility(userId, productId) {
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("items, full_name")
    .eq("customer_id", userId)
    .eq("status", "delivered");

  const matchingOrder = (orders || []).find((o) => o.items?.some((i) => i.id === productId));
  if (!matchingOrder) return { eligible: false, reason: "not_purchased" };

  const { data: existing } = await supabaseAdmin
    .from("reviews")
    .select("id")
    .eq("customer_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing) return { eligible: false, reason: "already_reviewed" };

  return { eligible: true, suggested_name: matchingOrder.full_name };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id");
  if (!productId) return NextResponse.json({ error: "Missing product_id" }, { status: 400 });

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ eligible: false, reason: "signed_out" });

  const result = await checkEligibility(user.id, productId);
  return NextResponse.json(result);
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });
  }

  const { product_id, customer_name, rating, comment } = await req.json();
  if (!product_id || !customer_name?.trim() || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Please add your name and a star rating." }, { status: 400 });
  }

  const { eligible, reason } = await checkEligibility(user.id, product_id);
  if (!eligible) {
    const message =
      reason === "already_reviewed"
        ? "You've already reviewed this product."
        : "You can only review products from a delivered order.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .insert({
      product_id,
      customer_id: user.id,
      customer_name: customer_name.trim(),
      rating,
      comment: comment?.trim() || "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review: data });
}
