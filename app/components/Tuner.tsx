"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { detectPitch } from "../lib/pitch";
import { noteToFreq, freqToCents } from "../lib/notes";
import NoteScroller from "./NoteScroller";
import Meter from "./Meter";

const DEFAULT_TUNING = ["D2", "A2", "D3", "F#3", "B3", "D4"];

export default function Tuner() {
  const [tuning, setTuning] = useState<string[]>(DEFAULT_TUNING);
  const [freq, setFreq] = useState<number>(-1);
  const [closestIdx, setClosestIdx] = useState<number>(-1);
  const [cents, setCents] = useState<number | null>(null);
  const [activeString, setActiveString] = useState<number>(-1);
  const audioRef = useRef<{ ctx: AudioContext; processor: ScriptProcessorNode } | null>(null);

  // Start audio immediately
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
          const f = detectPitch(e.inputBuffer.getChannelData(0), ctx.sampleRate);
          setFreq(f);
        };

        src.connect(processor);
        processor.connect(ctx.destination);
        audioRef.current = { ctx, processor };
      } catch {
        // mic denied
      }
    })();

    return () => {
      cancelled = true;
      audioRef.current?.ctx.close();
    };
  }, []);

  // Compute closest string and cents
  useEffect(() => {
    if (freq <= 0) {
      setClosestIdx(-1);
      setCents(null);
      return;
    }

    const tuningFreqs = tuning.map(noteToFreq);
    let bestIdx = 0;
    let bestDist = Infinity;

    if (activeString >= 0 && activeString < tuning.length) {
      bestIdx = activeString;
      bestDist = Math.abs(freqToCents(freq, tuningFreqs[activeString]));
    } else {
      for (let i = 0; i < tuningFreqs.length; i++) {
        const dist = Math.abs(freqToCents(freq, tuningFreqs[i]));
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
    }

    setClosestIdx(bestIdx);
    setCents(freqToCents(freq, tuningFreqs[bestIdx]));
  }, [freq, tuning, activeString]);

  const handleNoteChange = useCallback((idx: number, note: string) => {
    setTuning((prev) => {
      const next = [...prev];
      next[idx] = note;
      return next;
    });
  }, []);

  const addString = useCallback(() => {
    setTuning((prev) => [...prev, "E4"]);
  }, []);

  const removeString = useCallback((idx: number) => {
    setTuning((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      if (activeString === idx) setActiveString(-1);
      else if (activeString > idx) setActiveString((a) => a - 1);
      return next;
    });
  }, [activeString]);

  const inTune = cents !== null && Math.abs(cents) < 5;
  const close = cents !== null && Math.abs(cents) < 15;

  const displayNote = closestIdx >= 0 ? tuning[closestIdx].replace(/[0-9]/g, "") : "--";
  const noteColor = freq <= 0
    ? "text-gray-600"
    : inTune
      ? "text-emerald-400"
      : close
        ? "text-gray-200"
        : "text-red-400";

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 px-4">
      {/* Note display */}
      <div className="flex flex-col items-center">
        <div className={`text-8xl font-bold tracking-tighter transition-colors ${noteColor}`}>
          {displayNote}
        </div>
        <div className={`text-2xl font-mono mt-1 ${inTune ? "text-emerald-400" : "text-gray-500"}`}>
          {cents !== null ? (cents >= 0 ? `+${cents.toFixed(0)}c` : `${cents.toFixed(0)}c`) : ""}
        </div>
        <div className="text-sm text-gray-500 font-mono mt-1">
          {freq > 0 ? `${freq.toFixed(1)} Hz` : "-- Hz"}
        </div>
      </div>

      {/* Meter */}
      <Meter cents={cents} />

      {/* String buttons */}
      <div className="flex items-end gap-3 flex-wrap justify-center">
        {tuning.map((note, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <NoteScroller
              note={note}
              onChange={(n) => handleNoteChange(i, n)}
              isInTune={closestIdx === i && inTune}
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => setActiveString(activeString === i ? -1 : i)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  activeString === i
                    ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/50"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {activeString === i ? "locked" : "lock"}
              </button>
              {tuning.length > 1 && (
                <button
                  onClick={() => removeString(i)}
                  className="text-[10px] text-gray-600 hover:text-red-400 px-1 transition-colors"
                >
                  x
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          onClick={addString}
          className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400 flex items-center justify-center text-2xl transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
