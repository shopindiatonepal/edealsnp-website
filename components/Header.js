"use client";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

export default function Header() {
  const { count, setDrawerOpen } = useCart();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [categories, setCategories] = useState([]);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setLogoUrl(d.settings?.logo_url || "/images/logo.jpg")).catch(() => setLogoUrl("/images/logo.jpg"));
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories((d.categories || []).filter((c) => !c.parent_id))).catch(() => {});
  }, []);

  const links = [
    { href: "/#home", label: "Home" },
    { href: "/#shop", label: "Shop" },
    { href: "/#contact", label: "Contact" },
  ];

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!search.trim()) return;
    window.location.href = `/?search=${encodeURIComponent(search.trim())}#shop`;
  }

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-line">
      <div className="max-w-wrap mx-auto px-5 py-3.5 flex items-center gap-4">
        <a href="/#home" className="flex items-center gap-3 flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Edeals NP" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="w-9 h-9 rounded-full bg-moss flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3c-3 3-3 7 0 10 3-3 3-7 0-10Z" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 13v8" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <span className="text-[15px] font-bold tracking-tight leading-none hidden sm:inline">Edeals NP</span>
        </a>

        <nav className="hidden md:flex items-center gap-7 flex-shrink-0">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-ink-soft hover:text-ink transition-colors whitespace-nowrap">
              {l.label}
            </a>
          ))}
          <div className="relative" onMouseEnter={() => setCatMenuOpen(true)} onMouseLeave={() => setCatMenuOpen(false)}>
            <button className="text-sm font-medium text-ink-soft hover:text-ink transition-colors flex items-center gap-1 whitespace-nowrap">
              Categories
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {catMenuOpen && (
              <div className="absolute top-full left-0 pt-2 z-50">
                <div className="bg-white border border-line rounded-md shadow-lg py-2 min-w-[170px]">
                  <a href="/?filter=new-arrivals#shop" className="block px-4 py-2 text-sm hover:bg-panel font-medium">New Arrivals</a>
                  <a href="/?filter=sale#shop" className="block px-4 py-2 text-sm hover:bg-panel font-medium">Sale Products</a>
                  <a href="/?filter=preorder#shop" className="block px-4 py-2 text-sm hover:bg-panel font-medium">Preorder</a>
                  {categories.length > 0 && <div className="border-t border-line my-1.5" />}
                  {categories.map((c) => (
                    <a key={c.id} href={`/?category=${encodeURIComponent(c.name)}#shop`} className="block px-4 py-2 text-sm hover:bg-panel">
                      {c.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        <form onSubmit={handleSearchSubmit} className="hidden md:block flex-1 max-w-xs">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full border border-line rounded-full bg-panel px-4 py-2 text-sm focus:outline-none focus:border-moss"
            />
            <button type="submit" className="absolute right-3.5 top-1/2 -translate-y-1/2" aria-label="Search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#A0A2A6" strokeWidth="1.6" />
                <path d="M21 21l-4-4" stroke="#A0A2A6" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <a href="/account" className="hidden md:inline text-sm font-medium text-ink-soft hover:text-ink transition-colors whitespace-nowrap">
            {user ? "My orders" : "Sign in"}
          </a>
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative w-10 h-10 rounded-full border border-line flex items-center justify-center hover:border-ink transition-colors focus-ring"
            aria-label="Open cart"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6" stroke="#16180F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="21" r="1.4" fill="#16180F" />
              <circle cx="17" cy="21" r="1.4" fill="#16180F" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-clay text-white text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden w-10 h-10 rounded-full border border-line flex items-center justify-center focus-ring"
            aria-label="Menu"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="#16180F" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden px-5 pb-4 flex flex-col border-t border-line">
          <form onSubmit={handleSearchSubmit} className="py-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full border border-line rounded-full bg-panel px-4 py-2 text-sm focus:outline-none focus:border-moss"
            />
          </form>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="py-3 text-sm font-medium border-b border-line">
              {l.label}
            </a>
          ))}
          <a href="/?filter=new-arrivals#shop" onClick={() => setMobileOpen(false)} className="py-3 text-sm font-medium border-b border-line">New Arrivals</a>
          <a href="/?filter=sale#shop" onClick={() => setMobileOpen(false)} className="py-3 text-sm font-medium border-b border-line">Sale Products</a>
          <a href="/?filter=preorder#shop" onClick={() => setMobileOpen(false)} className="py-3 text-sm font-medium border-b border-line">Preorder</a>
          {categories.map((c) => (
            <a key={c.id} href={`/?category=${encodeURIComponent(c.name)}#shop`} onClick={() => setMobileOpen(false)} className="py-3 text-sm font-medium border-b border-line pl-2 text-ink-soft">
              {c.name}
            </a>
          ))}
          <a href="/account" onClick={() => setMobileOpen(false)} className="py-3 text-sm font-medium">
            {user ? "My orders" : "Sign in"}
          </a>
        </div>
      )}
    </header>
  );
}
