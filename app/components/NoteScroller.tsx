"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();
// Reversed once: highest pitch first (displayed at top)
const REVERSED = [...ALL_NOTES].reverse();

export const ROW_H = 32;
export const SELECTED_H = 48;
export const VISIBLE_ROWS = 5;
export const CONTAINER_H = ROW_H * (VISIBLE_ROWS - 1) + SELECTED_H;
export const BAR_TOP = ROW_H * Math.floor(VISIBLE_ROWS / 2);

export default function NoteScroller({
  note,
  onChange,
}: {
  note: string;
  onChange: (note: string) => void;
}) {
  const idx = ALL_NOTES.indexOf(note);
  const reversedIdx = REVERSED.indexOf(note);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const newIdx = Math.max(0, Math.min(ALL_NOTES.length - 1, idx + dir));
      if (newIdx !== idx) onChange(ALL_NOTES[newIdx]);
    },
    [idx, onChange],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // All notes use ROW_H; the selected note visual size difference is
  // handled purely via font size/weight, keeping strip geometry stable.
  // This means the strip offset is a simple function of the index.
  const stripOffset = BAR_TOP + (SELECTED_H - ROW_H) / 2 - reversedIdx * ROW_H;

  const strip = useMemo(
    () =>
      (variant: "normal" | "highlight") =>
        REVERSED.map((n) => {
          const name = n.replace(/[0-9]/g, "");
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`flex items-center justify-center shrink-0 ${
                variant === "highlight"
                  ? "text-white font-bold"
                  : n === note
                    ? "text-gray-700 font-bold"
                    : "text-gray-400 hover:text-gray-600"
              }`}
              style={{ height: ROW_H, width: 56 }}
            >
              <span className={n === note ? "text-lg" : "text-sm"}>
                {name}
              </span>
            </button>
          );
        }),
    [note, onChange],
  );

  return (
    <div
      ref={containerRef}
      className="relative select-none cursor-ns-resize"
      style={{ height: CONTAINER_H, width: 56 }}
    >
      {/* Normal layer (gray text, behind green bar) */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <motion.div
          className="flex flex-col"
          animate={{ y: stripOffset }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        >
          {strip("normal")}
        </motion.div>
      </div>

      {/* Highlight layer (white text, clipped to green bar region, above green bar) */}
      <div
        className="absolute left-0 right-0 overflow-hidden pointer-events-none"
        style={{ top: BAR_TOP, height: SELECTED_H, zIndex: 2 }}
      >
        <motion.div
          className="flex flex-col"
          animate={{ y: stripOffset - BAR_TOP }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        >
          {strip("highlight")}
        </motion.div>
      </div>
    </div>
  );
}
