import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import StorefrontShell from "@/components/StorefrontShell";
import Footer from "@/components/Footer";
import ProductGallery from "@/components/ProductGallery";
import ProductDetailClient from "@/components/ProductDetailClient";
import ReviewsSection from "@/components/ReviewsSection";
import BackButton from "@/components/BackButton";

export const revalidate = 0;

export default async function ProductPage({ params }) {
  const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", params.id).maybeSingle();
  if (!product) notFound();

  const { data: reviews } = await supabaseAdmin
    .from("reviews")
    .select("*")
    .eq("product_id", params.id)
    .order("created_at", { ascending: false });

  const reviewCount = reviews?.length || 0;
  const avgRating = reviewCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;

  const { data: related } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("category", product.category)
    .neq("id", product.id)
    .limit(4);

  return (
    <StorefrontShell>
      <div className="max-w-wrap mx-auto px-5 py-10 md:py-14">
        <BackButton fallbackHref="/#shop" label="Back to shop" />

        <ProductDetailClient product={product} reviewCount={reviewCount} avgRating={avgRating} />

        <ReviewsSection productId={product.id} initialReviews={reviews || []} avgRating={avgRating} reviewCount={reviewCount} />

        {related?.length > 0 && (
          <div className="mt-20">
            <h2 className="text-xl font-extrabold tracking-tight text-center mb-8">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((p) => (
                <a key={p.id} href={`/product/${p.id}`} className="group flex flex-col items-center text-center">
                  <div className="aspect-[4/5] w-full rounded-md bg-white border border-line overflow-hidden mb-2 group-hover:shadow-lg transition-shadow">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />}
                  </div>
                  <p className="text-sm font-semibold group-hover:text-moss transition-colors">{p.name}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </StorefrontShell>
  );
}
