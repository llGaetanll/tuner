"use client";

const COL_W = 46;
const NOTES_W = COL_W * 6;

const PRESETS: { name: string; notes: string[] }[] = [
  { name: "Standard", notes: ["E2", "A2", "D3", "G3", "B3", "E4"] },
  { name: "Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "E4"] },
  { name: "DADGAD", notes: ["D2", "A2", "D3", "G3", "A3", "D4"] },
  { name: "Open G", notes: ["D2", "G2", "D3", "G3", "B3", "D4"] },
  { name: "Open D", notes: ["D2", "A2", "D3", "F#3", "A3", "D4"] },
  { name: "Open E", notes: ["E2", "B2", "E3", "G#3", "B3", "E4"] },
  { name: "Open A", notes: ["E2", "A2", "E3", "A3", "C#4", "E4"] },
  { name: "Half Step Down", notes: ["D#2", "G#2", "C#3", "F#3", "A#3", "D#4"] },
  { name: "Full Step Down", notes: ["D2", "G2", "C3", "F3", "A3", "D4"] },
  { name: "Drop C", notes: ["C2", "G2", "C3", "F3", "A3", "D4"] },
  { name: "Double Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "D4"] },
  { name: "Open C", notes: ["C2", "G2", "C3", "G3", "C4", "E4"] },
];

function NoteCell({ n }: { n: string }) {
  const base = n.replace(/[0-9#]/g, "");
  const hasSharp = n.includes("#");
  const octave = n.replace(/[^0-9]/g, "");

  return (
    <span
      className="flex items-center justify-center text-sm"
      style={{ width: COL_W }}
    >
      <span className="relative">
        {base}
        <span className="absolute left-full top-[1px] bottom-[1px] flex flex-col justify-between leading-none opacity-70 text-[7px]">
          <span>{hasSharp ? "#" : "\u00a0"}</span>
          <span>{octave}</span>
        </span>
      </span>
    </span>
  );
}

export default function TuningPresets({
  currentTuning,
  onSelect,
}: {
  currentTuning: string[];
  onSelect: (notes: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1" style={{ width: NOTES_W }}>
      {PRESETS.map((preset) => {
        const isActive =
          preset.notes.length === currentTuning.length &&
          preset.notes.every((n, i) => n === currentTuning[i]);

        return (
          <button
            key={preset.name}
            onClick={() => onSelect(preset.notes)}
            className={`relative flex items-center h-9 rounded-lg transition-colors ${
              isActive ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <span
              className={`absolute right-full pr-2 text-[11px] whitespace-nowrap ${
                isActive ? "text-gray-600 font-semibold" : "text-gray-400"
              }`}
            >
              {preset.name}
            </span>
            <span className={`flex w-full ${isActive ? "text-gray-700 font-semibold" : "text-gray-400"}`}>
              {preset.notes.map((n, i) => (
                <NoteCell key={i} n={n} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
