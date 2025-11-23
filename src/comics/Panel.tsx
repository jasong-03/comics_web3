import React from "react";
import { ComicFace, GATE_PAGE, INITIAL_PAGES } from "./types";
import { LoadingFX } from "./LoadingFX";

interface PanelProps {
  face?: ComicFace;
  allFaces: ComicFace[];
  onChoice: (pageIndex: number, choice: string) => void;
  onOpenBook: () => void;
  onDownload: () => void;
  onReset: () => void;
  onMintComic: () => void;
  isMintingComic: boolean;
  comicMinted: boolean;
  onContinue: (continueReading: boolean) => void;
  shouldContinue: boolean | null;
  mintMode: 'test' | 'protocol';
  onToggleMintMode: () => void;
}

export const Panel: React.FC<PanelProps> = ({
  face,
  allFaces,
  onChoice,
  onOpenBook,
  onDownload,
  onReset,
  onMintComic,
  isMintingComic,
  comicMinted,
  onContinue,
  shouldContinue,
  mintMode,
  onToggleMintMode,
}) => {
  if (!face) return <div className="w-full h-full bg-gray-950" />;
  if (face.isLoading && !face.imageUrl) return <LoadingFX />;

  const isFullBleed = face.type === "cover" || face.type === "back_cover";

  return (
    <div className={`panel-container relative group ${isFullBleed ? "!p-0 !bg-[#0a0a0a]" : ""}`}>
      <div className="gloss" />
      {face.imageUrl ? (
        <img src={face.imageUrl} alt="Comic panel" className={`panel-image ${isFullBleed ? "!object-cover" : ""}`} />
      ) : (
        // Show loading state if image failed to generate
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center p-8">
            <p className="font-comic text-xl mb-2">Generating...</p>
            <p className="text-sm text-gray-400">Please wait</p>
          </div>
        </div>
      )}

      {face.isDecisionPage && face.choices.length > 0 && (
        <div
          className={`absolute bottom-0 inset-x-0 p-6 pb-12 flex flex-col gap-3 items-center justify-end transition-opacity duration-500 ${face.resolvedChoice ? "opacity-0 pointer-events-none" : "opacity-100"
            } bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20`}
        >
          <p className="text-white font-comic text-2xl uppercase tracking-widest animate-pulse">What drives you?</p>
          {face.choices.map((choice, i) => (
            <button
              key={i}
              onClick={(event) => {
                event.stopPropagation();
                if (face.pageIndex) onChoice(face.pageIndex, choice);
              }}
              className={`comic-btn w-full py-3 text-xl font-bold tracking-wider ${i === 0 ? "bg-yellow-400 hover:bg-yellow-300" : "bg-blue-500 text-white hover:bg-blue-400"}`}
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {/* Continue prompt at end of each batch */}
      {face.type === "story" && face.pageIndex && face.pageIndex % 4 === 0 && shouldContinue === null && face.imageUrl && !face.isLoading && (
        <div className="absolute bottom-0 inset-x-0 p-6 pb-12 flex flex-col gap-3 items-center justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20">
          <p className="text-white font-comic text-2xl uppercase tracking-widest mb-2">Continue Reading?</p>
          <div className="flex gap-4 w-full">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onContinue(true);
              }}
              className="comic-btn flex-1 py-3 text-xl font-bold tracking-wider bg-green-500 text-white hover:bg-green-400"
            >
              CONTINUE
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onContinue(false);
              }}
              className="comic-btn flex-1 py-3 text-xl font-bold tracking-wider bg-red-500 text-white hover:bg-red-400"
            >
              STOP HERE
            </button>
          </div>
        </div>
      )}

      {face.type === "cover" && (
        <div className="absolute bottom-20 inset-x-0 flex justify-center z-20">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenBook();
            }}
            disabled={!allFaces.find((f) => f.pageIndex === GATE_PAGE)?.imageUrl}
            className="comic-btn bg-yellow-400 px-10 py-4 text-3xl font-bold hover:scale-105 animate-bounce disabled:animate-none disabled:bg-gray-400 disabled:cursor-wait"
          >
            {!allFaces.find((f) => f.pageIndex === GATE_PAGE)?.imageUrl
              ? `PRINTING... ${allFaces.filter((f) => f.type === "story" && f.imageUrl && (f.pageIndex || 0) <= GATE_PAGE).length
              }/${INITIAL_PAGES}`
              : "READ COMICS"}
          </button>
        </div>
      )}

      {face.type === "back_cover" && (
        <div className="absolute bottom-24 inset-x-0 flex flex-col items-center gap-4 z-20">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDownload();
            }}
            className="comic-btn bg-blue-500 text-white px-8 py-3 text-xl font-bold hover:scale-105"
          >
            DOWNLOAD ISSUE
          </button>

          {!comicMinted && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onMintComic();
              }}
              disabled={isMintingComic}
              className="comic-btn bg-neon-lime text-black px-8 py-3 text-xl font-bold hover:scale-105 disabled:bg-gray-400"
            >
              {isMintingComic ? "MINTING..." : "MINT ON SUI"}
            </button>
          )}

          {!comicMinted && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleMintMode();
              }}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              {mintMode === 'protocol' ? "Mode: Wallet (Fees Enforced)" : "Mode: Test (Free)"}
            </button>
          )}

          {comicMinted && (
            <div className="bg-black text-neon-lime px-8 py-2 text-xl font-bold border-2 border-neon-lime">
              MINTED ON-CHAIN
            </div>
          )}
          <button
            onClick={(event) => {
              event.stopPropagation();
              onReset();
            }}
            className="comic-btn bg-green-500 text-white px-8 py-4 text-2xl font-bold hover:scale-105"
          >
            CREATE NEW ISSUE
          </button>
        </div>
      )}
    </div>
  );
};
