"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, useSpring, useMotionValue, useTransform, MotionValue } from "framer-motion";
import { getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();
const REVERSED = [...ALL_NOTES].reverse();

export const ROW_H = 40;
export const SELECTED_H = 52;
export const VISIBLE_ROWS = 5;
export const CONTAINER_H = ROW_H * (VISIBLE_ROWS - 1) + SELECTED_H;
export const BAR_TOP = ROW_H * Math.floor(VISIBLE_ROWS / 2);

const CENTER_Y = BAR_TOP + SELECTED_H / 2;
const MAX_ANGLE = 55;

function CylinderRow({
  n,
  note,
  rowIndex,
  stripY,
  variant,
  onChange,
}: {
  n: string;
  note: string;
  rowIndex: number;
  stripY: MotionValue<number>;
  variant: "normal" | "highlight";
  onChange: (note: string) => void;
}) {
  const name = n.replace(/[0-9]/g, "");
  const rowCenter = rowIndex * ROW_H + ROW_H / 2;

  const rotateX = useTransform(stripY, (y) => {
    const dist = (rowCenter + y - CENTER_Y) / ROW_H;
    return Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, dist * 20));
  });

  const opacity = useTransform(stripY, (y) => {
    const dist = Math.abs(rowCenter + y - CENTER_Y) / ROW_H;
    return Math.max(0, 1 - dist * 0.2);
  });

  const scale = useTransform(stripY, (y) => {
    const dist = Math.abs(rowCenter + y - CENTER_Y) / ROW_H;
    return Math.max(0.7, 1 - dist * 0.06);
  });

  return (
    <motion.button
      onClick={() => onChange(n)}
      className={`flex items-center justify-center shrink-0 ${
        variant === "highlight"
          ? "text-white font-bold"
          : n === note
            ? "text-gray-700 font-bold"
            : "text-gray-400 hover:text-gray-600"
      }`}
      style={{
        height: ROW_H,
        width: 56,
        rotateX,
        opacity,
        scale,
        transformOrigin: "center center",
      }}
    >
      <span className={n === note ? "text-lg" : "text-sm"}>{name}</span>
    </motion.button>
  );
}

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

  const targetY = useMotionValue(
    BAR_TOP + (SELECTED_H - ROW_H) / 2 - reversedIdx * ROW_H,
  );
  const stripY = useSpring(targetY, { stiffness: 400, damping: 35 });

  useEffect(() => {
    targetY.set(BAR_TOP + (SELECTED_H - ROW_H) / 2 - reversedIdx * ROW_H);
  }, [reversedIdx, targetY]);

  const highlightY = useTransform(stripY, (v) => v - BAR_TOP);

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

  const renderStrip = (variant: "normal" | "highlight") =>
    REVERSED.map((n, i) => (
      <CylinderRow
        key={n}
        n={n}
        note={note}
        rowIndex={i}
        stripY={stripY}
        variant={variant}
        onChange={onChange}
      />
    ));

  return (
    <div
      ref={containerRef}
      className="relative select-none cursor-ns-resize"
      style={{ height: CONTAINER_H, width: 56, perspective: 600 }}
    >
      {/* Normal layer (gray text, behind green bar) */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <motion.div
          className="flex flex-col"
          style={{ y: stripY, transformStyle: "preserve-3d" }}
        >
          {renderStrip("normal")}
        </motion.div>
      </div>

      {/* Highlight layer (white text, clipped to green bar region) */}
      <div
        className="absolute left-0 right-0 overflow-hidden pointer-events-none"
        style={{ top: BAR_TOP, height: SELECTED_H, zIndex: 2 }}
      >
        <motion.div
          className="flex flex-col"
          style={{ y: highlightY, transformStyle: "preserve-3d" }}
        >
          {renderStrip("highlight")}
        </motion.div>
      </div>
    </div>
  );
}
