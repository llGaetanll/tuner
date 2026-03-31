"use client";

import { useRef, useEffect, useCallback } from "react";
import { noteToFreq, getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();

export default function NoteScroller({
  note,
  onChange,
  isInTune,
}: {
  note: string;
  onChange: (note: string) => void;
  isInTune: boolean;
}) {
  const idx = ALL_NOTES.indexOf(note);
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);

  const noteName = note.replace(/[0-9]/g, "");
  const octave = note.match(/\d+/)?.[0] ?? "";
  const freq = noteToFreq(note);

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

  const getNeighbor = (offset: number) => {
    const i = idx + offset;
    if (i < 0 || i >= ALL_NOTES.length) return null;
    return ALL_NOTES[i];
  };

  return (
    <div ref={containerRef} className="relative group">
      {/* Main button */}
      <div
        className={`
          w-16 h-16 rounded-xl flex flex-col items-center justify-center
          cursor-default select-none transition-all duration-150
          border-2
          ${isInTune
            ? "border-emerald-400 bg-emerald-400 text-gray-900"
            : "border-gray-600 bg-gray-800/80 text-gray-200 hover:border-gray-400"
          }
        `}
      >
        <span className="text-xl font-bold leading-none">{noteName}</span>
        <span className="text-[10px] text-current/60 leading-none mt-0.5">{octave}</span>
      </div>

      {/* Expanded scroll view on hover */}
      <div
        ref={expandedRef}
        className="
          absolute left-1/2 -translate-x-1/2 bottom-full mb-2
          opacity-0 pointer-events-none scale-95
          group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100
          transition-all duration-150 z-20
          flex flex-col items-center gap-1
          bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-2
          min-w-[80px]
        "
      >
        {[2, 1, -1, -2].map((offset) => {
          const n = getNeighbor(offset);
          if (!n) return <div key={offset} className="h-7" />;
          const nName = n.replace(/[0-9]/g, "");
          const nOct = n.match(/\d+/)?.[0] ?? "";
          const nFreq = noteToFreq(n);
          return (
            <button
              key={offset}
              onClick={() => onChange(n)}
              className={`
                w-full px-3 py-1 rounded-lg text-sm flex items-center justify-between gap-3
                transition-colors
                ${Math.abs(offset) === 1 ? "text-gray-300 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-800"}
              `}
            >
              <span className="font-semibold">{nName}<span className="text-[10px] ml-0.5">{nOct}</span></span>
              <span className="text-[10px] text-gray-500 font-mono">{nFreq.toFixed(1)}</span>
            </button>
          );
        })}
        {/* Current note highlighted */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-2 h-2 bg-gray-900/95 border-b border-r border-gray-700 rotate-45" />
      </div>

      {/* Frequency label below */}
      <div className="text-[10px] text-gray-500 text-center mt-1 font-mono">{freq.toFixed(0)}</div>
    </div>
  );
}
