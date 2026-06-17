import { useEffect } from "react";

// Lightweight per-page document title manager for this SPA.
// All pages share index.html's static meta tags, but this lets each route
// set its own <title>. Pass the page-specific part; the brand suffix is appended.
const BRAND_SUFFIX = "Pilates in Pink™";

export default function PageTitle({ title }) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${BRAND_SUFFIX}` : BRAND_SUFFIX;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return null;
}