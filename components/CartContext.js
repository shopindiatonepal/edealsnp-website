"use client";
import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "edeals_cart_v2";

function lineKey(id, variantId) {
  return `${id}:${variantId || "base"}`;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  // `lineItem` is a fully-resolved cart line built by the caller (ProductCard
  // for a no-variant quick add, ProductActions for a variant-aware add):
  // { id, variant_id, variant_name, name, size, image_url, price,
  //   weight_grams, maxQty (Infinity if preorder / unlimited), qty }
  function addItem(lineItem) {
    const key = lineKey(lineItem.id, lineItem.variant_id);
    setItems((prev) => {
      const existing = prev.find((i) => lineKey(i.id, i.variant_id) === key);
      if (existing) {
        const newQty = Math.min(existing.qty + lineItem.qty, existing.maxQty ?? Infinity);
        return prev.map((i) => (lineKey(i.id, i.variant_id) === key ? { ...i, qty: newQty } : i));
      }
      return [...prev, { ...lineItem, qty: Math.min(lineItem.qty, lineItem.maxQty ?? Infinity) }];
    });
    setDrawerOpen(true);
  }

  function setQty(id, variantId, qty) {
    const key = lineKey(id, variantId);
    if (qty <= 0) return removeItem(id, variantId);
    setItems((prev) =>
      prev.map((i) => (lineKey(i.id, i.variant_id) === key ? { ...i, qty: Math.min(qty, i.maxQty ?? Infinity) } : i))
    );
  }

  function removeItem(id, variantId) {
    const key = lineKey(id, variantId);
    setItems((prev) => prev.filter((i) => lineKey(i.id, i.variant_id) !== key));
  }

  function clearCart() {
    setItems([]);
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, setQty, removeItem, clearCart, subtotal, count, drawerOpen, setDrawerOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
