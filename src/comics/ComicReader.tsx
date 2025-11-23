import React from "react";

interface ComicReaderProps {
  comic: {
    id: string;
    name: string;
    pages: string[];
  };
  onClose: () => void;
}

export const ComicReader: React.FC<ComicReaderProps> = ({ comic, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-brand-dark text-white py-4 px-6 border-b-4 border-neon-pink flex items-center justify-between">
        <h2 className="text-2xl md:text-4xl font-display text-neon-pink">{comic.name}</h2>
        <button
          onClick={onClose}
          className="bg-neon-pink text-brand-dark px-6 py-2 font-bold border-4 border-brand-dark shadow-hard hover:shadow-hard-lime hover:scale-105 transition-all"
        >
          ✕ CLOSE
        </button>
      </header>

      {/* Comic Pages - Vertical Scroll */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        {comic.pages.map((page, index) => (
          <div key={index} className="mb-8 last:mb-0">
            <div className="bg-white border-4 border-brand-dark shadow-hard-xl overflow-hidden">
              <img
                src={page}
                alt={`${comic.name} - Page ${index + 1}`}
                className="w-full h-auto object-contain"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const placeholder = target.parentElement?.querySelector(".placeholder");
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = "flex";
                  }
                }}
              />
              <div className="placeholder hidden items-center justify-center bg-gray-900 text-white font-display text-2xl p-12 min-h-[400px]">
                Page {index + 1} - Image not found
              </div>
            </div>
            {/* Page Number */}
            <div className="text-center mt-2">
              <span className="bg-white border-2 border-brand-dark px-4 py-1 font-bold text-sm">
                Page {index + 1} / {comic.pages.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Navigation */}
      <div className="sticky bottom-0 bg-brand-dark text-white py-4 px-6 border-t-4 border-neon-pink">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="bg-neon-lime text-brand-dark px-4 py-2 font-bold border-2 border-brand-dark shadow-hard hover:scale-105 transition-all"
          >
            ↑ TOP
          </button>
          <span className="text-sm font-mono">
            {comic.pages.length} {comic.pages.length === 1 ? "page" : "pages"}
          </span>
          <button
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
            className="bg-neon-lime text-brand-dark px-4 py-2 font-bold border-2 border-brand-dark shadow-hard hover:scale-105 transition-all"
          >
            ↓ BOTTOM
          </button>
        </div>
      </div>
    </div>
  );
};

