function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
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
    const half = len >> 1, angle = -2 * Math.PI / len;
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
        const nr = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nr;
      }
    }
  }
}

export function detectPitch(samples: Float32Array, sampleRate: number): number {
  const size = samples.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += samples[i] * samples[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.010) return -1;

  let n = 1;
  while (n < size) n <<= 1;
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 0; i < size; i++)
    re[i] = samples[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
  fft(re, im);
  const mag = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = re[i] * re[i] + im[i] * im[i];

  const binWidth = sampleRate / n;
  const minBin = Math.floor(50 / binWidth),
    maxBin = Math.ceil(1400 / binWidth);
  const minLag = Math.floor(sampleRate / 1400);
  const maxLag = Math.min(Math.ceil(sampleRate / 50), Math.floor(size / 2));

  const nsdf = new Float32Array(maxLag + 1);
  for (let tau = minLag; tau <= maxLag; tau++) {
    let acf = 0, m = 0;
    for (let j = 0; j < size - tau; j++) {
      acf += samples[j] * samples[j + tau];
      m += samples[j] * samples[j] + samples[j + tau] * samples[j + tau];
    }
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }

  const peaks: { pos: number; val: number }[] = [];
  for (let i = minLag + 1; i < maxLag; i++) {
    if (nsdf[i] > 0 && nsdf[i] >= nsdf[i - 1] && nsdf[i] >= nsdf[i + 1])
      peaks.push({ pos: i, val: nsdf[i] });
  }
  if (peaks.length === 0) return -1;
  const globalMax = Math.max(...peaks.map((p) => p.val));
  if (globalMax < 0.5) return -1;

  const best = peaks.reduce((a, b) => (a.val > b.val ? a : b));
  peaks.sort((a, b) => a.pos - b.pos);
  let chosen = best;
  for (const p of peaks) {
    if (p.pos >= best.pos) break;
    if (p.val < best.val * 0.9) continue;
    if (Math.abs(best.pos / p.pos - 2) < 0.05) { chosen = p; break; }
  }

  {
    const hps = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) hps[i] = mag[i];
    for (let h = 2; h <= 6; h++)
      for (let i = 0; i < Math.floor(n / 2 / h); i++) hps[i] *= mag[i * h];
    let hpsBin = minBin, hpsVal = hps[minBin];
    for (let i = minBin + 1; i <= maxBin; i++) {
      if (hps[i] > hpsVal) { hpsVal = hps[i]; hpsBin = i; }
    }
    const hpsFreq = hpsBin * binWidth;
    const candidates = peaks.filter((p) => p.val >= globalMax * 0.7);
    let bestErr = Infinity;
    for (const p of candidates) {
      const err = Math.abs(sampleRate / p.pos - hpsFreq) / hpsFreq;
      if (err < bestErr) { bestErr = err; chosen = p; }
    }
  }

  const mp = chosen.pos;
  if (mp < 1 || mp >= maxLag) return -1;
  const a = nsdf[mp - 1], b = nsdf[mp], cc = nsdf[mp + 1];
  const denom = a - 2 * b + cc;
  if (denom === 0) return sampleRate / mp;
  return sampleRate / (mp + (a - cc) / (2 * denom));
}
