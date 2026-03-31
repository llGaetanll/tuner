"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { detectPitch } from "../lib/pitch";
import { noteToFreq, freqToCents } from "../lib/notes";
import NoteScroller, { BAR_TOP, SELECTED_H } from "./NoteScroller";
import Meter from "./Meter";

const DEFAULT_TUNING = ["D2", "A2", "D3", "F#3", "B3", "D4"];

export default function Tuner() {
  const [tuning, setTuning] = useState<string[]>(DEFAULT_TUNING);
  const [freq, setFreq] = useState<number>(-1);
  const [closestIdx, setClosestIdx] = useState<number>(-1);
  const [cents, setCents] = useState<number | null>(null);
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
    const tuningFreqs = tuning.map(noteToFreq);
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < tuningFreqs.length; i++) {
      const dist = Math.abs(freqToCents(freq, tuningFreqs[i]));
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
    setClosestIdx(bestIdx);
    setCents(freqToCents(freq, tuningFreqs[bestIdx]));
  }, [freq, tuning]);

  const handleNoteChange = useCallback((idx: number, note: string) => {
    setTuning((prev) => { const next = [...prev]; next[idx] = note; return next; });
  }, []);

  const inTune = cents !== null && Math.abs(cents) < 5;
  const close = cents !== null && Math.abs(cents) < 15;
  const displayNote = closestIdx >= 0 ? tuning[closestIdx].replace(/[0-9]/g, "") : "--";
  const noteColor = freq <= 0 ? "text-gray-200" : inTune ? "text-emerald-500" : close ? "text-gray-800" : "text-red-500";

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-10 px-4 py-12">
      <div className="flex flex-col items-center">
        <div className={`text-8xl font-bold tracking-tighter transition-colors duration-150 ${noteColor}`}>
          {displayNote}
        </div>
        <div className={`text-2xl font-mono mt-1 transition-colors ${inTune ? "text-emerald-500" : "text-gray-400"}`}>
          {cents !== null ? (cents >= 0 ? `+${cents.toFixed(0)}c` : `${cents.toFixed(0)}c`) : "\u00a0"}
        </div>
        <div className="text-sm text-gray-400 font-mono mt-1">
          {freq > 0 ? `${freq.toFixed(1)} Hz` : "\u00a0"}
        </div>
      </div>

      <Meter cents={cents} />

      {/* Combo lock with green bar overlay */}
      <div className="relative mt-8">
        {/* Green bar -- behind everything */}
        <div
          className="absolute pointer-events-none rounded-xl bg-emerald-500"
          style={{
            top: BAR_TOP,
            height: SELECTED_H,
            left: -12,
            right: -12,
            zIndex: 0,
          }}
        />

        {/* The scrollers -- above the green bar */}
        <div className="flex relative" style={{ zIndex: 1 }}>
          {tuning.map((note, i) => (
            <NoteScroller
              key={i}
              note={note}
              onChange={(n) => handleNoteChange(i, n)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
