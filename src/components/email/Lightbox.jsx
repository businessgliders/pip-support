import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Portal-rendered lightbox that sits above Radix Dialog overlays (z-50)
// via z-index 9999. Click backdrop or close button to dismiss.
export default function Lightbox({ attachment, onClose }) {
  useEffect(() => {
    if (!attachment) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attachment, onClose]);

  if (!attachment) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{ zIndex: 9999 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white hover:bg-gray-100 text-gray-900 flex items-center justify-center shadow-lg"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={attachment.url}
        alt={attachment.name}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
      />
      {attachment.name && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 text-white text-sm bg-black/40 px-3 py-1.5 rounded-full"
        >
          {attachment.name}
        </div>
      )}
    </div>,
    document.body
  );
}