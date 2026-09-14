"use client";
import { useCart } from "./CartContext";
import StarRating from "./StarRating";

const fmt = (n) => `रु ${Number(n).toLocaleString("en-IN")}`;

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const outOfStock = product.stock_quantity <= 0 && !product.sold_out;
  const isPreorder = outOfStock && product.preorder;
  const unavailable = product.sold_out || (outOfStock && !product.preorder);
  const onSale = product.on_sale && product.sale_price != null && product.sale_price < product.price;
  const discountPct = onSale ? Math.round((1 - product.sale_price / product.price) * 100) : 0;

  function handleQuickAdd() {
    addItem({
      id: product.id,
      variant_id: null,
      variant_name: null,
      name: product.name,
      size: product.size,
      image_url: product.image_url,
      price: onSale ? product.sale_price : product.price,
      original_price: onSale ? product.price : null,
      weight_grams: product.weight_grams || 200,
      maxQty: product.preorder && product.stock_quantity <= 0 ? Infinity : product.stock_quantity,
      is_preorder: isPreorder,
      qty: 1,
    });
  }

  return (
    <div className="group flex flex-col items-center text-center transition-transform duration-200 hover:-translate-y-1">
      <a
        href={`/product/${product.id}`}
        className="relative aspect-[4/5] w-full rounded-md bg-white border border-line overflow-hidden mb-3 focus-ring transition-shadow duration-200 group-hover:shadow-xl group-hover:shadow-ink/5 group-hover:border-ink/20"
      >
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
          {onSale && (
            <span className="bg-clay text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
              {discountPct}% off
            </span>
          )}
          {product.sold_out ? (
            <span className="bg-clay text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">Sold out</span>
          ) : isPreorder ? (
            <span className="bg-sand text-ink text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">Preorder</span>
          ) : unavailable ? (
            <span className="bg-clay text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">Out of stock</span>
          ) : product.featured ? (
            <span className="bg-moss text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">New</span>
          ) : null}
        </div>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 3c-3 3-3 7 0 10 3-3 3-7 0-10Z" stroke="#9A9C8D" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M12 13v8" stroke="#9A9C8D" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </a>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-1">{product.category}</p>
      <a href={`/product/${product.id}`} className="focus-ring">
        <p className="text-[15px] font-semibold leading-snug mb-0.5 group-hover:text-moss transition-colors">{product.name}</p>
      </a>
      <p className="text-xs text-ink-soft mb-1.5">{product.size}</p>
      {product.review_count > 0 && (
        <div className="mb-2">
          <StarRating rating={product.avg_rating} size={12} showNumber count={product.review_count} />
        </div>
      )}
      <div className="flex flex-col items-center gap-2.5 mt-auto w-full">
        {onSale ? (
          <span className="flex items-center gap-2">
            <span className="text-xs text-ink-faint line-through">{fmt(product.price)}</span>
            <span className="text-sm font-bold text-clay">{fmt(product.sale_price)}</span>
          </span>
        ) : (
          <span className="text-sm font-bold">{fmt(product.price)}</span>
        )}

        {hasVariants ? (
          <>
            {product.variants.some((v) => v.color) && (
              <div className="flex items-center gap-1">
                {product.variants.slice(0, 5).map((v) =>
                  v.color ? (
                    <span key={v.id} className="w-3.5 h-3.5 rounded-full border border-line" style={{ backgroundColor: v.color }} title={v.name} />
                  ) : null
                )}
              </div>
            )}
            <a
              href={`/product/${product.id}`}
              className="text-xs font-semibold px-5 py-2 rounded-full border border-ink text-ink hover:bg-ink hover:text-paper transition-all"
            >
              Choose options
            </a>
          </>
        ) : (
          <button
            onClick={handleQuickAdd}
            disabled={unavailable}
            className="text-xs font-semibold px-5 py-2 rounded-full bg-ink text-paper hover:bg-moss hover:shadow-md hover:shadow-moss/20 transition-all disabled:bg-panel disabled:text-ink-faint disabled:cursor-not-allowed disabled:shadow-none"
          >
            {product.sold_out ? "Sold out" : isPreorder ? "Preorder" : unavailable ? "Out of stock" : "Add to cart"}
          </button>
        )}
      </div>
    </div>
  );
}
