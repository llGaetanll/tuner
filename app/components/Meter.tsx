"use client";

export default function Meter({ cents }: { cents: number | null }) {
  const clamped = cents !== null ? Math.max(-50, Math.min(50, cents)) : 0;
  const pct = 50 + (clamped / 50) * 50;
  const inTune = cents !== null && Math.abs(cents) < 5;
  const close = cents !== null && Math.abs(cents) < 15;
  const color = inTune ? "bg-emerald-500" : close ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="w-64 h-3 relative bg-gray-100 rounded-full overflow-hidden">
      <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300 -translate-x-px" />
      <div
        className={`absolute top-0.5 bottom-0.5 w-1 rounded-full transition-all duration-100 ${color}`}
        style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
      />
    </div>
  );
}
