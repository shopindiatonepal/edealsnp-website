"use client";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";
import { calcDeliveryCharge } from "@/lib/delivery";

const fmt = (n) => `रु ${Number(n).toLocaleString("en-IN")}`;

export default function CartDrawer() {
  const { items, setQty, removeItem, subtotal, drawerOpen, setDrawerOpen } = useCart();
  const { user, loaded } = useAuth();
  const deliveryCharge = items.length > 0 ? calcDeliveryCharge(items) : 0;

  function handleCheckoutClick() {
    window.location.href = user ? "/checkout" : "/account";
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-ink/40 z-[60] transition-opacity ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setDrawerOpen(false)}
      />
      <div className={`fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-paper z-[61] flex flex-col transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="text-lg font-extrabold">Your cart</h3>
          <button onClick={() => setDrawerOpen(false)} className="text-xl text-ink-soft focus-ring">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {items.length === 0 ? (
            <p className="text-center text-ink-soft text-sm py-16">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={`${item.id}:${item.variant_id || "base"}`} className="flex gap-3 py-4 border-b border-line">
                <div className="w-14 h-14 rounded-sm bg-panel flex-shrink-0 overflow-hidden">
                  {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-ink-soft mb-2">{item.size}</p>
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => setQty(item.id, item.variant_id, item.qty - 1)} className="w-6 h-6 rounded-full border border-line flex items-center justify-center text-sm focus-ring">−</button>
                    <span className="text-sm font-semibold min-w-[16px] text-center">{item.qty}</span>
                    <button
                      onClick={() => setQty(item.id, item.variant_id, item.qty + 1)}
                      disabled={item.maxQty !== Infinity && item.qty >= item.maxQty}
                      className="w-6 h-6 rounded-full border border-line flex items-center justify-center text-sm focus-ring disabled:text-ink-faint disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-between items-end">
                  <span className="text-sm font-bold whitespace-nowrap">{fmt(item.price * item.qty)}</span>
                  <button onClick={() => removeItem(item.id, item.variant_id)} className="text-[11px] text-ink-faint underline">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 pt-4 pb-6 border-t border-line">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-semibold">Subtotal</span>
            <span className="text-xl font-extrabold">{fmt(subtotal)}</span>
          </div>
          <p className="text-xs text-ink-faint mb-4">+ {fmt(deliveryCharge)} home delivery charge added at checkout</p>
          {loaded && !user && items.length > 0 && (
            <p className="text-xs text-clay mb-3">Sign in is required to place an order.</p>
          )}
          <button
            disabled={items.length === 0}
            onClick={handleCheckoutClick}
            className="w-full bg-ink text-paper font-semibold text-sm py-3.5 rounded-sm hover:bg-moss transition-colors disabled:bg-panel disabled:text-ink-faint disabled:cursor-not-allowed"
          >
            {loaded && !user ? "Sign in to checkout" : "Checkout"}
          </button>
        </div>
      </div>
    </>
  );
}
