"use client";
import { useState } from "react";
import ProductGallery from "./ProductGallery";
import ProductActions from "./ProductActions";
import StarRating from "./StarRating";

export default function ProductDetailClient({ product, reviewCount, avgRating }) {
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const [selected, setSelected] = useState(null); // null = main product option

  // Each of these falls back to the main product's own value whenever the
  // selected variant doesn't override it (either it's the main option, or
  // the variant was marked "same as main product" when it was created).
  const displayName = selected ? selected.name : product.name;
  const activeImage = selected ? (selected.image_url || product.image_url) : product.image_url;
  const displayCategory = selected?.category || product.category;
  const displaySize = selected?.size || product.size;
  const displayDescription = selected?.description || product.description;
  const displayIngredients = selected?.ingredients || product.ingredients;
  const displayExpiry = selected?.expiry_date || product.expiry_date;

  function handleVariantChange(option) {
    setSelected(option);
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 mb-10">
        <ProductGallery
          mainImage={activeImage}
          extraImages={Array.isArray(product.images) ? product.images : []}
          productName={displayName}
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">{displayCategory}</p>
          {/* The product name updates immediately to the selected variant's own
              name — it only shows the plain product name when the main/original
              option is selected. */}
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">{displayName}</h1>
          <p className="text-sm text-ink-soft mb-2">{displaySize}</p>
          {reviewCount > 0 && (
            <div className="mb-4">
              <StarRating rating={avgRating} size={14} showNumber count={reviewCount} />
            </div>
          )}
          <p className={`text-sm leading-relaxed mb-6 ${displayDescription ? "text-ink-soft" : "text-ink-faint italic"}`}>
            {displayDescription || "No description added yet."}
          </p>
          <ProductActions product={product} onVariantChange={hasVariants ? handleVariantChange : undefined} />
        </div>
      </div>

      {(displayIngredients || displayExpiry) && (
        <div className="max-w-2xl mx-auto md:mx-0 mb-16 border-t border-line pt-8 grid sm:grid-cols-2 gap-6">
          {displayIngredients && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-faint mb-2">Ingredients</p>
              <p className="text-sm text-ink-soft leading-relaxed">{displayIngredients}</p>
            </div>
          )}
          {displayExpiry && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-faint mb-2">Best before</p>
              <p className="text-sm text-ink-soft">{new Date(displayExpiry).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
