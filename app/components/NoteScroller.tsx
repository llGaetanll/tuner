"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { noteToFreq, getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();

const ROW_H = 28;
const SELECTED_H = 40;
// Total height: 2 rows above + selected + 2 rows below
const CONTAINER_H = ROW_H * 4 + SELECTED_H;

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
    [idx, onChange],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Render enough items to fill the view + overflow for animation.
  // We render 7 items (3 above, selected, 3 below) and clip to 5.
  const range = 3;
  const items: { note: string; globalIdx: number }[] = [];
  for (let offset = range; offset >= -range; offset--) {
    const i = idx + offset;
    if (i >= 0 && i < ALL_NOTES.length) {
      items.push({ note: ALL_NOTES[i], globalIdx: i });
    }
  }

  // The strip y offset: the selected note (idx) should be centered.
  // Each item above selected is ROW_H, selected itself is SELECTED_H.
  // We position so that the strip scrolls within the clipped container.
  // Top of container = 2 * ROW_H above center of selected.
  // Strip top starts at the highest item we render (idx + range).
  // Distance from top of strip to top of selected = (items above selected) * ROW_H
  // We want top of selected to be at y = 2 * ROW_H in the container.
  const itemsAboveSelected = items.filter((it) => it.globalIdx > idx).length;
  const stripOffset = ROW_H * 2 - itemsAboveSelected * ROW_H;

  return (
    <div
      ref={containerRef}
      className={`relative select-none cursor-ns-resize overflow-hidden ${isFirst ? "" : "border-l border-gray-200"}`}
      style={{ height: CONTAINER_H }}
    >
      <motion.div
        className="flex flex-col w-14"
        animate={{ y: stripOffset }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        {items.map((item) => {
          const n = item.note;
          const name = n.replace(/[0-9]/g, "");
          const oct = n.match(/\d+/)?.[0] ?? "";
          const freq = noteToFreq(n);
          const isSelected = item.globalIdx === idx;

          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`w-14 flex items-center justify-center gap-0.5 shrink-0 transition-colors ${
                isSelected
                  ? isInTune
                    ? "bg-emerald-400 text-white"
                    : "bg-emerald-100 text-emerald-900"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={{ height: isSelected ? SELECTED_H : ROW_H }}
            >
              <span className={`font-semibold leading-none ${isSelected ? "text-base" : "text-sm"}`}>
                {name}
              </span>
              <span className={`text-[9px] leading-none ${isSelected ? "opacity-70" : "opacity-50"}`}>
                {oct}
              </span>
              {!isSelected && (
                <span className="text-[9px] ml-0.5 opacity-30 font-mono">{freq.toFixed(0)}</span>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
