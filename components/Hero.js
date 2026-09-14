"use client";
import { useEffect, useState } from "react";

export default function Hero() {
  const [bgUrl, setBgUrl] = useState("/images/hero-bg.jpg");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings?.hero_image_url) setBgUrl(d.settings.hero_image_url);
    }).catch(() => {});
  }, []);

  return (
    <section id="home" className="relative h-[78vh] min-h-[480px] max-h-[720px] overflow-hidden">
      <img src={bgUrl} alt="Edeals NP hair care" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/35 to-ink/60" />
      <div className="relative h-full max-w-wrap mx-auto px-5 flex flex-col items-center justify-center text-center">
        <p className="text-white/90 text-sm font-semibold mb-4 tracking-widest uppercase">Premium oils &amp; hair care tools</p>
        <h1 className="text-white text-[42px] md:text-[68px] font-extrabold leading-[1.05] tracking-tight mb-8 drop-shadow-sm">
          Your Self-care Partner
        </h1>
        <a
          href="#shop"
          className="inline-flex items-center justify-center bg-white text-ink font-semibold text-sm px-9 py-3.5 rounded-full hover:bg-sand hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
        >
          Shop now
        </a>
      </div>
    </section>
  );
}
