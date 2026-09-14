import { getProducts } from "@/lib/storefront";
import StorefrontShell from "@/components/StorefrontShell";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export const revalidate = 0;

export default async function HomePage() {
  const products = await getProducts();

  return (
    <StorefrontShell>
      <Hero />
      <ProductGrid products={products} />
      <Contact />
      <Footer />
    </StorefrontShell>
  );
}
