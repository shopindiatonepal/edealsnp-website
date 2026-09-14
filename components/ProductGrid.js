"use client";
import { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";

const isPreorderEligible = (p) => p.stock_quantity <= 0 && !p.sold_out && p.preorder;
const isOnSale = (p) => p.on_sale && p.sale_price != null && p.sale_price < p.price;

export default function ProductGrid({ products }) {
  // filter is either null (show everything), a free-text search string, a
  // real category name, or one of the virtual flag filters driven by the
  // existing New Arrival / Sale Price / Preorder checkboxes.
  const [filter, setFilter] = useState(null);
  const [heading, setHeading] = useState("Our products");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("filter");
    const category = params.get("category");
    const search = params.get("search");

    if (flag === "new-arrivals") { setFilter({ type: "flag", value: "new-arrivals" }); setHeading("New arrivals"); }
    else if (flag === "sale") { setFilter({ type: "flag", value: "sale" }); setHeading("Sale products"); }
    else if (flag === "preorder") { setFilter({ type: "flag", value: "preorder" }); setHeading("Preorder"); }
    else if (category) { setFilter({ type: "category", value: category }); setHeading(category); }
    else if (search) { setFilter({ type: "search", value: search }); setHeading(`Results for "${search}"`); }
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return products;
    if (filter.type === "flag") {
      if (filter.value === "new-arrivals") return products.filter((p) => p.featured);
      if (filter.value === "sale") return products.filter(isOnSale);
      if (filter.value === "preorder") return products.filter(isPreorderEligible);
    }
    if (filter.type === "category") {
      return products.filter((p) => p.category === filter.value);
    }
    if (filter.type === "search") {
      const q = filter.value.toLowerCase();
      return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return products;
  }, [filter, products]);

  const preorderProducts = products.filter(isPreorderEligible);

  return (
    <>
      <section id="shop" className="max-w-wrap mx-auto px-5 py-16 md:py-20">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{heading}</h2>
          {filter && (
            <a href="/#shop" onClick={() => { setFilter(null); setHeading("Our products"); }} className="text-xs font-semibold underline text-ink-soft">
              Clear filter
            </a>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-ink-soft text-sm text-center">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {!filter && preorderProducts.length > 0 && (
        <section className="max-w-wrap mx-auto px-5 py-16 md:py-20 border-t border-line">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-center mb-2">Preorder</h2>
          <p className="text-sm text-ink-soft text-center mb-10">Reserve these now — on the way back in stock.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {preorderProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
