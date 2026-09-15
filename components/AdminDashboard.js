"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductFormModal from "./ProductFormModal";
import OrderCommentsThread from "./OrderCommentsThread";
import OrderStatusUpdater from "./OrderStatusUpdater";
import StatusTimeline from "./StatusTimeline";
import { calcDiscount } from "@/lib/discount";
import { calcPaymentAmounts } from "@/lib/payment";
import { resizeImageFile } from "@/lib/resizeImage";

const fmt = (n) => `रु ${Number(n).toLocaleString("en-IN")}`;

export default function AdminDashboard() {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState({});
  const [editing, setEditing] = useState(undefined);
  const [uploadState, setUploadState] = useState({});
  const router = useRouter();

  async function loadAll() {
    const [p, o, c, s] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]);
    setProducts(p.products || []);
    setOrders(o.orders || []);
    setCategories(c.categories || []);
    setSettings(s.settings || {});
  }

  useEffect(() => { loadAll(); }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  async function deleteProduct(id, name) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function moveProduct(index, direction) {
    const newList = [...products];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= newList.length) return;
    [newList[index], newList[swapWith]] = [newList[swapWith], newList[index]];
    setProducts(newList);
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newList.map((p) => p.id) }),
    });
  }

  async function deleteOrder(id, orderNumber) {
    if (!confirm(`Delete order ${orderNumber}? This can't be undone.`)) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function addCategory(name, parentId) {
    if (!name.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent_id: parentId || null }),
    });
    loadAll();
  }

  async function deleteCategory(id, name) {
    if (!confirm(`Delete category "${name}"? Subcategories under it will also be removed.`)) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function deleteReview(id) {
    if (!confirm("Delete this review?")) return false;
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    return true;
  }

  async function handleSettingUpload(key, bucket, e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadState((s) => ({ ...s, [key]: { uploading: true, error: "" } }));
    try {
      const resized = await resizeImageFile(file);
      const fd = new FormData();
      fd.append("file", resized);
      fd.append("bucket", bucket);
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (up.error) throw new Error(up.error);
      const saveRes = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: up.url }),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json();
        throw new Error(d.error || "Saving the setting failed.");
      }
      loadAll();
    } catch (err) {
      setUploadState((s) => ({ ...s, [key]: { uploading: false, error: err.message } }));
      return;
    }
    setUploadState((s) => ({ ...s, [key]: { uploading: false, error: "" } }));
  }

  async function resetSetting(key) {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: null }),
    });
    loadAll();
  }

  const settingsFields = [
    { key: "logo_url", label: "Store logo", help: "Shown in the header at the top of your storefront." },
    { key: "payment_qr_url", label: "Payment QR code", help: "Shown to customers who choose \"Pay by QR\" at checkout." },
    { key: "hero_image_url", label: "Homepage background photo", help: "The large photo behind \"Your Self-care Partner\" on the homepage." },
    { key: "contact_image_url", label: "Contact section photo", help: "The photo shown next to your contact details near the bottom of the homepage." },
  ];

  return (
    <div className="min-h-screen bg-panel">
      <div className="bg-white border-b border-line">
        <div className="max-w-wrap mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-lg font-extrabold">Store admin</h1>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-ink-soft hover:text-ink">View store</a>
            <button onClick={handleLogout} className="text-sm text-ink-soft hover:text-ink">Log out</button>
          </div>
        </div>
        <div className="max-w-wrap mx-auto px-5 flex gap-6 overflow-x-auto">
          {["products", "categories", "orders", "customers", "reviews", "settings"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-semibold py-3 border-b-2 capitalize whitespace-nowrap ${tab === t ? "border-ink text-ink" : "border-transparent text-ink-soft"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-wrap mx-auto px-5 py-8">
        {tab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <p className="text-sm text-ink-soft">{products.length} product{products.length !== 1 ? "s" : ""} · use the arrows to change display order</p>
              <button onClick={() => setEditing(null)} className="bg-ink text-paper text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-moss transition-colors">
                Add product
              </button>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-ink-soft bg-white border border-line rounded-md p-6">No products yet — add your first one above.</p>
            ) : (
              <div className="bg-white border border-line rounded-md divide-y divide-line">
                {products.map((p, index) => (
                  <div key={p.id} className="flex items-center gap-3 p-4">
                    <div className="flex flex-col">
                      <button onClick={() => moveProduct(index, -1)} disabled={index === 0} className="text-ink-faint hover:text-ink disabled:opacity-30 text-xs leading-none py-0.5">▲</button>
                      <button onClick={() => moveProduct(index, 1)} disabled={index === products.length - 1} className="text-ink-faint hover:text-ink disabled:opacity-30 text-xs leading-none py-0.5">▼</button>
                    </div>
                    <div className="w-12 h-12 rounded-sm bg-panel flex-shrink-0 overflow-hidden">
                      {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {p.name} <span className="text-ink-faint font-normal">{p.size}</span>
                        {p.featured && <span className="ml-2 text-[10px] font-bold bg-moss/10 text-moss px-2 py-0.5 rounded-full">Featured</span>}
                        {p.on_sale && <span className="ml-2 text-[10px] font-bold bg-clay/10 text-clay px-2 py-0.5 rounded-full">Sale</span>}
                        {p.sold_out && <span className="ml-2 text-[10px] font-bold bg-clay/10 text-clay px-2 py-0.5 rounded-full">Sold out</span>}
                        {!p.sold_out && p.stock_quantity <= 0 && p.preorder && <span className="ml-2 text-[10px] font-bold bg-sand/20 text-ink px-2 py-0.5 rounded-full">Preorder</span>}
                      </p>
                      <p className="text-xs text-ink-soft">{p.category} · {fmt(p.price)} · {p.stock_quantity ?? 0} in stock{p.variants?.length > 0 ? ` · ${p.variants.length} variants` : ""}</p>
                    </div>
                    <button onClick={() => setEditing(p)} className="text-xs font-semibold px-3 py-2 border border-line rounded-sm hover:border-ink">Edit</button>
                    <button onClick={() => deleteProduct(p.id, p.name)} className="text-xs font-semibold px-3 py-2 border border-line rounded-sm text-clay hover:border-clay">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "categories" && <CategoriesTab categories={categories} onAdd={addCategory} onDelete={deleteCategory} />}

        {tab === "orders" && (
          <div>
            <p className="text-sm text-ink-soft mb-5">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
            {orders.length === 0 ? (
              <p className="text-sm text-ink-soft bg-white border border-line rounded-md p-6">No orders yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white border border-line rounded-md p-5">
                    <div className="flex flex-wrap justify-between gap-2 mb-3">
                      <div>
                        <p className="font-mono text-sm font-bold">{o.order_number}</p>
                        <p className="text-xs text-ink-soft">{new Date(o.created_at).toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-bold">{fmt(o.total)}</p>
                    </div>
                    <div className="text-xs text-ink-soft mb-3 space-y-0.5">
                      <p><strong className="text-ink">{o.full_name}</strong> · {o.phone}{o.alt_phone ? ` / ${o.alt_phone}` : ""}{o.email ? ` · ${o.email}` : ""}</p>
                      <p>{o.address}, {o.city}</p>
                      {(() => {
                        const pay = calcPaymentAmounts(o.total, o.payment_method, o.payment_type);
                        return (
                          <p>
                            Payment: {pay.label} · Paid {fmt(pay.paid)}{pay.due > 0 && <span className="text-clay"> · Due {fmt(pay.due)}</span>}
                            {o.payment_screenshot_url && <> · <a href={o.payment_screenshot_url} target="_blank" rel="noreferrer" className="underline">view screenshot</a></>}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="text-xs bg-panel rounded-sm p-3 mb-3 space-y-2">
                      {o.items.map((i, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-sm bg-white border border-line overflow-hidden flex-shrink-0">
                            {i.image_url ? <img src={i.image_url} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-ink-faint text-[8px]">N/A</div>}
                          </div>
                          <span className="flex-1">{i.name} ({i.size}) × {i.qty}</span>
                          <span>{fmt(i.price * i.qty)}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t border-line space-y-0.5">
                        <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span>{fmt(o.subtotal)}</span></div>
                        <div className="flex justify-between text-ink-soft"><span>Delivery</span><span>{fmt(o.delivery_charge)}</span></div>
                        {calcDiscount(o.items) > 0 && <div className="flex justify-between text-ink-soft"><span>Discount</span><span>-{fmt(calcDiscount(o.items))}</span></div>}
                        <div className="flex justify-between font-bold text-ink"><span>Total</span><span>{fmt(o.total)}</span></div>
                      </div>
                    </div>
                    <StatusTimeline orderId={o.id} />
                    <div className="flex items-start gap-2 pt-3 border-t border-dashed border-line">
                      <div className="flex-1">
                        <OrderStatusUpdater order={o} onUpdated={loadAll} />
                      </div>
                      <button onClick={() => deleteOrder(o.id, o.order_number)} className="text-xs font-semibold px-3 py-1.5 border border-line rounded-sm text-clay hover:border-clay flex-shrink-0">
                        Delete
                      </button>
                    </div>
                    <OrderCommentsThread orderId={o.id} customerName={o.full_name} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "customers" && <CustomersTab />}

        {tab === "reviews" && <ReviewsTab products={products} onDelete={deleteReview} />}

        {tab === "settings" && (
          <div className="flex flex-col gap-6 max-w-md">
            {settingsFields.map((f) => (
              <div key={f.key} className="bg-white border border-line rounded-md p-6">
                <h2 className="text-sm font-bold mb-1">{f.label}</h2>
                <p className="text-xs text-ink-soft mb-4">{f.help}</p>
                <div className="border border-dashed border-line rounded-md p-5 text-center bg-panel mb-1">
                  {settings[f.key] ? (
                    <img src={settings[f.key]} alt={f.label} className={`mx-auto mb-3 object-contain ${f.key === "payment_qr_url" ? "w-52 h-52" : "w-32 h-32"}`} />
                  ) : (
                    <p className="text-xs text-ink-faint mb-3">Using the built-in default image.</p>
                  )}
                  <label className="inline-block text-xs font-semibold underline cursor-pointer">
                    {uploadState[f.key]?.uploading ? "Uploading…" : settings[f.key] ? "Replace" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSettingUpload(f.key, "site-assets", e)} />
                  </label>
                  {settings[f.key] && (
                    <button onClick={() => resetSetting(f.key)} className="block mx-auto text-xs font-semibold text-ink-faint underline mt-1.5">
                      Reset to default
                    </button>
                  )}
                </div>
                {uploadState[f.key]?.error && <p className="text-xs text-clay mt-2">{uploadState[f.key].error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {editing !== undefined && (
        <ProductFormModal
          product={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); loadAll(); }}
        />
      )}
    </div>
  );
}

function CategoriesTab({ categories, onAdd, onDelete }) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const topLevel = categories.filter((c) => !c.parent_id);

  return (
    <div className="max-w-lg">
      <div className="bg-white border border-line rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold mb-3">Add a category</h2>
        <div className="flex flex-col gap-2.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss">
            <option value="">No parent (top-level category)</option>
            {topLevel.map((c) => <option key={c.id} value={c.id}>Subcategory of {c.name}</option>)}
          </select>
          <button onClick={() => { onAdd(name, parentId); setName(""); setParentId(""); }} className="bg-ink text-paper text-sm font-semibold py-2.5 rounded-sm hover:bg-moss transition-colors">
            Add category
          </button>
        </div>
      </div>

      {topLevel.length === 0 ? (
        <p className="text-sm text-ink-soft bg-white border border-line rounded-md p-6">No categories yet.</p>
      ) : (
        <div className="bg-white border border-line rounded-md divide-y divide-line">
          {topLevel.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between p-4">
                <p className="text-sm font-semibold">{c.name}</p>
                <button onClick={() => onDelete(c.id, c.name)} className="text-xs font-semibold text-clay underline">Delete</button>
              </div>
              {categories.filter((s) => s.parent_id === c.id).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between px-4 py-2.5 pl-8 border-t border-dashed border-line">
                  <p className="text-xs text-ink-soft">{sub.name}</p>
                  <button onClick={() => onDelete(sub.id, sub.name)} className="text-[11px] font-semibold text-clay underline">Delete</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewsTab({ products, onDelete }) {
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    // Reviews are read straight from Supabase here (its RLS policy allows
    // public read) rather than via a dedicated admin list endpoint.
    import("@/lib/supabaseClient").then(({ supabase }) => {
      supabase.from("reviews").select("*").order("created_at", { ascending: false }).then(({ data }) => {
        setReviews(data || []);
      });
    });
  }, []);

  function productName(id) {
    return products.find((p) => p.id === id)?.name || "Unknown product";
  }

  async function handleDelete(id) {
    const ok = await onDelete(id);
    if (ok) setReviews((r) => r.filter((rv) => rv.id !== id));
  }

  return (
    <div className="max-w-2xl">
      {reviews === null ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink-soft bg-white border border-line rounded-md p-6">No reviews yet.</p>
      ) : (
        <div className="bg-white border border-line rounded-md divide-y divide-line">
          {reviews.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="text-sm font-semibold">{r.customer_name} <span className="text-ink-faint font-normal">on {productName(r.product_id)}</span></p>
                  <p className="text-xs text-ink-faint">{r.rating} stars · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-xs font-semibold text-clay underline">Delete</button>
              </div>
              {r.comment && <p className="text-sm text-ink-soft mt-1">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomersTab() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/customers").then((r) => r.json()).then((d) => {
      if (d.error) setError(d.error);
      else setCustomers(d.customers || []);
    });
  }

  useEffect(() => { load(); }, []);

  async function toggleBlock(id, currentlyBanned) {
    await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !currentlyBanned }),
    });
    load();
  }

  async function removeCustomer(id, email) {
    if (!confirm(`Remove the account for ${email}? Their past orders stay on record, but they'll no longer be able to sign in.`)) return;
    await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-2xl">
      <p className="text-xs text-ink-faint mb-4">
        Passwords are never visible to anyone, including you — Supabase only stores an irreversible hash, not the actual password. What you can do here: see who's signed up, block an account from signing in, or remove it entirely.
      </p>
      {error && <p className="text-sm text-clay mb-4">{error}</p>}
      {customers === null ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : customers.length === 0 ? (
        <p className="text-sm text-ink-soft bg-white border border-line rounded-md p-6">No customer accounts yet.</p>
      ) : (
        <div className="bg-white border border-line rounded-md divide-y divide-line">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {c.email}
                  {c.banned && <span className="ml-2 text-[10px] font-bold bg-clay/10 text-clay px-2 py-0.5 rounded-full">Blocked</span>}
                </p>
                <p className="text-xs text-ink-faint">
                  Joined {new Date(c.created_at).toLocaleDateString()}
                  {c.last_sign_in_at && ` · Last sign-in ${new Date(c.last_sign_in_at).toLocaleDateString()}`}
                </p>
              </div>
              <button onClick={() => toggleBlock(c.id, c.banned)} className="text-xs font-semibold px-3 py-2 border border-line rounded-sm hover:border-ink">
                {c.banned ? "Unblock" : "Block"}
              </button>
              <button onClick={() => removeCustomer(c.id, c.email)} className="text-xs font-semibold px-3 py-2 border border-line rounded-sm text-clay hover:border-clay">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
