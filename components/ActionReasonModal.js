"use client";
import { useState } from "react";

const CANCEL_REASONS = ["Changed my mind", "Ordered by mistake", "Found a better price elsewhere", "Delivery taking too long", "Other"];
const RETURN_REASONS = ["Damaged product", "Wrong product received", "Wrong variant/size received", "Product not as described", "Defective product", "Missing item", "Other"];

export default function ActionReasonModal({ action, onClose, onSubmit }) {
  const options = action === "cancel" ? CANCEL_REASONS : RETURN_REASONS;
  const [reason, setReason] = useState(options[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (reason === "Other" && !description.trim()) {
      setError("Please describe the reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await onSubmit({ reason, description: reason === "Other" ? description : description || undefined });
      if (result?.error) setError(result.error);
    } catch (err) {
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/50 p-3 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-md max-w-sm w-full my-10 p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-xl text-ink-soft focus-ring">&times;</button>
        <h2 className="text-lg font-extrabold mb-1">{action === "cancel" ? "Cancel this order" : "Request a return"}</h2>
        <p className="text-sm text-ink-soft mb-4">Let us know why — this helps us improve.</p>

        <label className="block text-xs font-bold mb-1.5">Reason</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-moss">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>

        <label className="block text-xs font-bold mb-1.5">{reason === "Other" ? "Describe the reason" : "Additional details (optional)"}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={reason === "Other" ? "Tell us what happened" : "Optional"}
          className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm min-h-[70px] mb-3 focus:outline-none focus:border-moss"
        />

        {error && <p className="text-xs text-clay mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-ink text-paper font-semibold text-sm py-3 rounded-full hover:bg-moss transition-colors disabled:opacity-60"
        >
          {submitting ? "Submitting…" : action === "cancel" ? "Confirm cancellation" : "Submit return request"}
        </button>
      </div>
    </div>
  );
}
