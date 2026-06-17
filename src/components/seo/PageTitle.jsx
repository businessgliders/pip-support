import { useEffect } from "react";

// Lightweight per-page document title manager for this SPA.
// All pages share index.html's static meta tags, but this lets each route
// set its own <title> following the {Page Name} | Pilates in Pink™ convention.
// Pass `noindex` to add a robots noindex meta tag (e.g. confirmation pages).
const BRAND_SUFFIX = "Pilates in Pink™";

export default function PageTitle({ title, noindex = false }) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${BRAND_SUFFIX}` : BRAND_SUFFIX;
    return () => {
      document.title = previous;
    };
  }, [title]);

  useEffect(() => {
    if (!noindex) return;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [noindex]);

  return null;
}