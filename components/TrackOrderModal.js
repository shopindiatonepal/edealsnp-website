"use client";
import { useState } from "react";

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];
const fmt = (n) => `रु ${Number(n).toLocaleString("en-IN")}`;

export default function TrackOrderModal({ onClose }) {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  async function handleTrack(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch(`/api/orders?order_number=${encodeURIComponent(orderNumber.trim())}&phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order not found.");
      setOrder(data.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const cancelled = order?.status === "cancelled";
  const currentIndex = STATUS_STEPS.indexOf(order?.status);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/50 p-3 overflow-y-auto" onClick={onClose}>
      <div className="bg-paper rounded-md max-w-md w-full my-6 p-6 md:p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-xl text-ink-soft focus-ring">&times;</button>
        <h2 className="text-xl font-extrabold mb-1">Track your order</h2>
        <p className="text-sm text-ink-soft mb-5">Enter your order number and the phone number you checked out with.</p>

        <form onSubmit={handleTrack} className="flex flex-col gap-3 mb-2">
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order number, e.g. ED-XXXXXXX"
            className="w-full border border-line rounded-sm bg-panel px-3.5 py-3 text-sm focus:outline-none focus:border-moss"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone used at checkout"
            className="w-full border border-line rounded-sm bg-panel px-3.5 py-3 text-sm focus:outline-none focus:border-moss"
          />
          <button disabled={loading} className="w-full bg-ink text-paper font-semibold text-sm py-3.5 rounded-sm hover:bg-moss transition-colors disabled:opacity-60">
            {loading ? "Looking up…" : "Track order"}
          </button>
        </form>

        {error && <p className="text-xs text-clay mt-2">{error}</p>}

        {order && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-sm font-bold">{order.order_number}</span>
              <span className={`text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full ${cancelled ? "bg-clay/10 text-clay" : "bg-moss/10 text-moss"}`}>
                {order.status}
              </span>
            </div>
            {!cancelled && (
              <div className="flex justify-between gap-1 mb-5">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex-1 text-center relative">
                    <div className={`w-5 h-5 rounded-full mx-auto mb-1.5 ${i <= currentIndex ? "bg-moss" : "bg-line"}`} />
                    <p className={`text-[10px] uppercase tracking-wide ${i <= currentIndex ? "text-ink font-semibold" : "text-ink-faint"}`}>{s}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="text-sm border-t border-line pt-4">
              <p className="text-ink-soft mb-1">{order.full_name} · {order.city}</p>
              <p className="font-bold">{fmt(order.total)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
