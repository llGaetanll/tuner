export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const ENHARMONIC: Record<string, string> = {
  Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B", "E#": "F", "B#": "C",
};

export function noteToFreq(note: string): number {
  let name = note.replace(/[0-9]/g, "");
  const octaveMatch = note.match(/\d+/);
  if (!octaveMatch) return 0;
  const octave = parseInt(octaveMatch[0]);
  if (ENHARMONIC[name]) name = ENHARMONIC[name];
  const semitone = NOTE_NAMES.indexOf(name as typeof NOTE_NAMES[number]);
  if (semitone === -1) return 0;
  const midi = semitone + (octave + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNote(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function noteToMidi(note: string): number {
  let name = note.replace(/[0-9]/g, "");
  const octaveMatch = note.match(/\d+/);
  if (!octaveMatch) return 0;
  const octave = parseInt(octaveMatch[0]);
  if (ENHARMONIC[name]) name = ENHARMONIC[name];
  const semitone = NOTE_NAMES.indexOf(name as typeof NOTE_NAMES[number]);
  if (semitone === -1) return 0;
  return semitone + (octave + 1) * 12;
}

export function freqToCents(freq: number, targetFreq: number): number {
  return 1200 * Math.log2(freq / targetFreq);
}

// All notes from C1 to B6
export function getAllNotes(): string[] {
  const notes: string[] = [];
  for (let octave = 1; octave <= 6; octave++) {
    for (const name of NOTE_NAMES) {
      notes.push(`${name}${octave}`);
    }
  }
  return notes;
}
