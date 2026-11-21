#!/usr/bin/env node
// Debug tool: renders views of the scan for manual inspection.
//   <out>/topdown-color.png   floor texture seen from above (rays cast down from 2 m)
//   <out>/topdown-height.png  height of the first surface hit (stairs show as gradients)
//   <out>/doors.png           close-up of every detected door (row-major, D01 first)
// Usage: node scripts/inspect-scan.mjs <scan.glb> <floor.json> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { loadScan, sampleColor, makeTransforms, writePng } from './lib/scan.mjs';

const [, , SCAN, FLOOR, OUT] = process.argv;
fs.mkdirSync(OUT, { recursive: true });
const floor = JSON.parse(fs.readFileSync(FLOOR, 'utf8'));
const meshes = await loadScan(SCAN);
const { toScan, dirToScan } = makeTransforms(floor);
const ray = new THREE.Raycaster();
ray.firstHitOnly = true;
const cast = (o, d, far) => { ray.set(o, d); ray.far = far; return ray.intersectObjects(meshes, false)[0]; };

// ---------- top-down views (app coordinates, with margin to include stairwells) ----------
const STEP = 0.03, M = 4;
const b = floor.bounds;
const W = Math.ceil((b.maxX - b.minX + 2 * M) / STEP), H = Math.ceil((b.maxZ - b.minZ + 2 * M) / STEP);
const color = new Uint8Array(W * H * 3), height = new Uint8Array(W * H * 3);
const down = new THREE.Vector3(0, -1, 0);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = b.minX - M + (i + 0.5) * STEP, z = b.minZ - M + (j + 0.5) * STEP;
  const hit = cast(toScan([x, z], 2.0), down, 6);
  const k = (j * W + i) * 3;
  if (!hit) { color.set([255, 0, 255], k); height.set([255, 0, 255], k); continue; }
  color.set(sampleColor(hit), k);
  const h = 2.0 - hit.distance; // height above floor
  // blue below floor, white at floor, red above (stairs up), clamp ±2 m
  const t = Math.max(-1, Math.min(1, h / 2));
  height.set(t >= 0 ? [255, 255 - 230 * t, 255 - 230 * t] : [255 + 230 * t, 255 + 230 * t, 255], k);
}
writePng(path.join(OUT, 'topdown-color.png'), W, H, color);
writePng(path.join(OUT, 'topdown-height.png'), W, H, height);
console.log(`top-down ${W}x${H} @ ${STEP} m, origin (${(b.minX - M).toFixed(2)}, ${(b.minZ - M).toFixed(2)})`);

// ---------- door close-ups ----------
const DS = 0.008, PAD = 0.6, DH = 2.4, COLS = 4;
const doors = floor.doors ?? [];
const cw = Math.ceil((2.2 + 2 * PAD) / DS), ch = Math.ceil(DH / DS);
const rowsN = Math.ceil(doors.length / COLS);
const SW = COLS * (cw + 6), SH = rowsN * (ch + 6);
const sheet = new Uint8Array(SW * SH * 3).fill(255);
doors.forEach((d, n) => {
  const ox = (n % COLS) * (cw + 6), oy = Math.floor(n / COLS) * (ch + 6);
  const half = d.width / 2 + PAD;
  const dir = dirToScan(d.normal);
  for (let r = 0; r < ch; r++) for (let c = 0; c < cw; c++) {
    const s = -1.1 - PAD + c * DS;
    if (Math.abs(s) > half) continue;
    const p = [d.center[0] + d.tangent[0] * s - d.normal[0] * 0.6, d.center[1] + d.tangent[1] * s - d.normal[1] * 0.6];
    const hit = cast(toScan(p, DH - r * DS), dir, 2.5);
    sheet.set(hit ? sampleColor(hit) : [255, 0, 255], ((oy + r) * SW + ox + c) * 3);
  }
  // door extent markers (green ticks at the top)
  for (const e of [-d.width / 2, d.width / 2]) {
    const c = Math.round((e + 1.1 + PAD) / DS);
    for (let r = 0; r < 12; r++) sheet.set([0, 200, 60], ((oy + r) * SW + ox + c) * 3);
  }
});
writePng(path.join(OUT, 'doors.png'), SW, SH, sheet);
console.log(`doors sheet ${SW}x${SH}: ${doors.map((d) => d.id).join(' ')}`);

// ---------- sign close-ups (1.2–2.15 m, ~3.5 mm per pixel): <out>/signs/<doorId>.png ----------
const SS = 0.0035, SH0 = 1.2, SH1 = 2.15;
fs.mkdirSync(path.join(OUT, 'signs'), { recursive: true });
const signImgs = [];
for (const d of doors) {
  const half = d.width / 2 + 0.55;
  const w = Math.ceil((2 * half) / SS), h = Math.ceil((SH1 - SH0) / SS);
  const img = new Uint8Array(w * h * 3);
  const dir = dirToScan(d.normal);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const s = -half + c * SS;
    const p = [d.center[0] + d.tangent[0] * s - d.normal[0] * 0.6, d.center[1] + d.tangent[1] * s - d.normal[1] * 0.6];
    const hit = cast(toScan(p, SH1 - r * SS), dir, 2.5);
    img.set(hit ? sampleColor(hit) : [255, 0, 255], (r * w + c) * 3);
  }
  writePng(path.join(OUT, 'signs', `${d.id}.png`), w, h, img);
  signImgs.push({ w, h, img });
}
// all sign crops in one sheet, 2 per row, row-major from D01
{
  const cols = 2, cellW = Math.max(...signImgs.map((s) => s.w)) + 8, cellH = Math.max(...signImgs.map((s) => s.h)) + 8;
  const SWs = cols * cellW, SHs = Math.ceil(signImgs.length / cols) * cellH;
  const out = new Uint8Array(SWs * SHs * 3).fill(255);
  signImgs.forEach((s, n) => {
    const ox = (n % cols) * cellW, oy = Math.floor(n / cols) * cellH;
    for (let r = 0; r < s.h; r++) out.set(s.img.subarray(r * s.w * 3, (r + 1) * s.w * 3), ((oy + r) * SWs + ox) * 3);
  });
  writePng(path.join(OUT, 'signs.png'), SWs, SHs, out);
}
console.log(`sign close-ups in ${path.join(OUT, 'signs')}`);
