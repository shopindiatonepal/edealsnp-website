"use client";
import { useEffect, useState } from "react";
import { resizeImageFile } from "@/lib/resizeImage";

function genLocalId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: product?.name || "",
    category: product?.category || "",
    category_id: product?.category_id || "",
    size: product?.size || "",
    price: product?.price ?? "",
    weight_grams: product?.weight_grams ?? 200,
    color: product?.color || "",
    description: product?.description || "",
    ingredients: product?.ingredients || "",
    expiry_date: product?.expiry_date || "",
    featured: product?.featured || false,
    sold_out: product?.sold_out || false,
    stock_quantity: product?.stock_quantity ?? 0,
    preorder: product?.preorder || false,
    on_sale: product?.on_sale || false,
    sale_price: product?.sale_price ?? "",
  });
  const [imageUrl, setImageUrl] = useState(product?.image_url || null);
  const [extraImages, setExtraImages] = useState(product?.images || []);
  const [variants, setVariants] = useState(
    (product?.variants || []).map((v) => ({ ...v, _localId: v.id || genLocalId() }))
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function uploadFile(file) {
    const resized = await resizeImageFile(file);
    const fd = new FormData();
    fd.append("file", resized);
    fd.append("bucket", "product-images");
    const data = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
    return data.url || null;
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setImageUrl(url);
    setUploading(false);
  }

  async function handleExtraImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setExtraImages((imgs) => [...imgs, url]);
    setUploading(false);
  }

  function removeExtraImage(url) {
    setExtraImages((imgs) => imgs.filter((i) => i !== url));
  }

  function addVariant() {
    setVariants((v) => [...v, {
      _localId: genLocalId(), name: "", image_url: "", price: form.price || 0, stock_quantity: 0, weight_grams: "",
      use_main_details: true, category: "", size: "", description: "", ingredients: "", expiry_date: "",
    }]);
  }

  function updateVariant(localId, field, value) {
    setVariants((v) => v.map((row) => (row._localId === localId ? { ...row, [field]: value } : row)));
  }

  function removeVariant(localId) {
    setVariants((v) => v.filter((row) => row._localId !== localId));
  }

  async function handleVariantImageUpload(localId, e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) updateVariant(localId, "image_url", url);
    setUploading(false);
  }

  function handleCategorySelect(id) {
    const cat = categories.find((c) => c.id === id);
    update("category_id", id);
    update("category", cat ? cat.name : "");
  }

  async function handleSave() {
    setError("");
    const price = parseFloat(form.price);
    if (!form.name.trim() || !form.category.trim() || !form.size.trim() || isNaN(price) || price < 0) {
      setError("Please fill in the product name, category, weight/size, and a valid price.");
      return;
    }
    if (form.on_sale && (form.sale_price === "" || isNaN(parseFloat(form.sale_price)) || parseFloat(form.sale_price) >= price)) {
      setError("Sale price must be a number lower than the regular price.");
      return;
    }
    if (form.on_sale && parseFloat(form.sale_price) < 0) {
      setError("Sale price can't be negative.");
      return;
    }
    const invalidVariant = variants.find((v) => !v.name?.trim() || isNaN(parseFloat(v.price)) || parseFloat(v.price) < 0);
    if (invalidVariant) {
      setError("Every variant needs a name and a valid price (0 or more).");
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      price,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      weight_grams: parseFloat(form.weight_grams) || 200,
      sale_price: form.on_sale ? parseFloat(form.sale_price) : null,
      image_url: imageUrl,
      images: extraImages,
      variants: variants.map(({ _localId, ...rest }) => {
        const useMain = rest.use_main_details ?? true;
        return {
          id: rest.id || _localId,
          name: rest.name,
          color: rest.color || "",
          image_url: rest.image_url || "",
          price: parseFloat(rest.price) || 0,
          stock_quantity: parseInt(rest.stock_quantity) || 0,
          weight_grams: rest.weight_grams ? parseFloat(rest.weight_grams) : null,
          use_main_details: useMain,
          // When "same as main" is checked, these are left empty so display
          // logic falls back to the main product's own values automatically
          // — no stale copy to keep in sync.
          category: useMain ? "" : (rest.category || ""),
          size: useMain ? "" : (rest.size || ""),
          description: useMain ? "" : (rest.description || ""),
          ingredients: useMain ? "" : (rest.ingredients || ""),
          expiry_date: useMain ? "" : (rest.expiry_date || ""),
        };
      }),
    };
    const url = isEdit ? `/api/products/${product.id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Something went wrong saving the product.");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/50 p-3 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-md max-w-2xl w-full my-6 p-6 md:p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-xl text-ink-soft focus-ring">&times;</button>
        <h2 className="text-xl font-extrabold mb-1">{isEdit ? "Edit product" : "Add product"}</h2>
        <p className="text-sm text-ink-soft mb-5">{isEdit ? "Update the details below." : "Fill in the details for your new product."}</p>

        <div className="mb-4">
          <label className="block text-xs font-bold mb-1.5">Main product photo</label>
          <div className="border border-dashed border-line rounded-md p-5 text-center bg-panel">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="max-h-32 mx-auto mb-2 rounded-sm object-contain" />
            ) : (
              <p className="text-xs text-ink-faint mb-1">Optional — a placeholder icon is used if skipped</p>
            )}
            <label className="inline-block text-xs font-semibold underline cursor-pointer">
              {uploading ? "Uploading…" : imageUrl ? "Replace photo" : "Upload a photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-bold mb-1.5">Additional photos (gallery)</label>
          <div className="flex flex-wrap gap-2.5">
            {extraImages.map((img) => (
              <div key={img} className="relative w-16 h-16 rounded-sm border border-line overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-contain p-1" />
                <button onClick={() => removeExtraImage(img)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-clay text-white text-xs flex items-center justify-center">&times;</button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-sm border border-dashed border-line flex items-center justify-center text-xs text-ink-faint cursor-pointer hover:border-ink">
              {uploading ? "…" : "+ Add"}
              <input type="file" accept="image/*" className="hidden" onChange={handleExtraImageUpload} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold mb-1.5">Product name</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Jojoba" className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5">Category</label>
            {categories.length > 0 ? (
              <select value={form.category_id} onChange={(e) => handleCategorySelect(e.target.value)} className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss">
                <option value="">Select a category</option>
                {categories.filter((c) => !c.parent_id).map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name}</option>
                    {categories.filter((c) => c.parent_id === parent.id).map((sub) => (
                      <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <input value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="e.g. Hair Oil" className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold mb-1.5">Weight / size label</label>
            <input value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="e.g. 200ML" className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5">Price (NPR)</label>
            <input type="number" min="0" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="e.g. 850" className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5">Parcel weight (grams)</label>
            <input type="number" min="1" value={form.weight_grams} onChange={(e) => update("weight_grams", e.target.value)} placeholder="200" className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold mb-1.5">Color (optional)</label>
          <div className="flex items-center gap-1.5 max-w-xs">
            <input type="color" value={form.color || "#cccccc"} onChange={(e) => update("color", e.target.value)} className="w-9 h-9 border border-line rounded-sm bg-panel p-0.5 flex-shrink-0" />
            <input value={form.color || ""} onChange={(e) => update("color", e.target.value)} placeholder="#RRGGBB or leave blank" className="flex-1 min-w-0 border border-line rounded-sm bg-panel px-2.5 py-2 text-sm focus:outline-none focus:border-moss" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold mb-1.5">Stock quantity</label>
            <input type="number" min="0" value={form.stock_quantity} onChange={(e) => update("stock_quantity", e.target.value)} placeholder="e.g. 20" className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
          </div>
          <div className="flex items-end pb-2.5">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="preorder" checked={form.preorder} onChange={(e) => update("preorder", e.target.checked)} />
              <label htmlFor="preorder" className="text-sm font-medium">Allow preorder when out of stock</label>
            </div>
          </div>
        </div>

        <div className="border border-line rounded-md p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" id="onSale" checked={form.on_sale} onChange={(e) => update("on_sale", e.target.checked)} />
            <label htmlFor="onSale" className="text-sm font-bold">Put on sale</label>
          </div>
          {form.on_sale && (
            <div>
              <label className="block text-xs font-bold mb-1.5">Sale price (NPR)</label>
              <input type="number" min="0" value={form.sale_price} onChange={(e) => update("sale_price", e.target.value)} placeholder="Lower than the regular price" className="w-full max-w-xs border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold mb-1.5">Description</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What is this product, and what does it do?" className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm min-h-[70px] focus:outline-none focus:border-moss" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs font-bold mb-1.5">Ingredients (optional)</label>
            <textarea value={form.ingredients} onChange={(e) => update("ingredients", e.target.value)} placeholder="Shown on the product page if filled in" className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm min-h-[60px] focus:outline-none focus:border-moss" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5">Expiry date (optional)</label>
            <input type="date" value={form.expiry_date} onChange={(e) => update("expiry_date", e.target.value)} className="w-full border border-line rounded-sm bg-panel px-3 py-2.5 text-sm focus:outline-none focus:border-moss" />
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold">Variants (optional — e.g. colors, sizes)</label>
            <button onClick={addVariant} className="text-xs font-semibold underline">+ Add variant</button>
          </div>
          <p className="text-[11px] text-ink-faint mb-2">
            When variants are added, customers can still choose the original/main product above (रु {form.price || 0}) as well as any variant below — each variant has its own real price, shown exactly as entered.
          </p>
          {variants.length === 0 ? (
            <p className="text-xs text-ink-faint">No variants — this product sells as a single option.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {variants.map((v) => (
                <div key={v._localId} className="border border-line rounded-md p-3 grid grid-cols-[64px_1fr] gap-3">
                  <label className="w-16 h-16 rounded-sm border border-dashed border-line flex items-center justify-center text-[10px] text-ink-faint cursor-pointer hover:border-ink overflow-hidden">
                    {v.image_url ? <img src={v.image_url} alt="" className="w-full h-full object-contain" /> : "+ Photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVariantImageUpload(v._localId, e)} />
                  </label>
                  <div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-[10px] font-bold text-ink-faint mb-1">Variant name</label>
                        <input value={v.name} onChange={(e) => updateVariant(v._localId, "name", e.target.value)} placeholder="e.g. Red — Large" className="w-full border border-line rounded-sm bg-panel px-2.5 py-2 text-xs focus:outline-none focus:border-moss" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-faint mb-1">Color (optional)</label>
                        <div className="flex items-center gap-1.5">
                          <input type="color" value={v.color || "#cccccc"} onChange={(e) => updateVariant(v._localId, "color", e.target.value)} className="w-8 h-8 border border-line rounded-sm bg-panel p-0.5 flex-shrink-0" />
                          <input value={v.color || ""} onChange={(e) => updateVariant(v._localId, "color", e.target.value)} placeholder="#RRGGBB or leave blank" className="flex-1 min-w-0 border border-line rounded-sm bg-panel px-2 py-2 text-xs focus:outline-none focus:border-moss" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-1.5">
                      <div>
                        <label className="block text-[10px] font-bold text-ink-faint mb-1">This variant's price (NPR)</label>
                        <input type="number" min="0" value={v.price} onChange={(e) => updateVariant(v._localId, "price", e.target.value)} placeholder="e.g. 1200" className="w-full border border-line rounded-sm bg-panel px-2.5 py-2 text-xs focus:outline-none focus:border-moss" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-faint mb-1">Stock for this variant</label>
                        <input type="number" min="0" value={v.stock_quantity} onChange={(e) => updateVariant(v._localId, "stock_quantity", e.target.value)} placeholder="0" className="w-full border border-line rounded-sm bg-panel px-2.5 py-2 text-xs focus:outline-none focus:border-moss" />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 mb-2 mt-1">
                      <input type="checkbox" checked={v.use_main_details ?? true} onChange={(e) => updateVariant(v._localId, "use_main_details", e.target.checked)} />
                      <span className="text-[11px] font-semibold">Same category / size / description / ingredients / expiry as main product</span>
                    </label>

                    {!(v.use_main_details ?? true) && (
                      <div className="border border-dashed border-line rounded-sm p-2.5 mb-1.5 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-ink-faint mb-1">Category</label>
                          <input value={v.category || ""} onChange={(e) => updateVariant(v._localId, "category", e.target.value)} placeholder="e.g. Hair Oil" className="w-full border border-line rounded-sm bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-moss" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ink-faint mb-1">Weight / size label</label>
                          <input value={v.size || ""} onChange={(e) => updateVariant(v._localId, "size", e.target.value)} placeholder="e.g. 400ML" className="w-full border border-line rounded-sm bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-moss" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-ink-faint mb-1">Description</label>
                          <textarea value={v.description || ""} onChange={(e) => updateVariant(v._localId, "description", e.target.value)} className="w-full border border-line rounded-sm bg-white px-2.5 py-2 text-xs min-h-[50px] focus:outline-none focus:border-moss" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-ink-faint mb-1">Ingredients</label>
                          <textarea value={v.ingredients || ""} onChange={(e) => updateVariant(v._localId, "ingredients", e.target.value)} className="w-full border border-line rounded-sm bg-white px-2.5 py-2 text-xs min-h-[40px] focus:outline-none focus:border-moss" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ink-faint mb-1">Expiry date</label>
                          <input type="date" value={v.expiry_date || ""} onChange={(e) => updateVariant(v._localId, "expiry_date", e.target.value)} className="w-full border border-line rounded-sm bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-moss" />
                        </div>
                      </div>
                    )}
                    <button onClick={() => removeVariant(v._localId)} className="text-[11px] text-clay underline">Remove variant</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input type="checkbox" id="featured" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} />
          <label htmlFor="featured" className="text-sm font-medium">Show in New Arrivals</label>
        </div>
        <div className="flex items-center gap-2 mb-5">
          <input type="checkbox" id="soldOut" checked={form.sold_out} onChange={(e) => update("sold_out", e.target.checked)} />
          <label htmlFor="soldOut" className="text-sm font-medium">Mark as sold out</label>
        </div>

        {error && <p className="text-xs text-clay mb-3">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="w-full bg-ink text-paper font-semibold text-sm py-3.5 rounded-sm hover:bg-moss transition-colors disabled:opacity-60">
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add product"}
        </button>
      </div>
    </div>
  );
}
