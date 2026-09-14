import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

async function getOrderAndCheckAccess(req, orderId) {
  const { data: order } = await supabaseAdmin.from("orders").select("id, customer_id").eq("id", orderId).maybeSingle();
  if (!order) return { order: null, allowed: false };

  // Check the customer's Bearer token FIRST. Only the customer-facing UI
  // ever sends an Authorization header at all — the admin dashboard relies
  // purely on the admin cookie. Checking admin first was the bug: if you're
  // also logged into /admin in the same browser, that cookie would win even
  // while you were using the customer's My Orders page, mislabeling every
  // customer message as coming from the store.
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (data?.user?.id && data.user.id === order.customer_id) {
      return { order, allowed: true, author: "customer" };
    }
  }

  if (isAdminRequest()) return { order, allowed: true, author: "admin" };

  return { order, allowed: false };
}

export async function GET(req, { params }) {
  const { allowed } = await getOrderAndCheckAccess(req, params.id);
  if (!allowed) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("order_comments")
    .select("*")
    .eq("order_id", params.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data });
}

export async function POST(req, { params }) {
  const { allowed, author } = await getOrderAndCheckAccess(req, params.id);
  if (!allowed) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("order_comments")
    .insert({ order_id: params.id, author, message: message.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
