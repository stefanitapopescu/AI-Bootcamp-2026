#!/usr/bin/env node
// Detects doors along the hallway walls of floor.json from the 3D scan and writes them
// back into floor.json as `doors`.
// A door = two vertical frame edges 0.75–2.1 m apart rising from the floor to ~2 m,
// a horizontal top edge at ~1.9–2.3 m between them, and a fairly smooth leaf inside.
// Edges come from both texture color and depth (recess) discontinuities.
// Usage: node scripts/detect-doors.mjs <scan.glb> <floor.json> [debug.png]
import fs from 'node:fs';
import { loadScan, sampleWallElevations, writePng } from './lib/scan.mjs';

const [, , SCAN, FLOOR, DEBUG] = process.argv;
const floor = JSON.parse(fs.readFileSync(FLOOR, 'utf8'));
const meshes = await loadScan(SCAN);
const { cols, rows, step } = sampleWallElevations(floor, meshes);
const N = cols.length;

const LUM_T = 22; // luminance jump that counts as an edge (0–255)
const DEPTH_T = 0.03; // depth jump that counts as an edge (m)
const W_MIN = 0.6, W_MAX = 2.0; // door width range (m)
const SCORE_MIN = 0.42;

const lum = cols.map((c) => c.color.map((rgb) => (rgb ? 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] : null)));
const dep = cols.map((c) => c.depth);
const rowOf = (h) => Math.min(rows - 1, Math.max(0, Math.round(h / step - 0.5)));
const R_LO = rowOf(0.3), R_HI = rowOf(1.85), T_LO = rowOf(1.9), T_HI = rowOf(2.3);
const at = (g, c, r) => (c >= 0 && c < N && r >= 0 && r < rows ? g[c][r] : null);
const jump = (a, b, t) => a !== null && b !== null && Math.abs(a - b) > t;

// vertical edge evidence per column: fraction of rows (0.3–1.85 m) with a horizontal discontinuity
// or a thin dark frame line
const R_MID = rowOf(0.9);
const edgeFrac = (c, r0, r1) => {
  let hits = 0;
  for (let r = r0; r <= r1; r++) {
    const L = at(lum, c, r);
    const edge =
      jump(at(lum, c - 1, r), at(lum, c + 1, r), LUM_T) ||
      jump(at(dep, c - 1, r), at(dep, c + 1, r), DEPTH_T) ||
      (L !== null && at(lum, c - 3, r) !== null && at(lum, c + 3, r) !== null && L < Math.min(at(lum, c - 3, r), at(lum, c + 3, r)) - 15);
    if (edge) hits++;
  }
  return hits / (r1 - r0 + 1);
};
const V = new Float32Array(N), Vlow = new Float32Array(N);
for (let c = 0; c < N; c++) {
  V[c] = edgeFrac(c, R_LO, R_HI);
  Vlow[c] = edgeFrac(c, rowOf(0.1), R_MID); // door frames reach the floor, window frames don't
}
const VlowMax = (c) => Math.max(Vlow[c - 1] ?? 0, Vlow[c], Vlow[c + 1] ?? 0);
const Vmax = (c) => Math.max(V[c - 1] ?? 0, V[c], V[c + 1] ?? 0);

// horizontal top edge per column: strongest vertical discontinuity in 1.9–2.3 m (row kept)
const T = new Uint8Array(N), Trow = new Int16Array(N);
for (let c = 0; c < N; c++) {
  let best = 0;
  for (let r = T_LO; r <= T_HI; r++) {
    const a = at(lum, c, r - 1), b = at(lum, c, r + 1), da = at(dep, c, r - 1), db = at(dep, c, r + 1);
    const g = Math.max(a !== null && b !== null ? Math.abs(a - b) / LUM_T : 0, da !== null && db !== null ? Math.abs(da - db) / DEPTH_T : 0);
    if (g > 1 && g > best) { best = g; T[c] = 1; Trow[c] = r; }
  }
}

// a door must not be an opening: the leaf must actually be scanned (few misses inside)
const missFrac = (c) => {
  let m = 0;
  for (let r = R_LO; r <= R_HI; r++) if (dep[c][r] === null) m++;
  return m / (R_HI - R_LO + 1);
};

