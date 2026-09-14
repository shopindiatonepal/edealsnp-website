"use client";

export default function BackButton({ fallbackHref = "/", label = "Back" }) {
  function handleClick(e) {
    // If there's real navigation history within the site, go back to it
    // (preserves scroll position / filters). Otherwise fall back to a fixed
    // link so the button always does something sensible even on a fresh tab.
    if (typeof window !== "undefined" && window.history.length > 2) {
      e.preventDefault();
      window.history.back();
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-6 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {label}
    </a>
  );
}
