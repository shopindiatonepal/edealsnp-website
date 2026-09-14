"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";
import { calcDeliveryCharge } from "@/lib/delivery";
import { calcDiscount } from "@/lib/discount";
import { downloadReceipt } from "@/lib/receipt";
import BackButton from "@/components/BackButton";
import StorefrontShell from "@/components/StorefrontShell";
import Footer from "@/components/Footer";
import { ADVANCE_PERCENT } from "@/lib/payment";

const fmt = (n) => `रु ${Number(n).toLocaleString("en-IN")}`;
const phoneOk = (v) => /^\d{10}$/.test(v.trim());

export default function CheckoutPage() {
  const { items, subtotal, setQty, removeItem, clearCart } = useCart();
  const { user, session, loaded } = useAuth();

  const [form, setForm] = useState({ full_name: "", phone: "", alt_phone: "", email: "", address: "", city: "" });
  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentType, setPaymentType] = useState("full");
  const [qrUrl, setQrUrl] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [orderResult, setOrderResult] = useState(null);
  const [orderedItems, setOrderedItems] = useState([]);
  const [orderedDelivery, setOrderedDelivery] = useState(0);

  const hasPreorderItem = items.some((i) => i.is_preorder);
  const deliveryCharge = calcDeliveryCharge(items);
  const discount = calcDiscount(items);
  const total = subtotal + deliveryCharge;
  const advanceAmount = Math.ceil((total * ADVANCE_PERCENT) / 100);
  const amountDue = paymentType === "advance" ? advanceAmount : total;

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, email: f.email || user.email }));
  }, [user]);

  useEffect(() => {
    if (hasPreorderItem) setPaymentMethod("qr");
  }, [hasPreorderItem]);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setQrUrl(d.settings?.payment_qr_url || "/images/payment-qr.jpeg")).catch(() => setQrUrl("/images/payment-qr.jpeg"));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Enter your full name.";
    if (!phoneOk(form.phone)) e.phone = "Enter a valid 10-digit phone number.";
    if (form.alt_phone.trim() && !phoneOk(form.alt_phone)) e.alt_phone = "Enter a valid 10-digit phone number, or leave this blank.";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address, or leave this blank.";
    if (!form.address.trim()) e.address = "Enter your delivery address.";
    if (!form.city.trim()) e.city = "Enter your city.";
    if (paymentMethod === "qr" && !screenshotUrl) e.screenshot = "Upload your payment screenshot to place the order.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleScreenshotUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "payment-proofs");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setScreenshotUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function placeOrder() {
    if (submitting) return; // guard against double submission
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ id: i.id, variant_id: i.variant_id, variant_name: i.variant_name, name: i.name, size: i.size, price: i.price, original_price: i.original_price || null, qty: i.qty, weight_grams: i.weight_grams, image_url: i.image_url })),
          subtotal,
          delivery_charge: deliveryCharge,
          total,
          payment_method: paymentMethod,
          payment_type: paymentMethod === "qr" ? paymentType : "full",
          payment_screenshot_url: screenshotUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong placing your order.");
      setOrderedItems(items);
      setOrderedDelivery(deliveryCharge);
      setOrderResult(data.order);
      clearCart();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function goToOrder() {
    window.location.href = `/account?order=${orderResult.order_number}`;
  }

  if (!loaded) return null;

  if (!user) {
    return (
      <StorefrontShell>
        <div className="max-w-md mx-auto px-5 py-24 text-center min-h-[50vh]">
          <h1 className="text-xl font-extrabold mb-2">Sign in to check out</h1>
          <p className="text-sm text-ink-soft mb-6">An account keeps your order history, receipts, and lets you manage orders later.</p>
          <a href="/account" className="inline-block bg-ink text-paper font-semibold text-sm px-6 py-3 rounded-full hover:bg-moss transition-colors">Sign in</a>
        </div>
        <Footer />
      </StorefrontShell>
    );
  }

  if (orderResult) {
    return (
      <StorefrontShell>
        <div className="max-w-md mx-auto px-5 py-24 text-center min-h-[50vh]">
          <div className="w-14 h-14 rounded-full bg-moss text-white flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h1 className="text-xl font-extrabold mb-1">Order placed</h1>
          <p className="text-sm text-ink-soft mb-5">Save your order number to track it later.</p>
          <p className="font-mono text-lg font-bold bg-panel rounded-sm py-3 mb-5">{orderResult.order_number}</p>
          <button onClick={() => downloadReceipt(orderResult, orderedItems, orderedDelivery)} className="w-full border border-line font-semibold text-sm py-3.5 rounded-full mb-2.5 hover:border-ink transition-colors">
            Download receipt
          </button>
          <button onClick={goToOrder} className="w-full bg-ink text-paper font-semibold text-sm py-3.5 rounded-full hover:bg-moss transition-colors">
            View order
          </button>
        </div>
        <Footer />
      </StorefrontShell>
    );
  }

  if (items.length === 0) {
    return (
      <StorefrontShell>
        <div className="max-w-md mx-auto px-5 py-24 text-center min-h-[50vh]">
          <h1 className="text-xl font-extrabold mb-2">Your cart is empty</h1>
          <a href="/#shop" className="inline-block bg-ink text-paper font-semibold text-sm px-6 py-3 rounded-full hover:bg-moss transition-colors">Continue shopping</a>
        </div>
        <Footer />
      </StorefrontShell>
    );
  }

  const fields = [
    { key: "full_name", label: "Full name", placeholder: "Your name" },
    { key: "phone", label: "Phone", placeholder: "98XXXXXXXX" },
    { key: "alt_phone", label: "Alternate phone (optional)", placeholder: "98XXXXXXXX" },
    { key: "email", label: "Email (optional)", placeholder: "you@example.com" },
    { key: "address", label: "Delivery address", placeholder: "Street, area, landmark" },
    { key: "city", label: "City", placeholder: "e.g. Pokhara" },
  ];

  return (
    <StorefrontShell>
    <div className="max-w-5xl mx-auto px-5 py-8 md:py-12">
      <BackButton fallbackHref="/" label="Back" />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">Checkout</h1>

      <div className="grid md:grid-cols-[1.3fr_1fr] gap-8 md:gap-12">
        {/* Left: delivery + payment */}
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-lg font-extrabold mb-4">Delivery details</h2>
            <div className="grid sm:grid-cols-2 gap-3.5">
              {fields.map((f) => (
                <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-bold mb-1.5">{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={`w-full border rounded-sm bg-panel px-3.5 py-3 text-sm focus:outline-none focus:border-moss ${errors[f.key] ? "border-clay" : "border-line"}`}
                  />
                  {errors[f.key] && <p className="text-xs text-clay mt-1">{errors[f.key]}</p>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-extrabold mb-1">Payment method</h2>
            <p className="text-sm text-ink-soft mb-4">
              {hasPreorderItem ? "Your cart includes a preorder item — advance or full payment by QR is required." : "Choose how you'd like to pay."}
            </p>
            <div className="flex gap-2.5 mb-4">
              {(hasPreorderItem ? ["qr"] : ["cod", "qr"]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 border rounded-md p-3.5 text-center ${paymentMethod === m ? "border-ink bg-white" : "border-line bg-panel"}`}
                >
                  <p className="text-sm font-bold">{m === "cod" ? "Cash on delivery" : "Pay by QR"}</p>
                  <p className="text-[11px] text-ink-soft mt-0.5">{m === "cod" ? "Pay when it arrives" : "eSewa / Khalti / bank"}</p>
                </button>
              ))}
            </div>

            {paymentMethod === "qr" && (
              <div className="flex gap-2.5 mb-4">
                {["full", "advance"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPaymentType(t)}
                    className={`flex-1 border rounded-md p-3 text-center ${paymentType === t ? "border-ink bg-white" : "border-line bg-panel"}`}
                  >
                    <p className="text-sm font-bold">{t === "advance" ? `Advance (${ADVANCE_PERCENT}%)` : "Full payment"}</p>
                    <p className="text-[11px] text-ink-soft mt-0.5">{t === "advance" ? fmt(advanceAmount) : fmt(total)}</p>
                  </button>
                ))}
              </div>
            )}

            {paymentMethod === "qr" && (
              <div className="border border-line rounded-md p-5 text-center bg-white">
                {qrUrl ? (
                  <img src={qrUrl} alt="Payment QR" className="w-56 h-56 mx-auto mb-3 object-contain" />
                ) : (
                  <div className="w-56 h-56 mx-auto mb-3 bg-panel rounded-sm flex items-center justify-center text-xs text-ink-faint">QR not set up yet</div>
                )}
                <p className="text-xs text-ink-faint mb-4">Scan and pay {fmt(amountDue)}, then upload a screenshot as proof — required before you can place the order.</p>
                <label className="inline-block text-xs font-semibold underline cursor-pointer">
                  {uploading ? "Uploading…" : screenshotUrl ? "Screenshot attached — tap to replace" : "Upload payment screenshot"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
                </label>
                {errors.screenshot && <p className="text-xs text-clay mt-2">{errors.screenshot}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Right: order summary */}
        <div>
          <div className="border border-line rounded-md p-5 sticky top-24">
            <h2 className="text-lg font-extrabold mb-4">Order summary</h2>
            <div className="flex flex-col gap-3 mb-4 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={`${item.id}:${item.variant_id || "base"}`} className="flex gap-3">
                  <div className="w-14 h-14 rounded-sm bg-panel border border-line overflow-hidden flex-shrink-0">
                    {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-contain" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-ink-soft mb-1.5">{fmt(item.price)} each</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(item.id, item.variant_id, item.qty - 1)} className="w-5 h-5 rounded-full border border-line flex items-center justify-center text-xs">−</button>
                      <span className="text-xs font-semibold min-w-[14px] text-center">{item.qty}</span>
                      <button
                        onClick={() => setQty(item.id, item.variant_id, item.qty + 1)}
                        disabled={item.maxQty !== Infinity && item.qty >= item.maxQty}
                        className="w-5 h-5 rounded-full border border-line flex items-center justify-center text-xs disabled:text-ink-faint disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-between items-end flex-shrink-0">
                    <span className="text-sm font-bold">{fmt(item.price * item.qty)}</span>
                    <button onClick={() => removeItem(item.id, item.variant_id)} className="text-[10px] text-ink-faint underline">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-sm border-t border-line pt-3 mb-4">
              <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-ink-soft"><span>Home delivery</span><span>{fmt(deliveryCharge)}</span></div>
              {discount > 0 && <div className="flex justify-between text-ink-soft"><span>Discount</span><span>-{fmt(discount)}</span></div>}
              <div className="flex justify-between font-extrabold text-base pt-1.5 border-t border-line"><span>Total</span><span>{fmt(total)}</span></div>
              {paymentType === "advance" && paymentMethod === "qr" && (
                <div className="flex justify-between text-sand font-semibold pt-1"><span>Due now (advance)</span><span>{fmt(advanceAmount)}</span></div>
              )}
            </div>

            {submitError && <p className="text-xs text-clay mb-3">{submitError}</p>}

            <button
              onClick={placeOrder}
              disabled={submitting}
              className="w-full bg-ink text-paper font-semibold text-sm py-3.5 rounded-full hover:bg-moss transition-colors disabled:opacity-60"
            >
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </StorefrontShell>
  );
}
