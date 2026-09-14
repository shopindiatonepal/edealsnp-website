"use client";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import StarRating from "./StarRating";

export default function ReviewsSection({ productId, initialReviews, avgRating, reviewCount }) {
  const { user, session, loaded } = useAuth();
  const [reviews, setReviews] = useState(initialReviews);
  const [eligibility, setEligibility] = useState(null); // { eligible, reason } | null while loading
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loaded) return;
    if (!user) {
      setEligibility({ eligible: false, reason: "signed_out" });
      return;
    }
    fetch(`/api/reviews?product_id=${productId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setEligibility(d);
        if (d.suggested_name) setName(d.suggested_name);
      })
      .catch(() => setEligibility({ eligible: false, reason: "error" }));
  }, [loaded, user, productId, session]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || rating === 0) {
      setError("Add your name and pick a star rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ product_id: productId, customer_name: name, rating, comment }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Couldn't submit your review.");
      return;
    }
    setReviews((r) => [data.review, ...r]);
    setShowForm(false);
    setEligibility({ eligible: false, reason: "already_reviewed" });
    setName(""); setRating(0); setComment("");
  }

  return (
    <div className="max-w-2xl mx-auto md:mx-0">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold mb-1">Reviews</h2>
          {reviewCount > 0 ? (
            <StarRating rating={avgRating} size={15} showNumber count={reviewCount} />
          ) : (
            <p className="text-sm text-ink-soft">No reviews yet — be the first.</p>
          )}
        </div>

        {eligibility?.eligible && (
          <button onClick={() => setShowForm((v) => !v)} className="text-sm font-semibold border border-line rounded-full px-4 py-2 hover:border-ink transition-colors">
            Write a review
          </button>
        )}
        {eligibility?.reason === "signed_out" && (
          <a href="/account" className="text-sm font-semibold border border-line rounded-full px-4 py-2 hover:border-ink transition-colors">
            Sign in to review
          </a>
        )}
        {eligibility?.reason === "already_reviewed" && (
          <span className="text-xs text-ink-faint">You've reviewed this product</span>
        )}
        {eligibility?.reason === "not_purchased" && (
          <span className="text-xs text-ink-faint max-w-[220px] text-right">Available after a delivered order of this product</span>
        )}
      </div>

      {showForm && eligibility?.eligible && (
        <form onSubmit={handleSubmit} className="border border-line rounded-md p-5 mb-6">
          <label className="block text-xs font-bold mb-1.5">Your rating</label>
          <div className="flex gap-1.5 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)} className="focus-ring" aria-label={`${s} star${s > 1 ? "s" : ""}`}>
                <svg width="24" height="24" viewBox="0 0 20 20">
                  <path d="M10 1.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.7l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L10 1.5Z" fill={rating >= s ? "#D8BE93" : "#E7E7E3"} />
                </svg>
              </button>
            ))}
          </div>
          <label className="block text-xs font-bold mb-1.5">Your name</label>
          <input value={name} readOnly className="w-full border border-line rounded-sm bg-panel px-3.5 py-2.5 text-sm mb-4 text-ink-soft cursor-not-allowed" />
          <label className="block text-xs font-bold mb-1.5">Your review (optional)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full border border-line rounded-sm bg-panel px-3.5 py-2.5 text-sm min-h-[70px] mb-4 focus:outline-none focus:border-moss" />
          {error && <p className="text-xs text-clay mb-3">{error}</p>}
          <button disabled={submitting} className="bg-ink text-paper font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-moss transition-colors disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-5">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-line pb-5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold">{r.customer_name}</p>
              <span className="text-xs text-ink-faint">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <StarRating rating={r.rating} size={13} />
            {r.comment && <p className="text-sm text-ink-soft mt-2 leading-relaxed">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
