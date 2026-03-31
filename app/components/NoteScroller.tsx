"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { noteToFreq, getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();
const VISIBLE = 5; // total visible: 2 above, selected, 2 below

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

  // Build the 5 visible slots: offsets +2, +1, 0, -1, -2
  const slots = [2, 1, 0, -1, -2].map((offset) => {
    const i = idx + offset;
    if (i < 0 || i >= ALL_NOTES.length) return null;
    return { note: ALL_NOTES[i], offset };
  });

  return (
    <div
      ref={containerRef}
      className={`relative select-none cursor-ns-resize flex flex-col overflow-hidden ${isFirst ? "" : "border-l border-gray-200"}`}
      style={{ height: VISIBLE * 32 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {slots.map((slot) => {
          if (!slot) return null;
          const n = slot.note;
          const name = n.replace(/[0-9]/g, "");
          const oct = n.match(/\d+/)?.[0] ?? "";
          const freq = noteToFreq(n);
          const isSelected = slot.offset === 0;

          return (
            <motion.button
              key={n}
              layout
              initial={{ opacity: 0, y: slot.offset > 0 ? -32 : 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: slot.offset > 0 ? 32 : -32 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={() => onChange(n)}
              className={`w-14 flex items-center justify-center gap-0.5 shrink-0 transition-colors ${
                isSelected
                  ? isInTune
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-100 text-emerald-900"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={{ height: 32 }}
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
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
