"use client";

export default function Meter({ cents }: { cents: number | null }) {
  const clamped = cents !== null ? Math.max(-50, Math.min(50, cents)) : 0;
  const pct = 50 + (clamped / 50) * 50;
  const inTune = cents !== null && Math.abs(cents) < 5;
  const close = cents !== null && Math.abs(cents) < 15;

  return (
    <div className="w-72 flex flex-col items-center gap-1">
      <div className="w-full h-2 relative bg-gray-100 rounded-full">
        {/* Center mark */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300 -translate-x-px" />

        {/* Indicator line */}
        <div
          className="absolute w-0.5 rounded-full transition-all duration-100"
          style={{
            left: `${pct}%`,
            transform: "translateX(-50%)",
            top: -6,
            bottom: -6,
            background: inTune
              ? "#10b981"
              : close
                ? "#f59e0b"
                : "#ef4444",
            boxShadow: inTune
              ? "0 0 6px rgba(16, 185, 129, 0.5)"
              : "none",
          }}
        />
      </div>

      {/* Scale marks */}
      <div className="w-full flex justify-between px-1 mt-2">
        {[-50, -25, 0, 25, 50].map((v) => (
          <div key={v} className="flex flex-col items-center">
            <span className="text-[9px] text-gray-300 font-mono tabular-nums">
              {v === 0 ? "0" : v > 0 ? `+${v}` : `${v}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