const cands = [];
const wMinC = Math.round(W_MIN / step), wMaxC = Math.round(W_MAX / step);
for (let i = 1; i < N - wMinC; i++) {
  for (let w = wMinC; w <= wMaxC && i + w < N - 1; w++) {
    const j = i + w;
    if (cols[j].line !== cols[i].line || cols[j].seg !== cols[i].seg) break; // doors don't wrap corners
    const edges = Math.min(Vmax(i), Vmax(j));
    if (edges < 0.35 || Math.min(VlowMax(i), VlowMax(j)) < 0.2) continue;
    let top = 0, inner = 0, miss = 0, n = 0;
    const tops = [];
    for (let c = i + 2; c <= j - 2; c++) { top += T[c]; inner += V[c]; miss += missFrac(c); n++; if (T[c]) tops.push(Trow[c]); }
    top /= n; inner /= n; miss /= n;
    if (miss > 0.3) continue;
    // the top edge should sit at one consistent height across the door
    tops.sort((a, b) => a - b);
    const mode = tops.length ? tops[tops.length >> 1] : -99;
    const topConsistent = tops.filter((t) => Math.abs(t - mode) <= 1).length / n;
    // the leaf should be smooth: low luminance spread inside (windows, plants, boards are busy)
    const vals = [];
    let colorful = 0;
    for (let c = i + 2; c <= j - 2; c++) for (let r = R_LO; r <= R_HI; r++) {
      const rgb = cols[c].color[r];
      if (!rgb) continue;
      vals.push(lum[c][r]);
      if (Math.max(...rgb) - Math.min(...rgb) > 45) colorful++;
    }
    if (colorful / (vals.length || 1) > 0.2) continue; // sky through windows, plants, posters
    const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1));
    if (topConsistent < 0.5) continue; // no lintel line -> plain wall panel or opening
    const score = 0.5 * edges + 0.5 * topConsistent - 0.6 * inner - Math.max(0, std - 18) / 40;
    if (score >= SCORE_MIN) cands.push({ i, j, score, edges, top: topConsistent, inner, std });
  }
}
// non-maximum suppression: best-scoring first, no overlaps
cands.sort((a, b) => b.score - a.score);
const taken = new Uint8Array(N);
const picked = [];
for (const c of cands) {
  let free = true;
  for (let k = c.i; k <= c.j && free; k++) if (taken[k]) free = false;
  if (!free) continue;
  for (let k = c.i; k <= c.j; k++) taken[k] = 1;
  picked.push(c);
}
picked.sort((a, b) => a.i - b.i);
// two touching leaves = one double door
for (let k = 0; k + 1 < picked.length; k++) {
  const a = picked[k], b = picked[k + 1];
  if (b.i - a.j <= 5 && cols[a.i].seg === cols[b.j].seg && cols[a.i].line === cols[b.j].line && (b.j - a.i) * step <= 2.2) {
    picked.splice(k, 2, { ...a, j: b.j, score: Math.max(a.score, b.score) });
    k--;
  }
}

const r2 = (v) => Math.round(v * 100) / 100;
const doors = picked.map((d, k) => {
  const a = cols[d.i], b = cols[d.j];
  const center = [(a.p[0] + b.p[0]) / 2, (a.p[1] + b.p[1]) / 2];
  return {
    id: `D${String(k + 1).padStart(2, '0')}`,
    center: center.map(r2),
    width: r2((d.j - d.i) * step),
    // unit vector along the wall, and the outward normal (points into the room behind the door)
    tangent: a.t.map(r2),
    normal: a.n.map(r2),
    kind: (d.j - d.i) * step > 1.45 ? 'double' : 'single',
    score: r2(d.score),
  };
});
console.log(`doors: ${doors.length}`);
picked.forEach((p, k) => console.log(`  ${doors[k].id} band${Math.floor(p.i / 330)} x=${(p.i % 330) * 3}-${(p.j % 330) * 3} w=${doors[k].width.toFixed(2)} score=${p.score.toFixed(2)} edges=${p.edges.toFixed(2)} top=${p.top.toFixed(2)} inner=${p.inner.toFixed(2)} std=${p.std.toFixed(0)}`));

// ---------- apply the manual classification (scripts/door-labels.json) ----------
// Each label claims the nearest detected door within 0.6 m; its reviewed spec wins
// (e.g. corrected widths). Labelled doors that were not detected are added from the spec.
const LABELS = new URL('./door-labels.json', import.meta.url);
if (fs.existsSync(LABELS)) {
  const { labels } = JSON.parse(fs.readFileSync(LABELS, 'utf8'));
  for (const d of doors) d.type = 'other';
  for (const l of labels) {
    let best = null;
    for (const d of doors) {
      const dist = Math.hypot(d.center[0] - l.center[0], d.center[1] - l.center[1]);
      if (dist < 0.6 && (!best || dist < best.dist)) best = { d, dist };
    }
    const spec = { center: l.center, width: l.width, tangent: l.tangent, normal: l.normal, kind: l.kind, type: l.type, ...(l.name ? { name: l.name } : {}) };
    if (best) Object.assign(best.d, spec);
    else doors.push({ id: `D${String(doors.length + 1).padStart(2, '0')}`, score: 1, ...spec });
  }
  const count = (t) => doors.filter((d) => d.type === t).length;
  console.log(`classified: lab ${count('lab')}, toilet ${count('toilet')}, elevator ${count('elevator')}, other ${count('other')}`);
}

floor.doors = doors;
fs.writeFileSync(FLOOR, JSON.stringify(floor));

// ---------- debug image: elevation strips with detections ----------
if (DEBUG) {
  const BAND = 330, PX = 3, bandH = rows + 14;
  const bands = Math.ceil(N / BAND), Wd = BAND * PX, Hd = bands * bandH * PX;
  const img = new Uint8Array(Wd * Hd * 3).fill(255);
  const put = (x, y, c) => { for (let a = 0; a < PX; a++) for (let b = 0; b < PX; b++) img.set(c, ((y * PX + b) * Wd + x * PX + a) * 3); };
  for (let c = 0; c < N; c++) {
    const bx = c % BAND, by = Math.floor(c / BAND) * bandH;
    for (let r = 0; r < rows; r++) put(bx, by + rows - 1 - r, cols[c].color[r] ?? [255, 0, 255]);
    const v = Math.round(V[c] * 6);
    for (let k = 0; k < v; k++) put(bx, by + rows + 7 - k, [120, 120, 120]);
  }
  picked.forEach((d, k) => {
    const colr = k % 2 ? [230, 120, 0] : [0, 170, 60];
    for (let c = d.i; c <= d.j; c++) {
      const bx = c % BAND, by = Math.floor(c / BAND) * bandH;
      for (let q = 0; q < 4; q++) put(bx, by + rows + 9 + q, colr);
      if (c === d.i || c === d.j) for (let r = 0; r < rows; r++) if (r % 2 === 0) put(bx, by + rows - 1 - r, colr);
    }
  });
  writePng(DEBUG, Wd, Hd, img);
  console.log(`debug: ${DEBUG}`);
}
