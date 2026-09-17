// Shared shape-builder for product create/update, so POST and PUT stay in sync.
export function buildProductPayload(body) {
  const {
    name, brand, category, category_id, size, price, color, color_name, description, ingredients, expiry_date,
    image_url, images, variants, featured, sold_out, stock_quantity, preorder,
    weight_grams, on_sale, sale_price,
  } = body;

  return {
    name,
    brand: brand?.trim() || null,
    category,
    category_id: category_id || null,
    size, price,
    color: color?.trim() || null,
    color_name: color_name?.trim() || null,
    description: description || "",
    ingredients: ingredients?.trim() || null,
    expiry_date: expiry_date || null,
    image_url: image_url || null,
    images: Array.isArray(images) ? images : [],
    variants: Array.isArray(variants) ? variants : [],
    featured: Boolean(featured),
    sold_out: Boolean(sold_out),
    stock_quantity: Number.isFinite(Number(stock_quantity)) ? Math.max(0, parseInt(stock_quantity)) : 0,
    preorder: Boolean(preorder),
    weight_grams: Number.isFinite(Number(weight_grams)) && weight_grams > 0 ? Number(weight_grams) : 200,
    on_sale: Boolean(on_sale),
    sale_price: on_sale && sale_price !== "" && sale_price != null ? Number(sale_price) : null,
  };
}
