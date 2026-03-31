// Guitar tuner test bench
// Run: deno run --allow-read analyze.ts

const STRINGS: Record<string, number> = {
  "audio/string1_D2.wav": 73.4,
  "audio/string2_A2.wav": 110.0,
  "audio/string3_D3.wav": 146.8,
  "audio/string4_Fs3.wav": 185.0,
  "audio/string5_B3.wav": 246.9,
  "audio/string6_D4.wav": 293.7,
};

// Tolerance: within 3% of expected = correct
const TOLERANCE = 0.03;

function readWav(path: string): { samples: Float64Array; sampleRate: number } {
  const buf = Deno.readFileSync(path);
  const view = new DataView(buf.buffer);

  // Parse WAV header
  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  // Find data chunk
  let offset = 12;
  while (offset < buf.length - 8) {
    const id = String.fromCharCode(buf[offset], buf[offset + 1], buf[offset + 2], buf[offset + 3]);
    const size = view.getUint32(offset + 4, true);
    if (id === "data") {
      offset += 8;
      const bytesPerSample = bitsPerSample / 8;
      const numSamples = Math.floor(size / (bytesPerSample * numChannels));
      const samples = new Float64Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const pos = offset + i * numChannels * bytesPerSample;
        if (bitsPerSample === 16) {
          samples[i] = view.getInt16(pos, true) / 32768;
        } else if (bitsPerSample === 32) {
          samples[i] = view.getFloat32(pos, true);
        }
      }
      return { samples, sampleRate };
    }
    offset += 8 + size;
  }
  throw new Error("No data chunk found");
}

function detectPitch(samples: Float64Array, sampleRate: number): number {
  const size = samples.length;

  // RMS check
  let rms = 0;
  for (let i = 0; i < size; i++) rms += samples[i] * samples[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.005) return -1;

  // Autocorrelation, only compute for plausible guitar lags
  const minLag = Math.floor(sampleRate / 1400);
  const maxLag = Math.min(Math.ceil(sampleRate / 50), Math.floor(size / 2));
  const c = new Float64Array(maxLag + 1);
  for (let i = minLag; i <= maxLag; i++) {
    for (let j = 0; j < size - i; j++) {
      c[i] += samples[j] * samples[j + i];
    }
  }

  // Find first dip after minLag
  let d1 = minLag;
  while (d1 < maxLag && c[d1] > c[d1 + 1]) d1++;

  // Find max after first dip
  let maxval = -1, maxpos = -1;
  for (let i = d1; i <= maxLag; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }

  if (maxpos < 1 || maxpos >= size - 1) return -1;

  // Parabolic interpolation
  const a = c[maxpos - 1], b = c[maxpos], cc = c[maxpos + 1];
  const denom = a - 2 * b + cc;
  if (denom === 0) return sampleRate / maxpos;
  const shift = (a - cc) / (2 * denom);
  return sampleRate / (maxpos + shift);
}

// Run analysis in sliding windows
const WINDOW_MS = 500;
const HOP_MS = 50;

console.log("Guitar Tuner Test Bench");
console.log("=".repeat(70));

let totalFrames = 0;
let totalCorrect = 0;
const stringAccuracies: number[] = [];

for (const [file, expected] of Object.entries(STRINGS)) {
  const { samples, sampleRate } = readWav(file);
  const windowSize = Math.floor((WINDOW_MS / 1000) * sampleRate);
  const hopSize = Math.floor((HOP_MS / 1000) * sampleRate);

  let frames = 0;
  let correct = 0;
  const detections: number[] = [];

  for (let start = 0; start + windowSize <= samples.length; start += hopSize) {
    const window = samples.slice(start, start + windowSize);
    const freq = detectPitch(window, sampleRate);
    frames++;

    if (freq > 0) {
      detections.push(freq);
      const error = Math.abs(freq - expected) / expected;
      if (error < TOLERANCE) correct++;
    }
  }

  const pct = (correct / frames) * 100;
  const median = detections.length > 0
    ? detections.sort((a, b) => a - b)[Math.floor(detections.length / 2)].toFixed(1)
    : "N/A";

  totalFrames += frames;
  totalCorrect += correct;
  stringAccuracies.push(pct);

  console.log(`  ${file.padEnd(28)} expected: ${String(expected).padEnd(6)} | ${String(pct.toFixed(1) + "%").padStart(6)} correct | median: ${median} Hz`);
}

const frameScore = (totalCorrect / totalFrames) * 100;
const stringScore = stringAccuracies.reduce((a, b) => a + b, 0) / stringAccuracies.length;

console.log("\n" + "=".repeat(70));
console.log(`  Frame accuracy:  ${frameScore.toFixed(1)}%  (${totalCorrect}/${totalFrames} frames within ${TOLERANCE * 100}%)`);
console.log(`  String accuracy: ${stringScore.toFixed(1)}%  (average of per-string scores)`);
