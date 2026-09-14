"use client";
import { useEffect, useState } from "react";

export default function ProductGallery({ mainImage, extraImages, productName }) {
  const allImages = [mainImage, ...extraImages.filter((i) => i && i !== mainImage)].filter(Boolean);
  const [active, setActive] = useState(mainImage);

  // If the variant changes upstream (new mainImage prop), follow it.
  useEffect(() => setActive(mainImage), [mainImage]);

  return (
    <div>
      <div className="aspect-square rounded-md bg-white border border-line overflow-hidden mb-3">
        {active ? (
          <img src={active} alt={productName} className="w-full h-full object-contain p-8" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M12 3c-3 3-3 7 0 10 3-3 3-7 0-10Z" stroke="#A0A2A6" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      {allImages.length > 1 && (
        <div className="flex gap-2.5">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActive(img)}
              className={`w-16 h-16 rounded-sm border overflow-hidden flex-shrink-0 ${active === img ? "border-ink" : "border-line"}`}
            >
              <img src={img} alt="" className="w-full h-full object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
