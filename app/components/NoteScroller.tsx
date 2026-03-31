"use client";

import { useRef, useEffect, useCallback } from "react";
import { noteToFreq, getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();

export default function NoteScroller({
  note,
  onChange,
  isInTune,
  position,
}: {
  note: string;
  onChange: (note: string) => void;
  isInTune: boolean;
  position: "first" | "middle" | "last" | "only";
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

  const getNeighbor = (offset: number) => {
    const i = idx + offset;
    if (i < 0 || i >= ALL_NOTES.length) return null;
    return ALL_NOTES[i];
  };

  const noteName = note.replace(/[0-9]/g, "");
  const octave = note.match(/\d+/)?.[0] ?? "";

  const roundedClass =
    position === "only"
      ? "rounded-xl"
      : position === "first"
        ? "rounded-l-xl"
        : position === "last"
          ? "rounded-r-xl"
          : "";

  const borderClass =
    position === "first" || position === "only"
      ? "border-l-2"
      : "";

  return (
    <div ref={containerRef} className="relative group flex flex-col items-center select-none cursor-ns-resize">
      {/* The drum/roller */}
      <div className={`flex flex-col overflow-hidden border-y-2 border-r-2 ${borderClass} border-gray-300 bg-white ${roundedClass}`}>
        {/* Above neighbor (faded) */}
        <div className="h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {(() => {
            const n = getNeighbor(1);
            if (!n) return null;
            const nm = n.replace(/[0-9]/g, "");
            const oc = n.match(/\d+/)?.[0] ?? "";
            return (
              <button
                onClick={() => onChange(n)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-baseline gap-0.5"
              >
                <span className="font-semibold">{nm}</span>
                <span className="text-[9px]">{oc}</span>
              </button>
            );
          })()}
        </div>

        {/* Current note (center, prominent) */}
        <div
          className={`
            w-16 h-14 flex flex-col items-center justify-center transition-colors duration-150
            ${isInTune ? "bg-emerald-50" : "bg-white"}
          `}
        >
          <span className={`text-xl font-bold leading-none ${isInTune ? "text-emerald-600" : "text-gray-900"}`}>
            {noteName}
          </span>
          <span className={`text-[10px] leading-none mt-0.5 ${isInTune ? "text-emerald-500" : "text-gray-400"}`}>
            {octave}
          </span>
        </div>

        {/* Below neighbor (faded) */}
        <div className="h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {(() => {
            const n = getNeighbor(-1);
            if (!n) return null;
            const nm = n.replace(/[0-9]/g, "");
            const oc = n.match(/\d+/)?.[0] ?? "";
            return (
              <button
                onClick={() => onChange(n)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-baseline gap-0.5"
              >
                <span className="font-semibold">{nm}</span>
                <span className="text-[9px]">{oc}</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Frequency below */}
      <div className="text-[10px] text-gray-400 font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {noteToFreq(note).toFixed(0)} Hz
      </div>
    </div>
  );
}
