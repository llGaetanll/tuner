"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { detectPitch } from "../lib/pitch";
import { noteToFreq, freqToCents, getAllNotes } from "../lib/notes";
import NoteScroller, { BAR_TOP, SELECTED_H } from "./NoteScroller";
import Meter from "./Meter";
import TuningPresets from "./TuningPresets";

const DEFAULT_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"];

const ALL_NOTES = getAllNotes();

export default function Tuner() {
  const [tuning, setTuning] = useState<string[]>(DEFAULT_TUNING);
  const [freq, setFreq] = useState<number>(-1);
  const [closestIdx, setClosestIdx] = useState<number>(-1);
  const [cents, setCents] = useState<number | null>(null);
  const [selectedString, setSelectedString] = useState<number>(0);
  const [autoDetect, setAutoDetect] = useState<boolean>(false);
  const audioRef = useRef<{ ctx: AudioContext; processor: ScriptProcessorNode } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(16384, 1, 1);
        processor.onaudioprocess = (e) => {
          setFreq(detectPitch(e.inputBuffer.getChannelData(0), ctx.sampleRate));
        };
        src.connect(processor);
        processor.connect(ctx.destination);
        audioRef.current = { ctx, processor };
      } catch { /* mic denied */ }
    })();
    return () => { cancelled = true; audioRef.current?.ctx.close(); };
  }, []);

  useEffect(() => {
    if (freq <= 0) { setClosestIdx(-1); setCents(null); return; }
    if (autoDetect) {
      const tuningFreqs = tuning.map(noteToFreq);
      let bestIdx = 0, bestDist = Infinity;
      for (let i = 0; i < tuningFreqs.length; i++) {
        const dist = Math.abs(freqToCents(freq, tuningFreqs[i]));
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      setSelectedString(bestIdx);
      setClosestIdx(bestIdx);
      setCents(freqToCents(freq, tuningFreqs[bestIdx]));
    } else {
      const targetFreq = noteToFreq(tuning[selectedString]);
      setClosestIdx(selectedString);
      setCents(freqToCents(freq, targetFreq));
    }
  }, [freq, tuning, selectedString, autoDetect]);

  const handleNoteChange = useCallback((idx: number, note: string) => {
    setTuning((prev) => { const next = [...prev]; next[idx] = note; return next; });
  }, []);

  const handleColumnWheel = useCallback((i: number, e: React.WheelEvent) => {
    const curIdx = ALL_NOTES.indexOf(tuning[i]);
    const dir = e.deltaY > 0 ? -1 : 1;
    const newIdx = Math.max(0, Math.min(ALL_NOTES.length - 1, curIdx + dir));
    if (newIdx !== curIdx) handleNoteChange(i, ALL_NOTES[newIdx]);
  }, [tuning, handleNoteChange]);

  const inTune = cents !== null && Math.abs(cents) < 5;
  const close = cents !== null && Math.abs(cents) < 15;
  const displayNote = tuning[selectedString].replace(/[0-9]/g, "");
  const noteColor = freq <= 0 ? "text-gray-300" : inTune ? "text-emerald-500" : close ? "text-gray-800" : "text-red-500";

  const displayOctave = tuning[selectedString].replace(/[^0-9]/g, "");
  const displaySharp = displayNote.includes("#");
  const displayBase = displayNote.replace("#", "");

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 px-4 py-12">
      {/* Note display + meter */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <span className={`text-[120px] leading-none font-bold tracking-tighter transition-colors duration-150 ${noteColor}`}>
            {displayBase}
          </span>
          <span className="absolute left-full top-2 flex flex-col gap-0.5 opacity-80">
            <span className={`text-2xl font-bold transition-colors duration-150 ${noteColor}`}>
              {displaySharp ? "#" : "\u00a0"}
            </span>
            <span className={`text-lg font-medium transition-colors duration-150 ${noteColor}`}>
              {displayOctave}
            </span>
          </span>
        </div>

        <Meter cents={cents} />

        <div className="flex items-baseline gap-3">
          <div className={`text-xl font-mono tabular-nums transition-colors ${inTune ? "text-emerald-500 font-semibold" : "text-gray-400"}`}>
            {cents !== null ? (cents >= 0 ? `+${cents.toFixed(0)}` : `${cents.toFixed(0)}`) : "\u00a0"}
            {cents !== null && <span className="text-sm ml-0.5">¢</span>}
          </div>
          <div className="text-sm text-gray-300 font-mono tabular-nums">
            {freq > 0 ? `${freq.toFixed(1)} Hz` : "\u00a0"}
          </div>
        </div>
      </div>

      {/* Auto/Manual toggle */}
      <div className="flex items-center gap-2">
        <span className={`text-xs w-10 text-right ${!autoDetect ? "text-gray-700 font-medium" : "text-gray-400"}`}>Manual</span>
        <button
          onClick={() => setAutoDetect(!autoDetect)}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${autoDetect ? "bg-emerald-400" : "bg-gray-300"}`}
        >
          <div
            className="absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: autoDetect ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
        <span className={`text-xs w-10 text-left ${autoDetect ? "text-gray-700 font-medium" : "text-gray-400"}`}>Auto</span>
      </div>

      {/* Combo lock with green bar overlay */}
      <div className="relative mt-8">
        {/* Background for non-bar area */}
        <div
          className="absolute inset-0 bg-gray-50 pointer-events-none"
          style={{ zIndex: 0 }}
        />

        {/* Green bar */}
        <div
          className="absolute pointer-events-none rounded-xl"
          style={{
            top: BAR_TOP,
            height: SELECTED_H,
            left: -8,
            right: -8,
            zIndex: 0,
            background: "linear-gradient(175deg, #4aded0 0%, #22c993 45%, #1cb886 100%)",
            border: "1.5px solid rgba(255, 255, 255, 0.5)",
          }}
        />

        {/* The scrollers */}
        <div className="flex relative" style={{ zIndex: 1 }}>
          {tuning.map((note, i) => (
            <div key={i} className="relative flex">
              {/* Selected string highlight */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                style={{
                  zIndex: 0,
                  opacity: selectedString === i ? 1 : 0,
                  backgroundColor: "rgba(167, 243, 208, 0.35)",
                  clipPath: `polygon(0 0, 100% 0, 100% ${BAR_TOP}px, 0 ${BAR_TOP}px, 0 ${BAR_TOP + SELECTED_H}px, 100% ${BAR_TOP + SELECTED_H}px, 100% 100%, 0 100%)`,
                }}
              />
              {i > 0 && (
                <div
                  className="absolute left-0 w-px bg-white/10"
                  style={{ top: BAR_TOP + 10, height: SELECTED_H - 20 }}
                />
              )}
              <NoteScroller
                note={note}
                onChange={(n) => handleNoteChange(i, n)}
                onSelect={() => setSelectedString(i)}
              />
            </div>
          ))}
        </div>

        {/* Fade edges */}
        <div
          className="absolute left-0 right-0 top-0 h-8 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, white, transparent)", zIndex: 2 }}
        />
        <div
          className="absolute left-0 right-0 bottom-0 h-8 pointer-events-none"
          style={{ background: "linear-gradient(to top, white, transparent)", zIndex: 2 }}
        />
      </div>

      <TuningPresets
        currentTuning={tuning}
        onSelect={setTuning}
      />
    </div>
  );
}
