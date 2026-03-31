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

// FFT via Cooley-Tukey radix-2
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle), wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < half; j++) {
        const tRe = curRe * re[i + j + half] - curIm * im[i + j + half];
        const tIm = curRe * im[i + j + half] + curIm * re[i + j + half];
        re[i + j + half] = re[i + j] - tRe;
        im[i + j + half] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

function detectPitch(samples: Float64Array, sampleRate: number): number {
  const size = samples.length;

  // RMS check
  let rms = 0;
  for (let i = 0; i < size; i++) rms += samples[i] * samples[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.008) return -1;

  // Step 1: FFT to get a rough frequency estimate
  let n = 1;
  while (n < size) n <<= 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < size; i++) {
    re[i] = samples[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)));
  }
  fft(re, im);
  const mag = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = re[i] * re[i] + im[i] * im[i];

  const binWidth = sampleRate / n;
  const minBin = Math.floor(50 / binWidth);
  const maxBin = Math.ceil(1400 / binWidth);
  let fftPeakBin = minBin;
  let fftPeakVal = mag[minBin];
  for (let i = minBin + 1; i <= maxBin; i++) {
    if (mag[i] > fftPeakVal) { fftPeakVal = mag[i]; fftPeakBin = i; }
  }
  const fftFreq = fftPeakBin * binWidth; // rough estimate from FFT

  // Step 2: NSDF for precise pitch
  const minLag = Math.floor(sampleRate / 1400);
  const maxLag = Math.min(Math.ceil(sampleRate / 50), Math.floor(size / 2));

  const nsdf = new Float64Array(maxLag + 1);
  for (let tau = minLag; tau <= maxLag; tau++) {
    let acf = 0, m = 0;
    for (let j = 0; j < size - tau; j++) {
      acf += samples[j] * samples[j + tau];
      m += samples[j] * samples[j] + samples[j + tau] * samples[j + tau];
    }
    nsdf[tau] = m > 0 ? 2 * acf / m : 0;
  }

  // Find local maxima
  const peaks: { pos: number; val: number }[] = [];
  for (let i = minLag + 1; i < maxLag; i++) {
    if (nsdf[i] > 0 && nsdf[i] >= nsdf[i - 1] && nsdf[i] >= nsdf[i + 1]) {
      peaks.push({ pos: i, val: nsdf[i] });
    }
  }
  if (peaks.length === 0) return -1;

  const globalMax = Math.max(...peaks.map(p => p.val));
  if (globalMax < 0.5) return -1;

  // Find strongest peak and check for octave correction
  const best = peaks.reduce((a, b) => a.val > b.val ? a : b);

  // Sort by lag (shortest first)
  peaks.sort((a, b) => a.pos - b.pos);

  // Default: strongest peak
  let chosen = best;

  // Octave-only correction: if a shorter-lag peak is >= 90% of best
  // and best's lag is ~2x the shorter lag, prefer the shorter one.
  for (const p of peaks) {
    if (p.pos >= best.pos) break;
    if (p.val < best.val * 0.90) continue;
    const ratio = best.pos / p.pos;
    if (Math.abs(ratio - 2) < 0.05) {
      chosen = p;
      break;
    }
  }

  // Use FFT HPS to select among strong NSDF candidates.
  // HPS collapses harmonics onto the fundamental.
  {
    const hps = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) hps[i] = mag[i];
    for (let h = 2; h <= 6; h++) {
      for (let i = 0; i < Math.floor(n / 2 / h); i++) {
        hps[i] *= mag[i * h];
      }
    }
    let hpsPeakBin = minBin, hpsPeakVal = hps[minBin];
    for (let i = minBin + 1; i <= maxBin; i++) {
      if (hps[i] > hpsPeakVal) { hpsPeakVal = hps[i]; hpsPeakBin = i; }
    }
    const hpsFreq = hpsPeakBin * binWidth;

    // Among strong NSDF peaks, pick the one closest to HPS frequency
    const candidates = peaks.filter(p => p.val >= globalMax * 0.70);
    let bestErr = Infinity;
    for (const p of candidates) {
      const freq = sampleRate / p.pos;
      const err = Math.abs(freq - hpsFreq) / hpsFreq;
      if (err < bestErr) { bestErr = err; chosen = p; }
    }
  }

  let maxpos = chosen.pos;

  // Parabolic interpolation
  const a = nsdf[maxpos - 1], b = nsdf[maxpos], cc = nsdf[maxpos + 1];
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
let totalDetected = 0;
let totalWrong = 0;
const stringPrecisions: number[] = [];
const stringRecalls: number[] = [];

for (const [file, expected] of Object.entries(STRINGS)) {
  const { samples, sampleRate } = readWav(file);
  const windowSize = Math.floor((WINDOW_MS / 1000) * sampleRate);
  const hopSize = Math.floor((HOP_MS / 1000) * sampleRate);

  let frames = 0;
  let detected = 0;
  let correct = 0;
  let wrong = 0;
  const detections: number[] = [];

  for (let start = 0; start + windowSize <= samples.length; start += hopSize) {
    const window = samples.slice(start, start + windowSize);
    const freq = detectPitch(window, sampleRate);
    frames++;

    if (freq > 0) {
      detected++;
      detections.push(freq);
      const error = Math.abs(freq - expected) / expected;
      if (error < TOLERANCE) correct++;
      else wrong++;
    }
  }

  const precision = detected > 0 ? (correct / detected) * 100 : 0;
  const recall = (correct / frames) * 100;
  const median = detections.length > 0
    ? detections.sort((a, b) => a - b)[Math.floor(detections.length / 2)].toFixed(1)
    : "N/A";

  totalFrames += frames;
  totalCorrect += correct;
  totalDetected += detected;
  totalWrong += wrong;
  stringPrecisions.push(precision);
  stringRecalls.push(recall);

  console.log(`  ${file.padEnd(28)} expected: ${String(expected).padEnd(6)} | prec: ${String(precision.toFixed(0) + "%").padStart(4)} | recall: ${String(recall.toFixed(0) + "%").padStart(4)} | ${correct}/${detected}/${frames} (ok/det/total) | median: ${median} Hz`);
}

const precision = totalDetected > 0 ? (totalCorrect / totalDetected) * 100 : 0;
const recall = (totalCorrect / totalFrames) * 100;
const avgPrecision = stringPrecisions.reduce((a, b) => a + b, 0) / stringPrecisions.length;
const avgRecall = stringRecalls.reduce((a, b) => a + b, 0) / stringRecalls.length;

console.log("\n" + "=".repeat(70));
console.log(`  Precision: ${precision.toFixed(1)}%  (${totalCorrect}/${totalDetected} detections correct)`);
console.log(`  Recall:    ${recall.toFixed(1)}%  (${totalCorrect}/${totalFrames} total frames correct)`);
console.log(`  Wrong:     ${totalWrong} frames detected but incorrect`);
console.log(`  Avg string precision: ${avgPrecision.toFixed(1)}%  |  Avg string recall: ${avgRecall.toFixed(1)}%`);
