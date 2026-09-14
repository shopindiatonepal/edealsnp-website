"use client";
import { useEffect, useState } from "react";

export default function OrderCommentsThread({ orderId, authHeader, viewerRole = "admin", customerName }) {
  const [comments, setComments] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const headers = authHeader ? { Authorization: authHeader } : {};

  function load() {
    fetch(`/api/orders/${orderId}/comments`, { headers }).then((r) => r.json()).then((d) => setComments(d.comments || []));
  }

  useEffect(() => { load(); }, [orderId]);

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    await fetch(`/api/orders/${orderId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ message }),
    });
    setMessage("");
    setSending(false);
    load();
  }

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-line">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint mb-2">{viewerRole === "admin" ? "Notes to customer" : "Messages about this order"}</p>
      <div className="flex flex-col gap-2 mb-2 max-h-40 overflow-y-auto">
        {comments === null ? (
          <p className="text-xs text-ink-faint">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-ink-faint">No messages yet.</p>
        ) : (
          comments.map((c) => {
            const isMine = c.author === viewerRole;
            return (
              <div key={c.id} className={`text-xs rounded-sm px-2.5 py-1.5 max-w-[85%] ${isMine ? "bg-ink text-paper self-end" : "bg-panel self-start"}`}>
                <p>{c.message}</p>
                <p className={`text-[10px] mt-0.5 ${isMine ? "text-paper/60" : "text-ink-faint"}`}>{isMine ? "You" : (viewerRole === "customer" ? "Store" : `Customer${customerName ? ` – ${customerName}` : ""}`)} · {new Date(c.created_at).toLocaleString()}</p>
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={viewerRole === "admin" ? "Message the customer about this order…" : "Ask something about your order…"}
          className="flex-1 border border-line rounded-sm px-2.5 py-1.5 text-xs bg-white"
        />
        <button onClick={send} disabled={sending} className="text-xs font-semibold px-3 py-1.5 bg-ink text-paper rounded-sm disabled:opacity-60">Send</button>
      </div>
    </div>
  );
}

