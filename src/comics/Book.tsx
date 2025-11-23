import React from "react";
import { ComicFace, TOTAL_PAGES } from "./types";
import { Panel } from "./Panel";

interface BookProps {
  comicFaces: ComicFace[];
  currentSheetIndex: number;
  isStarted: boolean;
  isSetupVisible: boolean;
  onSheetClick: (index: number) => void;
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

export const Book: React.FC<BookProps> = ({
  comicFaces,
  currentSheetIndex,
  isStarted,
  isSetupVisible,
  onSheetClick,
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
  const sheetsToRender: { front?: ComicFace; back?: ComicFace }[] = [];

  if (comicFaces.length > 0) {
    sheetsToRender.push({
      front: comicFaces[0],
      back: comicFaces.find((face) => face.pageIndex === 1),
    });

    for (let index = 2; index <= TOTAL_PAGES; index += 2) {
      sheetsToRender.push({
        front: comicFaces.find((face) => face.pageIndex === index),
        back: comicFaces.find((face) => face.pageIndex === index + 1),
      });
    }
  } else if (isSetupVisible) {
    sheetsToRender.push({ front: undefined, back: undefined });
  }

  return (
    <div
      className={`book ${currentSheetIndex > 0 ? "opened" : ""} transition-all duration-1000 ease-in-out`}
      style={
        isSetupVisible
          ? {
            transform: "translateZ(-600px) translateY(-100px) rotateX(20deg) scale(0.9)",
            filter: "blur(6px) brightness(0.7)",
            pointerEvents: "none",
          }
          : {}
      }
    >
      {sheetsToRender.map((sheet, index) => (
        <div
          key={index}
          className={`paper ${index < currentSheetIndex ? "flipped" : ""}`}
          style={{ zIndex: index < currentSheetIndex ? index : sheetsToRender.length - index }}
          onClick={() => (isStarted ? onSheetClick(index) : null)}
        >
          <div className="front">
            <Panel
              face={sheet.front}
              allFaces={comicFaces}
              onChoice={onChoice}
              onOpenBook={onOpenBook}
              onDownload={onDownload}
              onReset={onReset}
              onMintComic={onMintComic}
              isMintingComic={isMintingComic}
              comicMinted={comicMinted}
              onContinue={onContinue}
              shouldContinue={shouldContinue}
              mintMode={mintMode}
              onToggleMintMode={onToggleMintMode}
            />
          </div>
          <div className="back">
            <Panel
              face={sheet.back}
              allFaces={comicFaces}
              onChoice={onChoice}
              onOpenBook={onOpenBook}
              onDownload={onDownload}
              onReset={onReset}
              onMintComic={onMintComic}
              isMintingComic={isMintingComic}
              comicMinted={comicMinted}
              onContinue={onContinue}
              shouldContinue={shouldContinue}
              mintMode={mintMode}
              onToggleMintMode={onToggleMintMode}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
