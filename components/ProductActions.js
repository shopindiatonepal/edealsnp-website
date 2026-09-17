"use client";
import { useState } from "react";
import { useCart } from "@/components/CartContext";

const fmt = (n) => `रु ${Number(n).toLocaleString("en-IN")}`;

// The "Main / Original" option always exists alongside real variants — it's
// never hidden just because variants were added. It carries the product's
// own price/stock/image, with variant_id null so it's treated the same as a
// no-variant product everywhere else (cart, orders, stock decrement).
function buildMainOption(product) {
  return {
    id: null,
    name: product.name,
    color: product.color || "",
    color_name: product.color_name || "",
    image_url: product.image_url,
    price: product.on_sale && product.sale_price != null ? product.sale_price : product.price,
    original_price: product.price,
    stock_quantity: product.stock_quantity,
    weight_grams: product.weight_grams || 200,
    isMain: true,
  };
}

export default function ProductActions({ product, onVariantChange }) {
  const { addItem } = useCart();
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const mainOption = buildMainOption(product);
  const options = hasVariants ? [mainOption, ...product.variants.map((v) => ({ ...v, original_price: null }))] : [];
  const [selected, setSelected] = useState(hasVariants ? mainOption : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const effectivePrice = hasVariants ? selected.price : (product.on_sale && product.sale_price != null ? product.sale_price : product.price);
  const effectiveStock = hasVariants ? selected.stock_quantity : product.stock_quantity;
  const effectiveWeight = hasVariants ? selected.weight_grams : (product.weight_grams || 200);
  const showingOriginalStrike = hasVariants ? selected.isMain && product.on_sale && product.sale_price != null : product.on_sale && product.sale_price != null && product.sale_price < product.price;
  const strikePrice = hasVariants ? product.price : product.price;

  const outOfStock = effectiveStock <= 0 && !product.sold_out;
  const isPreorder = outOfStock && product.preorder;
  const unavailable = product.sold_out || (outOfStock && !product.preorder);
  const maxQty = isPreorder ? Infinity : effectiveStock;

  function handleSelect(opt) {
    setSelected(opt);
    setQty(1);
    if (onVariantChange) onVariantChange(opt);
  }

  function handleAdd() {
    const isVariantSelected = hasVariants && !selected.isMain;
    addItem({
      id: product.id,
      variant_id: isVariantSelected ? selected.id : null,
      // The name shown everywhere downstream (cart, checkout, order, My
      // Orders, receipt, admin) is the actual selected option's own name —
      // the variant's real name when one is picked, the product's own name
      // for the main option. variant_name is kept too as a tag some views
      // still read.
      name: isVariantSelected ? selected.name : product.name,
      variant_name: isVariantSelected ? selected.name : null,
      size: product.size,
      image_url: hasVariants ? selected.image_url || product.image_url : product.image_url,
      price: effectivePrice,
      original_price: !isVariantSelected && product.on_sale && product.sale_price != null ? product.price : null,
      weight_grams: effectiveWeight,
      maxQty,
      is_preorder: isPreorder,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div>
      {hasVariants && (
        <div className="mb-5">
          <p className="text-xs font-bold mb-2">Options</p>
          <div className="flex flex-wrap gap-2 mb-1.5">
            {options.map((v) => (
              <button
                key={v.id || "main"}
                onClick={() => handleSelect(v)}
                className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
                  (selected.id || "main") === (v.id || "main") ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                }`}
              >
                {v.color && <span className="w-3.5 h-3.5 rounded-full border border-ink/10 flex-shrink-0" style={{ backgroundColor: v.color }} />}
                {v.name}
              </button>
            ))}
          </div>
          {selected?.color_name && <p className="text-xs text-ink-soft">Color: <span className="font-semibold text-ink">{selected.color_name}</span></p>}
        </div>
      )}

      {showingOriginalStrike ? (
        <p className="mb-2">
          <span className="text-lg text-ink-faint line-through mr-2">{fmt(strikePrice)}</span>
          <span className="text-2xl font-extrabold text-clay">{fmt(effectivePrice)}</span>
        </p>
      ) : (
        <p className="text-2xl font-extrabold mb-2">{fmt(effectivePrice)}</p>
      )}

      {isPreorder && <p className="text-xs font-semibold text-sand bg-sand/10 inline-block px-2.5 py-1 rounded-full mb-3">Available on preorder</p>}
      {!unavailable && !isPreorder && effectiveStock > 0 && effectiveStock <= 5 && (
        <p className="text-xs font-semibold text-clay mb-3">Only {effectiveStock} left in stock</p>
      )}

      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center border border-line rounded-full">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-lg">−</button>
          <span className="w-8 text-center text-sm font-semibold">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(q + 1, maxQty === Infinity ? q + 1 : maxQty))}
            disabled={maxQty !== Infinity && qty >= maxQty}
            className="w-9 h-9 flex items-center justify-center text-lg disabled:text-ink-faint disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={unavailable}
          className={`flex-1 font-semibold text-sm py-3.5 rounded-full transition-all duration-200 disabled:bg-panel disabled:text-ink-faint disabled:cursor-not-allowed ${
            added ? "bg-moss text-white" : "bg-ink text-paper hover:bg-moss hover:shadow-lg hover:shadow-moss/20 hover:-translate-y-0.5"
          }`}
        >
          {product.sold_out ? "Sold out" : unavailable ? "Out of stock" : added ? "Added ✓" : isPreorder ? "Preorder" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
