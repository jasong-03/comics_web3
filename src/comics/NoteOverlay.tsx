import React from "react";

interface NoteOverlayProps {
  leftNote?: React.ReactNode;
  rightNote?: React.ReactNode;
}

export const NoteOverlay: React.FC<NoteOverlayProps> = ({ leftNote, rightNote }) => {
  return (
    <>
      {leftNote && (
        <div className="note-overlay note-left" aria-hidden="true">
          <div className="note-arrow note-arrow-right" />
          <div className="note-content">{leftNote}</div>
        </div>
      )}
      {rightNote && (
        <div className="note-overlay note-right" aria-hidden="true">
          <div className="note-arrow note-arrow-left" />
          <div className="note-content">{rightNote}</div>
        </div>
      )}
    </>
  );
};
