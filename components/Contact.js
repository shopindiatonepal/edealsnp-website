"use client";
import { useEffect, useState } from "react";

const WHATSAPP_NUMBER = "9779845522014";
const INSTAGRAM_URL = "https://www.instagram.com/edeals_np?stkn=MWx6dXhramN2a3ZqZw%3D%3D&utm_source=qr";
const TIKTOK_URL = "https://www.tiktok.com/@edeals.np?_r=1&_t=ZS-99blMeBfDhE";

export default function Contact() {
  const [imgUrl, setImgUrl] = useState("/images/contact-photo.jpg");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings?.contact_image_url) setImgUrl(d.settings.contact_image_url);
    }).catch(() => {});
  }, []);

  return (
    <section id="contact" className="bg-panel">
      <div className="max-w-wrap mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="aspect-[4/3] rounded-md overflow-hidden">
          <img src={imgUrl} alt="Edeals NP hair care" className="w-full h-full object-cover" />
        </div>

        <div className="bg-white border border-line rounded-md p-8">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">Get in touch</h2>
          <p className="text-ink-soft text-sm mb-6">
            Questions about a product or an order? Reach us directly — we usually reply within a day.
          </p>
          <div className="space-y-3 mb-7">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Phone / WhatsApp</p>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="text-sm font-semibold hover:text-moss">+977 984-5522014</a>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Email</p>
              <a href="mailto:edealsnp@gmail.com" className="text-sm font-semibold hover:text-moss">edealsnp@gmail.com</a>
            </div>
          </div>
          <div className="flex gap-3">
            <a href={TIKTOK_URL} target="_blank" rel="noreferrer" title="TikTok" className="w-10 h-10 rounded-full border border-line bg-panel flex items-center justify-center hover:border-ink hover:-translate-y-0.5 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16 3v9.5a3.5 3.5 0 1 1-3-3.46V6a6 6 0 1 0 6 6V8.5c1 .6 2 1 3 1V6.4c-2 0-3.5-1.2-4-3.4h-2Z" fill="#17181B" /></svg>
            </a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" title="WhatsApp" className="w-10 h-10 rounded-full border border-line bg-panel flex items-center justify-center hover:border-ink hover:-translate-y-0.5 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z" stroke="#17181B" strokeWidth="1.4" /></svg>
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" title="Instagram" className="w-10 h-10 rounded-full border border-line bg-panel flex items-center justify-center hover:border-ink hover:-translate-y-0.5 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="#17181B" strokeWidth="1.4" /><circle cx="12" cy="12" r="3.6" stroke="#17181B" strokeWidth="1.4" /><circle cx="17.2" cy="6.8" r="1" fill="#17181B" /></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
