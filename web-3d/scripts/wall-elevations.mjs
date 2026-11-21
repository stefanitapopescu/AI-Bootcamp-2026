#!/usr/bin/env node
// Debug tool: "unrolls" every wall of floor.json into elevation strips (scan texture color
// + recess depth), so doors and openings can be inspected visually.
// Usage: node scripts/wall-elevations.mjs <scan.glb> <floor.json> <out.png>
import fs from 'node:fs';
import { loadScan, writePng, sampleWallElevations } from './lib/scan.mjs';

const [, , SCAN, FLOOR, OUT] = process.argv;
const floor = JSON.parse(fs.readFileSync(FLOOR, 'utf8'));
const meshes = await loadScan(SCAN);
const { cols, rows, step: STEP } = sampleWallElevations(floor, meshes);
console.log(`columns: ${cols.length} (${(cols.length * STEP).toFixed(1)} m of wall)`);

// layout: wrap into bands of BAND columns; each band = color strip + depth strip + gap
const BAND = 400, PX = 2;
const bands = Math.ceil(cols.length / BAND);
const PLOT = 40; // px for signal plot
const bandH = rows * 2 + 8 + PLOT;
const W = BAND * PX, H = bands * bandH * PX;
const img = new Uint8Array(W * H * 3).fill(255);
const put = (x, y, c) => {
  for (let a = 0; a < PX; a++) for (let b = 0; b < PX; b++) img.set(c, ((y * PX + b) * W + x * PX + a) * 3);
};
const depthColor = (d) => {
  if (d === null) return [255, 0, 255];
  // -0.3 (protruding, blue) .. 0 (white) .. +0.6 (recessed, red)
  const t = Math.max(-1, Math.min(1, d >= 0 ? d / 0.6 : d / 0.3));
  return t >= 0 ? [255, 255 - 200 * t, 255 - 200 * t] : [255 + 200 * t, 255 + 200 * t, 255];
};
cols.forEach((col, i) => {
  const bx = i % BAND, by = Math.floor(i / BAND) * bandH;
  for (let r = 0; r < rows; r++) {
    const y = rows - 1 - r; // floor at the bottom
    put(bx, by + y, col.color[r] ?? [255, 0, 255]);
    put(bx, by + rows + 2 + y, depthColor(col.depth[r]));
  }
  // tick every meter + segment boundaries
  if (Math.abs(col.s % 1) < STEP / 2) for (let k = 0; k < 3; k++) put(bx, by + rows * 2 + 3 + k, [0, 0, 0]);
  if (i > 0 && cols[i - 1].seg !== col.seg) for (let k = 0; k < 2; k++) put(bx, by + rows * 2 + 6 + k, [255, 0, 0]);
});
// signals: recess below lintel height vs above (green), vs neighbouring wall (blue)
const med = (a) => { const v = a.filter((x) => x !== null).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : null; };
const band = (col, h0, h1) => med(col.depth.slice(Math.floor(h0 / STEP), Math.ceil(h1 / STEP)));
const dl = cols.map((c) => band(c, 0.5, 1.8)), dh = cols.map((c) => band(c, 2.15, 2.45));
const win = Math.round(1.5 / STEP), core = Math.round(0.6 / STEP);
const ref = cols.map((_, i) => med(dl.filter((_, j) => Math.abs(j - i) <= win && Math.abs(j - i) > core)));
cols.forEach((_, i) => {
  const bx = i % BAND, by = Math.floor(i / BAND) * bandH + rows * 2 + 8;
  const plot = (v, c) => { if (v === null || Number.isNaN(v)) return; const y = Math.round(PLOT - 1 - Math.max(0, Math.min(1, (v + 0.05) / 0.35)) * (PLOT - 1)); put(bx, by + y, c); };
  put(bx, by + Math.round(PLOT - 1 - (0.05 / 0.35) * (PLOT - 1)), [200, 200, 200]); // zero line
  plot(dl[i] !== null && dh[i] !== null ? dl[i] - dh[i] : null, [0, 160, 0]);
  plot(dl[i] !== null && ref[i] !== null ? dl[i] - ref[i] : null, [0, 0, 220]);
});
writePng(OUT, W, H, img);
console.log(`wrote ${OUT} (${W}x${H}), ${bands} bands of ${(BAND * STEP).toFixed(0)} m`);
