"use client";

import { useRef, useEffect, useCallback } from "react";
import { noteToFreq, getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();

function NoteLabel({ note, className, onClick }: { note: string; className?: string; onClick?: () => void }) {
  const name = note.replace(/[0-9]/g, "");
  const oct = note.match(/\d+/)?.[0] ?? "";
  const freq = noteToFreq(note);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`flex items-baseline gap-0.5 ${className ?? ""}`}>
      <span className="font-semibold">{name}</span>
      <span className="text-[9px] opacity-60">{oct}</span>
      <span className="text-[9px] ml-1 opacity-40 font-mono">{freq.toFixed(0)}</span>
    </Tag>
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
      className={`relative group flex flex-col items-center select-none cursor-ns-resize ${isFirst ? "" : "border-l border-gray-200"}`}
    >
      {/* Hover expansion upward: +2, +1 */}
      <div className="flex flex-col items-center overflow-hidden max-h-0 group-hover:max-h-24 transition-all duration-200 ease-out">
        {[2, 1].map((offset) => {
          const n = get(offset);
          if (!n) return <div key={offset} className="h-6" />;
          return (
            <NoteLabel
              key={offset}
              note={n}
              onClick={() => onChange(n)}
              className={`h-6 px-3 text-sm hover:bg-gray-100 transition-colors w-full flex justify-center ${offset === 2 ? "text-gray-300" : "text-gray-400"}`}
            />
          );
        })}
      </div>

      {/* Current note */}
      <div
        className={`
          w-14 h-10 flex items-center justify-center gap-0.5 transition-colors duration-150
          ${isInTune ? "bg-emerald-50" : "bg-white"}
        `}
      >
        <span className={`text-lg font-bold leading-none ${isInTune ? "text-emerald-600" : "text-gray-900"}`}>
          {noteName}
        </span>
        <span className={`text-[10px] leading-none ${isInTune ? "text-emerald-400" : "text-gray-400"}`}>
          {octave}
        </span>
      </div>

      {/* Hover expansion downward: -1, -2 */}
      <div className="flex flex-col items-center overflow-hidden max-h-0 group-hover:max-h-24 transition-all duration-200 ease-out">
        {[-1, -2].map((offset) => {
          const n = get(offset);
          if (!n) return <div key={offset} className="h-6" />;
          return (
            <NoteLabel
              key={offset}
              note={n}
              onClick={() => onChange(n)}
              className={`h-6 px-3 text-sm hover:bg-gray-100 transition-colors w-full flex justify-center ${offset === -2 ? "text-gray-300" : "text-gray-400"}`}
            />
          );
        })}
      </div>
    </div>
  );
}
