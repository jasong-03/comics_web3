import React, { useState } from "react";
import { ComicReader } from "./comics/ComicReader";

interface InventoryProps {
  onBack: () => void;
}

interface Comic {
  id: string;
  name: string;
  thumbnail: string;
  pages: string[];
}

const COMICS: Comic[] = [
  {
    id: "comics1",
    name: "Comic Issue #1",
    thumbnail: "/sample/comics1/comics1-1.jpeg",
    pages: [
      "/sample/comics1/comics1-1.jpeg",
      "/sample/comics1/comics1-2.jpeg",
      "/sample/comics1/comics1-3.jpeg",
      "/sample/comics1/comics1-4.jpeg",
    ],
  },
  {
    id: "comics2",
    name: "Comic Issue #2",
    thumbnail: "/sample/comics2/comics2-1.png",
    pages: [
      "/sample/comics2/comics2-1.png",
      "/sample/comics2/comics2-2.png",
      "/sample/comics2/comics2-3.png",
      "/sample/comics2/comics2-4.png",
    ],
  },
];

export const Inventory: React.FC<InventoryProps> = ({ onBack }) => {
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);

  const handleRead = (comic: Comic) => {
    setSelectedComic(comic);
  };

  const handleDownload = (comic: Comic) => {
    // TODO: Implement download functionality
    alert(`Downloading ${comic.name}...`);
  };

  if (selectedComic) {
    return <ComicReader comic={selectedComic} onClose={() => setSelectedComic(null)} />;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-dark font-mono overflow-x-hidden selection:bg-neon-pink selection:text-white">
      {/* Header */}
      <header className="bg-brand-dark text-white py-6 px-8 border-b-8 border-neon-pink">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="bg-neon-pink text-brand-dark px-6 py-2 font-bold border-4 border-brand-dark shadow-hard hover:shadow-hard-lime hover:scale-105 transition-all"
            >
              ← BACK
            </button>
            <h1 className="text-4xl md:text-6xl font-display text-neon-pink">COMIC INVENTORY</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 px-4 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <p className="text-xl md:text-2xl text-center bg-white border-4 border-brand-dark shadow-hard px-6 py-3 inline-block">
              Your Collection of Generated Comics
            </p>
          </div>

          {/* Comics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {COMICS.map((comic) => (
              <div
                key={comic.id}
                className="bg-white border-4 border-brand-dark shadow-hard-xl hover:shadow-hard-pink hover:scale-105 transition-all duration-200 group"
              >
                <div className="relative overflow-hidden bg-gray-900 aspect-[2/3]">
                  <img
                    src={comic.thumbnail}
                    alt={comic.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const placeholder = target.parentElement?.querySelector(".placeholder");
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = "flex";
                      }
                    }}
                  />
                  <div className="placeholder absolute inset-0 flex items-center justify-center text-white font-display text-2xl opacity-50" style={{ display: "none" }}>
                    {comic.name}
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-display text-xl font-bold text-brand-dark mb-2">{comic.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{comic.pages.length} pages</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRead(comic)}
                      className="flex-1 comic-btn bg-blue-500 text-white px-4 py-2 text-sm font-bold hover:bg-blue-400"
                    >
                      READ
                    </button>
                    <button
                      onClick={() => handleDownload(comic)}
                      className="flex-1 comic-btn bg-yellow-400 text-black px-4 py-2 text-sm font-bold hover:bg-yellow-300"
                    >
                      DOWNLOAD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State (if no comics) */}
          {COMICS.length === 0 && (
            <div className="text-center py-24">
              <div className="bg-white border-4 border-brand-dark shadow-hard-xl p-12 max-w-2xl mx-auto">
                <h2 className="text-4xl font-display mb-4">No Comics Yet</h2>
                <p className="text-xl mb-6">Start creating your first comic to see it here!</p>
                <button
                  onClick={onBack}
                  className="comic-btn bg-neon-pink text-brand-dark px-8 py-4 text-2xl font-bold hover:scale-105"
                >
                  CREATE COMIC
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

