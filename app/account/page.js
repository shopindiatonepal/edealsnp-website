"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import OrderCommentsThread from "@/components/OrderCommentsThread";
import ActionReasonModal from "@/components/ActionReasonModal";
import StatusTimeline from "@/components/StatusTimeline";
import { downloadReceipt } from "@/lib/receipt";
import { calcDiscount } from "@/lib/discount";
import { calcPaymentAmounts } from "@/lib/payment";

const fmt = (n) => `रु ${Number(n).toLocaleString("en-IN")}`;

export default function AccountPage() {
  const { user, loaded } = useAuth();

  return (
    <>
      <Header />
      <div className="max-w-wrap mx-auto px-5 py-12 md:py-16 min-h-[50vh]">
        <BackButton fallbackHref="/" label="Back to store" />
        {!loaded ? null : user ? <OrderHistory /> : <AuthForm />}
      </div>
      <Footer />
    </>
  );
}

function AuthForm() {
  const [mode, setMode] = useState("sign_in"); // sign_in | sign_up | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // "account created" popup, only shown when confirmation is required

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "forgot") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/account/reset-password`,
      });
      setLoading(false);
      if (err) { setError(err.message); return; }
      setMessage("Check your email for a password reset link.");
      return;
    }

    const { data, error: err } =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (mode === "sign_up") {
      if (data.session) {
        // Confirmation is off — Supabase already signed them in. AuthContext
        // picks this up automatically and the page re-renders into
        // OrderHistory on its own; nothing more to do here.
      } else {
        // Confirmation is required — no session yet, so show a clear popup
        // rather than leaving them looking at the same form with no feedback.
        setShowSuccess(true);
      }
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">
        {mode === "sign_in" ? "Sign in" : mode === "sign_up" ? "Create an account" : "Reset your password"}
      </h1>
      <p className="text-sm text-ink-soft mb-6">
        {mode === "sign_in" ? "See your past orders and reorder faster." : mode === "sign_up" ? "Save your details for faster checkout next time." : "Enter your email and we'll send you a reset link."}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" className="border border-line rounded-sm bg-panel px-3.5 py-3 text-sm focus:outline-none focus:border-moss"
        />
        {mode !== "forgot" && (
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" className="border border-line rounded-sm bg-panel px-3.5 py-3 text-sm focus:outline-none focus:border-moss"
          />
        )}
        {error && <p className="text-xs text-clay">{error}</p>}
        {message && <p className="text-xs text-moss">{message}</p>}
        <button disabled={loading} className="bg-ink text-paper font-semibold text-sm py-3.5 rounded-sm hover:bg-moss transition-colors disabled:opacity-60">
          {loading ? "Please wait…" : mode === "sign_in" ? "Sign in" : mode === "sign_up" ? "Create account" : "Send reset link"}
        </button>
      </form>

      {mode === "sign_in" && (
        <button onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} className="text-xs text-ink-soft underline mt-4 block">
          Forgot password?
        </button>
      )}

      <button
        onClick={() => { setMode(mode === "sign_up" ? "sign_in" : "sign_up"); setError(""); setMessage(""); }}
        className="text-xs text-ink-soft underline mt-2"
      >
        {mode === "sign_up" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>

      {mode === "forgot" && (
        <button onClick={() => { setMode("sign_in"); setError(""); setMessage(""); }} className="text-xs text-ink-soft underline mt-2 block">
          Back to sign in
        </button>
      )}

      <p className="text-xs text-ink-faint mt-8">
        An account is required to place an order, so we can keep your order history and let you manage orders here.
      </p>

      {showSuccess && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 p-3" onClick={() => setShowSuccess(false)}>
          <div className="bg-white rounded-md max-w-xs w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-moss text-white flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 className="text-lg font-extrabold mb-1">Account created</h2>
            <p className="text-sm text-ink-soft mb-5">Check your email to confirm your account, then sign in.</p>
            <button
              onClick={() => { setShowSuccess(false); setMode("sign_in"); setPassword(""); }}
              className="w-full bg-ink text-paper font-semibold text-sm py-3 rounded-full hover:bg-moss transition-colors"
            >
              Go to sign in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderHistory() {
  const { user, session } = useAuth();
  const [orders, setOrders] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { order, action } | null

  function load() {
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data || []);
        // If we just arrived here from checkout with ?order=ED-XXXX, jump
        // straight to that order's detail view instead of a plain list.
        const params = new URLSearchParams(window.location.search);
        const orderNumber = params.get("order");
        if (orderNumber) {
          const match = (data || []).find((o) => o.order_number === orderNumber);
          if (match) setExpandedId(match.id);
        }
      });
  }

  useEffect(() => { load(); }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function submitAction({ reason, description }) {
    const { order, action } = actionModal;
    const res = await fetch(`/api/orders/${order.id}/customer-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, reason, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || "Something went wrong." };
    }
    setActionModal(null);
    load();
    return {};
  }

  const CANCELLABLE = ["pending", "confirmed"];
  const RETURNABLE = ["delivered"];

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">Your orders</h1>
          <p className="text-sm text-ink-soft">Signed in as {user.email}</p>
        </div>
        <button onClick={handleSignOut} className="text-sm text-ink-soft underline">Sign out</button>
      </div>

      {orders === null ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-ink-soft bg-panel rounded-md p-6">
          No orders yet — orders you place while signed in will show up here.
        </p>
      ) : (
        <div className="flex flex-col gap-4 max-w-lg">
          {orders.map((o) => {
            const expanded = expandedId === o.id;
            return (
              <div key={o.id} className="border border-line rounded-md p-5">
                <button onClick={() => setExpandedId(expanded ? null : o.id)} className="w-full text-left">
                  <div className="flex justify-between mb-2">
                    <span className="font-mono text-sm font-bold">{o.order_number}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide bg-moss/10 text-moss px-3 py-1 rounded-full">{o.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-xs text-ink-faint mb-3">{new Date(o.created_at).toLocaleDateString()}</p>
                  {!expanded && (
                    <div className="flex items-center gap-2 mb-2">
                      {o.items.slice(0, 4).map((i, idx) => (
                        <div key={idx} className="w-9 h-9 rounded-sm bg-panel border border-line overflow-hidden flex-shrink-0">
                          {i.image_url ? (
                            <img src={i.image_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-ink-faint text-[9px]">N/A</div>
                          )}
                        </div>
                      ))}
                      {o.items.length > 4 && <span className="text-xs text-ink-faint">+{o.items.length - 4}</span>}
                    </div>
                  )}
                  <p className="text-sm font-bold">{fmt(o.total)}</p>
                </button>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-dashed border-line">
                    <StatusTimeline orderId={o.id} />

                    <div className="text-xs text-ink-soft space-y-0.5 mb-4">
                      <p><strong className="text-ink">{o.full_name}</strong> · {o.phone}</p>
                      <p>{o.address}, {o.city}</p>
                    </div>

                    <div className="text-xs bg-panel rounded-sm p-3 mb-4 space-y-1">
                      {(() => {
                        const pay = calcPaymentAmounts(o.total, o.payment_method, o.payment_type);
                        return (
                          <>
                            <div className="flex justify-between"><span className="text-ink-soft">Payment method</span><span className="font-semibold">{pay.label}</span></div>
                            <div className="flex justify-between"><span className="text-ink-soft">Amount paid</span><span className="font-semibold">{fmt(pay.paid)}</span></div>
                            {pay.due > 0 && <div className="flex justify-between text-clay"><span>Amount due</span><span className="font-semibold">{fmt(pay.due)}</span></div>}
                          </>
                        );
                      })()}
                    </div>

                    <div className="mb-4 flex flex-col gap-2">
                      {o.items.map((i, idx) => (
                        <a key={idx} href={`/product/${i.id}`} className="flex items-center gap-3 text-xs py-1 hover:text-moss group">
                          <div className="w-10 h-10 rounded-sm bg-panel border border-line overflow-hidden flex-shrink-0">
                            {i.image_url ? (
                              <img src={i.image_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-ink-faint text-[9px]">N/A</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate group-hover:underline">{i.name}</p>
                            <p className="text-ink-faint">Qty {i.qty} · {fmt(i.price)} each</p>
                          </div>
                          <span className="font-semibold flex-shrink-0">{fmt(i.price * i.qty)}</span>
                        </a>
                      ))}
                    </div>

                    <div className="text-xs bg-panel rounded-sm p-3 mb-4 space-y-1">
                      <div className="flex justify-between text-ink-soft"><span>Product subtotal</span><span>{fmt(o.subtotal)}</span></div>
                      <div className="flex justify-between text-ink-soft"><span>Home delivery</span><span>{fmt(o.delivery_charge)}</span></div>
                      <div className="flex justify-between text-ink-soft"><span>Discount</span><span>{fmt(calcDiscount(o.items))}</span></div>
                      <div className="flex justify-between font-bold text-ink pt-1.5 mt-1 border-t border-line"><span>Total</span><span>{fmt(o.total)}</span></div>
                    </div>

                    {o.payment_screenshot_url && (
                      <div className="mb-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint mb-1.5">Your payment screenshot</p>
                        <a href={o.payment_screenshot_url} target="_blank" rel="noreferrer">
                          <img src={o.payment_screenshot_url} alt="Payment proof" className="w-28 h-28 object-cover rounded-sm border border-line" />
                        </a>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        onClick={() => downloadReceipt(o, o.items, o.delivery_charge)}
                        className="text-xs font-semibold px-3.5 py-2 border border-line rounded-full hover:border-ink"
                      >
                        Download receipt
                      </button>
                      {CANCELLABLE.includes(o.status) && (
                        <button onClick={() => setActionModal({ order: o, action: "cancel" })} className="text-xs font-semibold px-3.5 py-2 border border-clay text-clay rounded-full hover:bg-clay/5">
                          Cancel order
                        </button>
                      )}
                      {RETURNABLE.includes(o.status) && (
                        <button onClick={() => setActionModal({ order: o, action: "return" })} className="text-xs font-semibold px-3.5 py-2 border border-line rounded-full hover:border-ink">
                          Request return
                        </button>
                      )}
                    </div>

                    <OrderCommentsThread orderId={o.id} authHeader={`Bearer ${session.access_token}`} viewerRole="customer" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {actionModal && (
        <ActionReasonModal
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onSubmit={submitAction}
        />
      )}
    </div>
  );
}
