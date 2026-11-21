#!/usr/bin/env node
// Detects stairwells next to the walkable floor and writes them into floor.json as `stairs`.
// Rays are cast straight down from 2 m above the floor on a 5 cm grid. Cells whose first
// hit is clearly above or below the floor are grouped; a group counts as stairs when it is
// large (≥ 3 m²) and spans a real height range (≥ 0.6 m), which rules out furniture.
// Each stairwell gets a footprint rectangle and an entry snapped onto the nearest wall.
// Usage: node scripts/detect-stairs.mjs <scan.glb> <floor.json>
import fs from 'node:fs';
import * as THREE from 'three';
import { loadScan, makeTransforms } from './lib/scan.mjs';

const [, , SCAN, FLOOR] = process.argv;
const floor = JSON.parse(fs.readFileSync(FLOOR, 'utf8'));
const meshes = await loadScan(SCAN);
const { toScan } = makeTransforms(floor);
const ray = new THREE.Raycaster();
ray.firstHitOnly = true;
const down = new THREE.Vector3(0, -1, 0);

const STEP = 0.05, MARGIN = 5, START = 2.0;
const FLOOR_EPS = 0.08, STEP_EPS = 0.12, STEP_CORE = 0.3, MIN_AREA = 3, MIN_RANGE = 0.6;
const ENTRY_WIDTH = 1.6;

const b = floor.bounds;
const x0 = b.minX - MARGIN, z0 = b.minZ - MARGIN;
const W = Math.ceil((b.maxX - b.minX + 2 * MARGIN) / STEP), H = Math.ceil((b.maxZ - b.minZ + 2 * MARGIN) / STEP);
const hgt = new Float32Array(W * H).fill(NaN);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  ray.set(toScan([x0 + (i + 0.5) * STEP, z0 + (j + 0.5) * STEP], START), down);
  ray.far = 7;
  const hit = ray.intersectObjects(meshes, false)[0];
  if (hit) hgt[j * W + i] = START - hit.distance;
}

// group off-floor cells (8-connected)
const off = (k) => !Number.isNaN(hgt[k]) && (hgt[k] > STEP_EPS || hgt[k] < -STEP_EPS);
const isFloor = (k) => !Number.isNaN(hgt[k]) && Math.abs(hgt[k]) < FLOOR_EPS;
const label = new Int32Array(W * H).fill(-1);
const groups = [];
for (let k = 0; k < W * H; k++) {
  if (!off(k) || label[k] >= 0) continue;
  const cells = [], stack = [k];
  label[k] = groups.length;
  while (stack.length) {
    const c = stack.pop();
    cells.push(c);
    const ci = c % W, cj = (c / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni;
      if (off(n) && label[n] < 0) { label[n] = groups.length; stack.push(n); }
    }
  }
  groups.push(cells);
}

/** Largest 4-connected block among the given cells. */
function largestBlock(cellList) {
  const set = new Set(cellList), seen = new Set();
  let best = [];
  for (const c0 of cellList) {
    if (seen.has(c0)) continue;
    const block = [], stack = [c0];
    seen.add(c0);
    while (stack.length) {
      const c = stack.pop();
      block.push(c);
      for (const n of [c + 1, c - 1, c + W, c - W]) if (set.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
    if (block.length > best.length) best = block;
  }
  return best;
}
const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
const r2 = (v) => Math.round(v * 100) / 100;
const walls = floor.walls;
const stairs = [];
for (const cells of groups) {
  const area = cells.length * STEP * STEP;
  if (area < MIN_AREA) continue;
  const hs = cells.map((c) => hgt[c]).sort((a, b) => a - b);
  const range = pct(hs, 0.95) - pct(hs, 0.05);
  if (range < MIN_RANGE) continue;
  // footprint: robust bounding box (2nd–98th percentile) of the clearly stepped cells,
  // so low edges and plants at the stairwell entrance don't stretch it into the lobby
  const steps = largestBlock(cells.filter((c) => Math.abs(hgt[c]) > STEP_CORE));
  const xs = steps.map((c) => x0 + ((c % W) + 0.5) * STEP).sort((a, b) => a - b);
  const zs = steps.map((c) => z0 + (((c / W) | 0) + 0.5) * STEP).sort((a, b) => a - b);
  const [minX, maxX, minZ, maxZ] = [pct(xs, 0.02), pct(xs, 0.98), pct(zs, 0.02), pct(zs, 0.98)];
  // entry: cells of the group touching walkable floor
  const touch = cells.filter((c) => {
    const ci = c % W, cj = (c / W) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = ci + di, nj = cj + dj;
      if (ni >= 0 && nj >= 0 && ni < W && nj < H && isFloor(nj * W + ni)) return true;
    }
    return false;
  });
  const src = touch.length ? touch : cells;
  const ex = src.reduce((s, c) => s + x0 + ((c % W) + 0.5) * STEP, 0) / src.length;
  const ez = src.reduce((s, c) => s + z0 + (((c / W) | 0) + 0.5) * STEP, 0) / src.length;
  // snap the entry onto the nearest wall segment (that becomes the opening in the wall)
  let best = null;
  for (const line of walls) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], c = line[i];
    const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1e-9, L = Math.sqrt(L2);
    const u = Math.max(0, Math.min(1, ((ex - a[0]) * dx + (ez - a[1]) * dz) / L2));
    const q = [a[0] + dx * u, a[1] + dz * u], d = Math.hypot(q[0] - ex, q[1] - ez);
    if (!best || d < best.d) best = { d, q, t: [dx / L, dz / L], L };
  }
  // normal pointing towards the stairs (away from the floor)
  const fcx = (minX + maxX) / 2, fcz = (minZ + maxZ) / 2;
  let n = [-best.t[1], best.t[0]];
  if ((fcx - best.q[0]) * n[0] + (fcz - best.q[1]) * n[1] < 0) n = [-n[0], -n[1]];
  stairs.push({
    id: `S${stairs.length + 1}`,
    footprint: [[r2(minX), r2(minZ)], [r2(maxX), r2(minZ)], [r2(maxX), r2(maxZ)], [r2(minX), r2(maxZ)]],
    entry: { center: best.q.map(r2), tangent: best.t.map(r2), normal: n.map(r2), width: Math.min(ENTRY_WIDTH, r2(best.L)) },
    up: hs.some((h) => h > 0.5),
    down: hs.some((h) => h < -0.5),
    area: r2(area),
  });
}
console.log(`stairs: ${stairs.length}`);
for (const s of stairs) console.log(`  ${s.id} area=${s.area} m² up=${s.up} down=${s.down} entry=${s.entry.center} footprint=${JSON.stringify(s.footprint)}`);
floor.stairs = stairs;
fs.writeFileSync(FLOOR, JSON.stringify(floor));
