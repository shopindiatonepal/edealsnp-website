"use client";
import { useState } from "react";

const STATUS_OPTIONS = [
  "pending", "confirmed", "shipped", "in_transit", "delivered",
  "cancelled", "failed_delivery",
  "return_requested", "return_under_review", "return_accepted", "return_rejected",
  "return_in_transit", "return_reached_seller", "quality_check", "return_processed",
  "refunded",
];
const statusLabel = (s) => s.replace(/_/g, " ");
const SHOWS_COURIER = ["shipped", "in_transit", "return_in_transit"];

export default function OrderStatusUpdater({ order, onUpdated }) {
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        note: note || undefined,
        courier_name: courierName || undefined,
        tracking_number: trackingNumber || undefined,
        tracking_url: trackingUrl || undefined,
      }),
    });
    setSaving(false);
    setNote(""); setCourierName(""); setTrackingNumber(""); setTrackingUrl("");
    setExpanded(false);
    onUpdated();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Status</label>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setExpanded(true); }}
          className="flex-1 border border-line rounded-sm px-2.5 py-1.5 text-xs bg-white capitalize"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="capitalize">{statusLabel(s)}</option>)}
        </select>
        <button onClick={() => setExpanded((v) => !v)} className="text-xs font-semibold px-3 py-1.5 border border-line rounded-sm hover:border-ink">
          {expanded ? "Cancel" : "Update"}
        </button>
      </div>

      {expanded && (
        <div className="mt-2.5 border border-line rounded-md p-3 flex flex-col gap-2">
          {SHOWS_COURIER.includes(status) && (
            <>
              <input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="Courier name" className="border border-line rounded-sm px-2.5 py-1.5 text-xs bg-panel" />
              <div className="grid grid-cols-2 gap-2">
                <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" className="border border-line rounded-sm px-2.5 py-1.5 text-xs bg-panel" />
                <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="Tracking URL" className="border border-line rounded-sm px-2.5 py-1.5 text-xs bg-panel" />
              </div>
            </>
          )}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the customer (optional)" className="border border-line rounded-sm px-2.5 py-1.5 text-xs bg-panel min-h-[50px]" />
          <button onClick={handleSave} disabled={saving} className="self-start text-xs font-semibold px-3.5 py-1.5 bg-ink text-paper rounded-sm disabled:opacity-60">
            {saving ? "Saving…" : "Save status update"}
          </button>
        </div>
      )}
    </div>
  );
}
