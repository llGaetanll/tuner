"use client";

import { useRef, useEffect, useCallback } from "react";
import { noteToFreq, getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();

function NoteLabel({ note, className, onClick }: { note: string; className?: string; onClick?: () => void }) {
  const name = note.replace(/[0-9]/g, "");
  const oct = note.match(/\d+/)?.[0] ?? "";
  const freq = noteToFreq(note);
  return (
    <button onClick={onClick} className={`flex items-baseline justify-center gap-0.5 ${className ?? ""}`}>
      <span className="font-semibold">{name}</span>
      <span className="text-[9px] opacity-60">{oct}</span>
      <span className="text-[9px] ml-1 opacity-40 font-mono">{freq.toFixed(0)}</span>
    </button>
  );
}

export default function NoteScroller({
  note,
  onChange,
  isInTune,
  isFirst,
}: {
  note: string;
  onChange: (note: string) => void;
  isInTune: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const idx = ALL_NOTES.indexOf(note);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const newIdx = Math.max(0, Math.min(ALL_NOTES.length - 1, idx + dir));
      if (newIdx !== idx) onChange(ALL_NOTES[newIdx]);
    },
    [idx, onChange]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const get = (offset: number) => {
    const i = idx + offset;
    return i >= 0 && i < ALL_NOTES.length ? ALL_NOTES[i] : null;
  };

  const noteName = note.replace(/[0-9]/g, "");
  const octave = note.match(/\d+/)?.[0] ?? "";

  return (
    <div
      ref={containerRef}
      className={`relative group select-none cursor-ns-resize ${isFirst ? "" : "border-l border-gray-200"}`}
    >
      {/* Current note */}
      <div
        className={`
          w-14 h-10 flex items-center justify-center gap-0.5 transition-colors duration-150
          ${isInTune ? "bg-emerald-50" : "bg-gray-100"}
        `}
      >
        <span className={`text-lg font-bold leading-none ${isInTune ? "text-emerald-600" : "text-gray-900"}`}>
          {noteName}
        </span>
        <span className={`text-[10px] leading-none ${isInTune ? "text-emerald-400" : "text-gray-400"}`}>
          {octave}
        </span>
      </div>

      {/* Neighbors above -- shutter open upward */}
      <div
        className="absolute bottom-full left-0 w-full overflow-hidden max-h-0 group-hover:max-h-16 transition-[max-height] duration-200 ease-out"
        style={{ transformOrigin: "bottom" }}
      >
        {/* Inner flex reversed so items "reveal" from bottom up */}
        <div className="flex flex-col">
          {[2, 1].map((offset) => {
            const n = get(offset);
            if (!n) return <div key={offset} className="h-8" />;
            return (
              <NoteLabel
                key={offset}
                note={n}
                onClick={() => onChange(n)}
                className={`h-8 w-full text-sm transition-colors ${
                  offset === 2
                    ? "bg-gray-50 text-gray-400 hover:bg-gray-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Neighbors below -- shutter open downward */}
      <div
        className="absolute top-full left-0 w-full overflow-hidden max-h-0 group-hover:max-h-16 transition-[max-height] duration-200 ease-out"
        style={{ transformOrigin: "top" }}
      >
        <div className="flex flex-col">
          {[-1, -2].map((offset) => {
            const n = get(offset);
            if (!n) return <div key={offset} className="h-8" />;
            return (
              <NoteLabel
                key={offset}
                note={n}
                onClick={() => onChange(n)}
                className={`h-8 w-full text-sm transition-colors ${
                  offset === -2
                    ? "bg-gray-50 text-gray-400 hover:bg-gray-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
