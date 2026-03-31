"use client";

export default function Meter({ cents }: { cents: number | null }) {
  const clamped = cents !== null ? Math.max(-50, Math.min(50, cents)) : 0;
  const pct = 50 + (clamped / 50) * 50;
  const inTune = cents !== null && Math.abs(cents) < 5;
  const close = cents !== null && Math.abs(cents) < 15;

  const color = inTune ? "bg-emerald-400" : close ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="w-80 h-5 relative bg-gray-800 rounded-full overflow-hidden">
      <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-600 -translate-x-px" />
      <div
        className={`absolute top-0 h-full w-1.5 rounded-full transition-all duration-100 ${color}`}
        style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
      />
    </div>
  );
}
