import { supabaseAdmin } from "./supabaseAdmin";

export async function getProducts() {
  const [{ data: products, error }, { data: reviews }] = await Promise.all([
    supabaseAdmin.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    supabaseAdmin.from("reviews").select("product_id, rating"),
  ]);
  if (error) {
    console.error("getProducts failed:", error.message);
    return [];
  }
  const stats = {};
  for (const r of reviews || []) {
    if (!stats[r.product_id]) stats[r.product_id] = { sum: 0, count: 0 };
    stats[r.product_id].sum += r.rating;
    stats[r.product_id].count += 1;
  }
  return products.map((p) => ({
    ...p,
    avg_rating: stats[p.id] ? stats[p.id].sum / stats[p.id].count : null,
    review_count: stats[p.id]?.count || 0,
  }));
}
