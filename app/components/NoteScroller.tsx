"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();

export const ROW_H = 28;
export const SELECTED_H = 44;
export const CONTAINER_H = ROW_H * 4 + SELECTED_H;
export const BAR_TOP = ROW_H * 2;

export default function NoteScroller({
  note,
  onChange,
  isFirst,
}: {
  note: string;
  onChange: (note: string) => void;
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
    [idx, onChange],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const range = 3;
  const items: { note: string; globalIdx: number }[] = [];
  for (let offset = range; offset >= -range; offset--) {
    const i = idx + offset;
    if (i >= 0 && i < ALL_NOTES.length) {
      items.push({ note: ALL_NOTES[i], globalIdx: i });
    }
  }

  const itemsAboveSelected = items.filter((it) => it.globalIdx > idx).length;
  const stripOffset = BAR_TOP - itemsAboveSelected * ROW_H;

  const renderStrip = (variant: "normal" | "highlight") =>
    items.map((item) => {
      const n = item.note;
      const name = n.replace(/[0-9]/g, "");
      const isSelected = item.globalIdx === idx;

      return (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-14 flex items-center justify-center shrink-0 ${
            variant === "highlight"
              ? "text-white font-bold"
              : isSelected
                ? "text-gray-700 font-bold"
                : "text-gray-400 hover:text-gray-600"
          }`}
          style={{ height: isSelected ? SELECTED_H : ROW_H }}
        >
          <span className={isSelected ? "text-lg" : "text-sm"}>{name}</span>
        </button>
      );
    });

  return (
    <div
      ref={containerRef}
      className={`relative select-none cursor-ns-resize ${isFirst ? "" : "border-l border-gray-200"}`}
      style={{ height: CONTAINER_H }}
    >
      {/* Normal layer (gray text) */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="flex flex-col w-14"
          animate={{ y: stripOffset }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        >
          {renderStrip("normal")}
        </motion.div>
      </div>

      {/* Highlight layer (white text, clipped to green bar region) */}
      <div
        className="absolute left-0 right-0 overflow-hidden pointer-events-none"
        style={{ top: BAR_TOP, height: SELECTED_H }}
      >
        <motion.div
          className="flex flex-col w-14"
          animate={{ y: stripOffset - BAR_TOP }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        >
          {renderStrip("highlight")}
        </motion.div>
      </div>
    </div>
  );
}
