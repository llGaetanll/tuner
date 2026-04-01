"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, useSpring, useMotionValue, useTransform, MotionValue } from "framer-motion";
import { getAllNotes } from "../lib/notes";

const ALL_NOTES = getAllNotes();
const REVERSED = [...ALL_NOTES].reverse();

export const ROW_H = 40;
export const SELECTED_H = 42;
export const BAR_TOP = 55;
export const CONTAINER_H = BAR_TOP + SELECTED_H + BAR_TOP;

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
  variant: "normal" | "highlight" | "click";
  onChange: (note: string) => void;
}) {
  const name = n.replace(/[0-9]/g, "");
  const octave = n.replace(/[^0-9]/g, "");
  const rowCenter = rowIndex * ROW_H + ROW_H / 2;

  const rotateX = useTransform(stripY, (y) => {
    const dist = (rowCenter + y - CENTER_Y) / ROW_H;
    return Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, dist * 30));
  });

  const opacity = useTransform(stripY, (y) => {
    const dist = Math.abs(rowCenter + y - CENTER_Y) / ROW_H;
    return Math.max(0, 1 - dist * 0.35);
  });

  const scale = useTransform(stripY, (y) => {
    const dist = Math.abs(rowCenter + y - CENTER_Y) / ROW_H;
    return Math.max(0.5, 1 - dist * 0.12);
  });

  // Pull rows toward center to simulate cylindrical foreshortening
  const translateY = useTransform(stripY, (y) => {
    const dist = (rowCenter + y - CENTER_Y) / ROW_H;
    return -dist * Math.abs(dist) * 5;
  });

  return (
    <motion.button
      onClick={() => onChange(n)}
      className={`flex items-center justify-center shrink-0 ${
        variant === "click"
          ? "text-transparent"
          : variant === "highlight"
            ? "text-white font-bold text-lg"
            : "text-gray-400 hover:text-gray-600 text-sm"
      }`}
      style={variant === "click"
        ? { height: ROW_H, width: 46 }
        : {
            height: ROW_H,
            width: 46,
            rotateX,
            opacity,
            scale,
            y: translateY,
            transformOrigin: "center center",
          }
      }
    >
      <span className="relative">
        {name.replace("#", "")}
        <span className="absolute left-full top-[2px] bottom-[2px] flex flex-col justify-between leading-none opacity-80">
          <span className={variant === "highlight" ? "text-[11px]" : "text-[8px]"}>{name.includes("#") ? "#" : "\u00a0"}</span>
          <span className={variant === "highlight" ? "text-[10px]" : "text-[8px]"}>{octave}</span>
        </span>
      </span>
    </motion.button>
  );
}

export default function NoteScroller({
  note,
  onChange,
  onSelect,
}: {
  note: string;
  onChange: (note: string) => void;
  onSelect?: () => void;
}) {
  const idx = ALL_NOTES.indexOf(note);
  const reversedIdx = REVERSED.indexOf(note);
  const containerRef = useRef<HTMLDivElement>(null);

  const stripOffset = BAR_TOP + (SELECTED_H - ROW_H) / 2 - reversedIdx * ROW_H;

  const targetY = useMotionValue(stripOffset);
  const stripY = useSpring(targetY, { stiffness: 400, damping: 35 });
  const highlightY = useTransform(stripY, (v) => v - BAR_TOP);

  useEffect(() => {
    targetY.set(stripOffset);
  }, [stripOffset, targetY]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const newIdx = Math.max(0, Math.min(ALL_NOTES.length - 1, idx + dir));
      if (newIdx !== idx) onChange(ALL_NOTES[newIdx]);
    },
    [idx, onChange],
  );

  // Touch dragging — finger drives the strip directly, snaps on release
  const touchStartY = useRef<number>(0);
  const dragOffset = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    dragOffset.current = 0;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const dy = e.touches[0].clientY - touchStartY.current;
      dragOffset.current = dy;
      targetY.set(stripOffset + dy);
    },
    [stripOffset, targetY],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const noteShift = Math.round(dragOffset.current / ROW_H);
    const newReversedIdx = Math.max(0, Math.min(REVERSED.length - 1, reversedIdx - noteShift));
    dragOffset.current = 0;
    if (newReversedIdx !== reversedIdx) {
      onChange(REVERSED[newReversedIdx]);
    } else {
      targetY.set(stripOffset);
    }
  }, [reversedIdx, stripOffset, targetY, onChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const BUFFER = 6;
  const sliceStart = Math.max(0, reversedIdx - BUFFER);
  const sliceEnd = Math.min(REVERSED.length, reversedIdx + BUFFER + 1);

  const renderStrip = (variant: "normal" | "highlight" | "click") => (
    <>
      <div style={{ height: sliceStart * ROW_H, flexShrink: 0 }} />
      {REVERSED.slice(sliceStart, sliceEnd).map((n, i) => (
        <CylinderRow
          key={n}
          n={n}
          note={note}
          rowIndex={sliceStart + i}
          stripY={stripY}
          variant={variant}
          onChange={onChange}
        />
      ))}
    </>
  );

  return (
    <div
      ref={containerRef}
      className="relative select-none cursor-default"
      style={{ height: CONTAINER_H, width: 46, perspective: 600 }}
    >
      {/* Click layer (invisible, handles all clicks) */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 3 }}>
        <motion.div
          className="flex flex-col"
          style={{ y: stripY }}
        >
          {renderStrip("click")}
        </motion.div>
      </div>

      {/* Normal layer (gray text, clipped to exclude green bar region) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 0, clipPath: `polygon(0 0, 100% 0, 100% ${BAR_TOP}px, 0 ${BAR_TOP}px, 0 ${BAR_TOP + SELECTED_H}px, 100% ${BAR_TOP + SELECTED_H}px, 100% 100%, 0 100%)` }}
      >
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

      {/* Bar click zone for string selection */}
      {onSelect && (
        <div
          className="absolute inset-x-0 cursor-pointer"
          style={{ top: BAR_TOP, height: SELECTED_H, zIndex: 4 }}
          onClick={onSelect}
        />
      )}
    </div>
  );
}
