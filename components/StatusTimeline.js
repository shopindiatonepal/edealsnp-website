"use client";
import { useEffect, useState } from "react";

export default function StatusTimeline({ orderId, authHeader }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    import("@/lib/supabaseClient").then(({ supabase }) => {
      supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })
        .then(({ data }) => setHistory(data || []));
    });
  }, [orderId]);

  if (history === null) return <p className="text-xs text-ink-faint">Loading timeline…</p>;
  if (history.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint mb-2">Order timeline</p>
      <div className="flex flex-col gap-3">
        {history.map((h, idx) => (
          <div key={h.id} className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <span className={`w-2 h-2 rounded-full ${idx === history.length - 1 ? "bg-moss" : "bg-line"}`} />
              {idx < history.length - 1 && <span className="w-px flex-1 bg-line mt-1" />}
            </div>
            <div className="pb-3">
              <p className="text-xs font-semibold capitalize">{h.status.replace(/_/g, " ")}</p>
              {h.note && <p className="text-xs text-ink-soft mt-0.5">{h.note}</p>}
              {h.courier_name && <p className="text-xs text-ink-soft mt-0.5">Courier: {h.courier_name}</p>}
              {h.tracking_number && (
                <p className="text-xs text-ink-soft mt-0.5">
                  Tracking: {h.tracking_url ? <a href={h.tracking_url} target="_blank" rel="noreferrer" className="underline">{h.tracking_number}</a> : h.tracking_number}
                </p>
              )}
              <p className="text-[11px] text-ink-faint mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
