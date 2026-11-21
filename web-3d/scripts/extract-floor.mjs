#!/usr/bin/env node
// Extracts a minimal floor plan (walkable floor polygons + wall polylines)
// from a 3D scan GLB. Usage: node scripts/extract-floor.mjs <in.glb> <out.json> [debug.png]
import { NodeIO } from '@gltf-transform/core';
import fs from 'node:fs';
import zlib from 'node:zlib';

const [, , IN, OUT, DEBUG_PNG] = process.argv;
if (!IN || !OUT) {
  console.error('usage: extract-floor.mjs <in.glb> <out.json> [debug.png]');
  process.exit(1);
}

const CELL = 0.1; // grid resolution in meters
const SLICE_HEIGHTS = [0.9, 1.2, 1.5]; // above floor, for wall detection
const FLOOR_TOL = 0.25; // vertical tolerance for floor triangles
const FLOOR_SIMPLIFY = 0.25; // outline simplification tolerance (m)
const WALL_EVIDENCE = 0.35; // max distance from outline to a scanned wall hit (m)
const MIN_OPENING = 1.6; // outline stretches without wall evidence longer than this stay open (m)

// ---------- load triangles in world space ----------
const doc = await new NodeIO().read(IN);
const tris = []; // [ax,ay,az,bx,by,bz,cx,cy,cz]
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = node.getWorldMatrix();
  const tf = (x, y, z) => [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const idx = prim.getIndices();
    const n = idx ? idx.getCount() : pos.getCount();
    const v = [0, 0, 0];
    for (let i = 0; i + 2 < n; i += 3) {
      const t = [];
      for (let k = 0; k < 3; k++) {
        pos.getElement(idx ? idx.getScalar(i + k) : i + k, v);
        t.push(...tf(v[0], v[1], v[2]));
      }
      tris.push(t);
    }
  }
}
console.log(`triangles: ${tris.length}`);

const normalOf = (t) => {
  const ux = t[3] - t[0], uy = t[4] - t[1], uz = t[5] - t[2];
  const vx = t[6] - t[0], vy = t[7] - t[1], vz = t[8] - t[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const L = Math.hypot(nx, ny, nz) || 1e-12;
  return { nx: nx / L, ny: ny / L, nz: nz / L, area: L / 2 };
};

// ---------- floor height ----------
const hist = new Map();
for (const t of tris) {
  const { ny, area } = normalOf(t);
  if (Math.abs(ny) < 0.9) continue;
  const y = (t[1] + t[4] + t[7]) / 3;
  const b = Math.round(y / 0.05);
  hist.set(b, (hist.get(b) || 0) + area);
}
// Floor = the lowest bin holding at least 40% of the largest bin's area
const maxArea = Math.max(...hist.values());
const floorBin = Math.min(...[...hist].filter(([, a]) => a >= 0.4 * maxArea).map(([b]) => b));
let sw = 0, sy = 0;
for (const t of tris) {
  const { ny, area } = normalOf(t);
  const y = (t[1] + t[4] + t[7]) / 3;
  if (Math.abs(ny) >= 0.9 && Math.abs(y - floorBin * 0.05) < 0.1) { sw += area; sy += area * y; }
}
const floorY = sy / sw;
console.log(`floor y: ${floorY.toFixed(3)} (area ${sw.toFixed(1)} m²)`);

// ---------- grid ----------
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (const t of tris) for (let k = 0; k < 9; k += 3) {
  const y = t[k + 1] - floorY;
  if (y < -0.5 || y > 3.5) continue;
  minX = Math.min(minX, t[k]); maxX = Math.max(maxX, t[k]);
  minZ = Math.min(minZ, t[k + 2]); maxZ = Math.max(maxZ, t[k + 2]);
}
minX -= 0.5; minZ -= 0.5; maxX += 0.5; maxZ += 0.5;
const W = Math.ceil((maxX - minX) / CELL), H = Math.ceil((maxZ - minZ) / CELL);
const gi = (x, z) => [Math.floor((x - minX) / CELL), Math.floor((z - minZ) / CELL)];
const newGrid = () => new Uint8Array(W * H);
console.log(`grid ${W}x${H} @ ${CELL}m`);

function line(g, x0, z0, x1, z1) {
  const [a, b] = gi(x0, z0), [c, d] = gi(x1, z1);
  const steps = Math.max(Math.abs(c - a), Math.abs(d - b), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(a + ((c - a) * s) / steps), z = Math.round(b + ((d - b) * s) / steps);
    if (x >= 0 && z >= 0 && x < W && z < H) g[z * W + x] = 1;
  }
}

// Walls: slice triangles at several heights above the floor
const wallG = newGrid();
for (const h of SLICE_HEIGHTS) {
  const Y = floorY + h;
  for (const t of tris) {
    const pts = [];
    for (const [i, j] of [[0, 3], [3, 6], [6, 0]]) {
      const ya = t[i + 1] - Y, yb = t[j + 1] - Y;
      if ((ya < 0) !== (yb < 0)) {
        const f = ya / (ya - yb);
        pts.push([t[i] + f * (t[j] - t[i]), t[i + 2] + f * (t[j + 2] - t[i + 2])]);
      }
    }
    if (pts.length === 2) line(wallG, pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
  }
}

// Floor: rasterize near-horizontal triangles at floor height
const floorG = newGrid();
for (const t of tris) {
  const { ny } = normalOf(t);
  if (Math.abs(ny) < 0.7) continue;
  const ys = [t[1], t[4], t[7]];
  if (ys.some((y) => Math.abs(y - floorY) > FLOOR_TOL)) continue;
  const [x0, z0] = gi(Math.min(t[0], t[3], t[6]), Math.min(t[2], t[5], t[8]));
  const [x1, z1] = gi(Math.max(t[0], t[3], t[6]), Math.max(t[2], t[5], t[8]));
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const px = minX + (x + 0.5) * CELL, pz = minZ + (z + 0.5) * CELL;
    if (inTri(px, pz, t) || (x0 === x1 && z0 === z1)) floorG[z * W + x] = 1;
  }
}
function inTri(px, pz, t) {
  const s = (ax, az, bx, bz) => (px - bx) * (az - bz) - (ax - bx) * (pz - bz);
  const d1 = s(t[0], t[2], t[3], t[5]), d2 = s(t[3], t[5], t[6], t[8]), d3 = s(t[6], t[8], t[0], t[2]);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// ---------- morphology ----------
function morph(g, r, dilate) {
  const out = newGrid();
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    let hit = !dilate;
    for (let dz = -r; dz <= r && hit !== dilate; dz++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > r * r) continue;
      const X = x + dx, Z = z + dz;
      const v = X >= 0 && Z >= 0 && X < W && Z < H ? g[Z * W + X] : 0;
      if (dilate && v) { hit = true; break; }
      if (!dilate && !v) { hit = false; break; }
    }
    out[z * W + x] = hit ? 1 : 0;
  }
  return out;
}
const close = (g, r) => morph(morph(g, r, true), r, false);
const open = (g, r) => morph(morph(g, r, false), r, true);

function components(g) {
  const lab = new Int32Array(W * H).fill(-1), comps = [];
  for (let i = 0; i < W * H; i++) {
    if (!g[i] || lab[i] >= 0) continue;
    const id = comps.length, stack = [i], cells = [];
    lab[i] = id;
    while (stack.length) {
      const c = stack.pop(); cells.push(c);
      const x = c % W, z = (c / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Z = z + dz;
        if (X < 0 || Z < 0 || X >= W || Z >= H) continue;
        const n = Z * W + X;
        if (g[n] && lab[n] < 0) { lab[n] = id; stack.push(n); }
      }
    }
    comps.push(cells);
  }
  return comps;
}
function keepLarge(g, minCells) {
  const out = newGrid();
  for (const c of components(g)) if (c.length >= minCells) for (const i of c) out[i] = 1;
  return out;
}
function fillHoles(g, maxHoleCells) {
  const inv = newGrid();
  for (let i = 0; i < W * H; i++) inv[i] = g[i] ? 0 : 1;
  const out = g.slice();
  for (const c of components(inv)) {
    const touchesBorder = c.some((i) => { const x = i % W, z = (i / W) | 0; return x === 0 || z === 0 || x === W - 1 || z === H - 1; });
    if (!touchesBorder && c.length <= maxHoleCells) for (const i of c) out[i] = 1;
  }
  return out;
}

// Floor cleanup: close gaps, drop speckles, fill holes (furniture, scan holes)
let floor = close(floorG, 3);
floor = open(floor, 2);
floor = keepLarge(floor, 2 / (CELL * CELL)); // >= 2 m²
floor = fillHoles(floor, 6 / (CELL * CELL)); // holes up to 6 m²

console.log(`floor cells raw ${floorG.reduce((s,v)=>s+v,0)}, clean ${floor.reduce((s,v)=>s+v,0)}, wall slice cells ${wallG.reduce((s,v)=>s+v,0)}`);
// Walls: only keep wall hits near the walkable floor, then clean
const floorNear = morph(floor, 4, true);
const floorCore = morph(floor, 2, false); // ignore slice hits in the middle of hallways (people, furniture)
let walls = newGrid();
for (let i = 0; i < W * H; i++) walls[i] = wallG[i] && floorNear[i] && !floorCore[i] ? 1 : 0;
walls = close(walls, 2);
walls = keepLarge(walls, 8); // >= 0.8 m of wall

// ---------- marching squares contours for floor ----------
function contours(g) {
  // trace boundaries of cells along cell edges (outer + holes), returns closed loops in grid corner coords
  const edges = new Map(); // "x,z" -> [x2,z2] directed edges with filled cell on the left
  const f = (x, z) => (x >= 0 && z >= 0 && x < W && z < H ? g[z * W + x] : 0);
  const add = (x1, z1, x2, z2) => edges.set(`${x1},${z1}`, (edges.get(`${x1},${z1}`) || []).concat([[x2, z2]]));
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!f(x, z)) continue;
    if (!f(x, z - 1)) add(x, z, x + 1, z);
    if (!f(x + 1, z)) add(x + 1, z, x + 1, z + 1);
    if (!f(x, z + 1)) add(x + 1, z + 1, x, z + 1);
    if (!f(x - 1, z)) add(x, z + 1, x, z);
  }
  const loops = [];
  for (const [k] of edges) {
    while ((edges.get(k) || []).length) {
      const loop = [];
      let cur = k;
      while (true) {
        const list = edges.get(cur);
        if (!list || !list.length) break;
        const nx = list.shift();
        loop.push(cur.split(',').map(Number));
        cur = `${nx[0]},${nx[1]}`;
        if (cur === k) break;
      }
      if (loop.length > 3) loops.push(loop);
    }
  }
  return loops;
}

// Douglas–Peucker
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const d = (p, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1e-9;
    return Math.abs(dz * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L;
  };
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) { const v = d(pts[i], pts[0], pts.at(-1)); if (v > max) { max = v; idx = i; } }
  if (max <= eps) return [pts[0], pts.at(-1)];
  return simplify(pts.slice(0, idx + 1), eps).slice(0, -1).concat(simplify(pts.slice(idx), eps));
}
function simplifyClosed(pts, eps) {
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = simplify(pts.slice(0, far + 1), eps), b = simplify(pts.slice(far).concat([pts[0]]), eps);
  return a.slice(0, -1).concat(b.slice(0, -1));
}
const area = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;

// ---------- to world coords, recentered ----------
let fx0 = Infinity, fx1 = -Infinity, fz0 = Infinity, fz1 = -Infinity;
for (let i = 0; i < W * H; i++) if (floor[i]) {
  const x = i % W, z = (i / W) | 0;
  fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x + 1); fz0 = Math.min(fz0, z); fz1 = Math.max(fz1, z + 1);
}
const cx = minX + ((fx0 + fx1) / 2) * CELL, cz = minZ + ((fz0 + fz1) / 2) * CELL;
const r2 = (v) => Math.round(v * 100) / 100;
const cornerToWorld = ([x, z]) => [r2(minX + x * CELL - cx), r2(minZ + z * CELL - cz)];
const cellToWorld = (i) => [r2(minX + ((i % W) + 0.5) * CELL - cx), r2(minZ + (((i / W) | 0) + 0.5) * CELL - cz)];

const rawLoops = contours(floor)
  .map((l) => simplifyClosed(l, FLOOR_SIMPLIFY / CELL).map(cornerToWorld))
  .filter((l) => l.length >= 3 && Math.abs(area(l)) > 0.5);

// ---------- align to axes (dominant outline direction, mod 90°) ----------
let c4 = 0, s4 = 0;
for (const l of rawLoops) for (let i = 0; i < l.length; i++) {
  const a = l[i], b = l[(i + 1) % l.length];
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
  c4 += len * Math.cos(4 * ang); s4 += len * Math.sin(4 * ang);
}
const rotY = Math.atan2(s4, c4) / 4; // three.js rotation.y that aligns walls with the axes
const cosR = Math.cos(rotY), sinR = Math.sin(rotY);
const rot = ([x, z]) => [x * cosR + z * sinR, -x * sinR + z * cosR];
const unrot = ([x, z]) => [x * cosR - z * sinR, x * sinR + z * cosR];
console.log(`alignment rotation: ${((rotY * 180) / Math.PI).toFixed(2)}°`);

// ---------- orthogonalize: snap near-axis edges to exact horizontal/vertical lines ----------
const SNAP = Math.sin((25 * Math.PI) / 180); // edges within 25° of an axis become axis-aligned
function orthogonalize(loop) {
  const n = loop.length;
  const kind = (a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1e-9;
    return Math.abs(dz) / L < SNAP ? 'H' : Math.abs(dx) / L < SNAP ? 'V' : 'D';
  };
  // edges grouped into runs of the same axis kind
  const edges = loop.map((a, i) => ({ a, b: loop[(i + 1) % n], k: kind(a, loop[(i + 1) % n]) }));
  let s0 = edges.findIndex((e, i) => e.k !== edges[(i - 1 + n) % n].k || e.k === 'D');
  if (s0 < 0) return loop; // degenerate
  const groups = [];
  for (let i = 0; i < n; i++) {
    const e = edges[(s0 + i) % n];
    const last = groups.at(-1);
    if (last && e.k !== 'D' && last.k === e.k) last.edges.push(e);
    else groups.push({ k: e.k, edges: [e] });
  }
  if (groups.length > 1 && groups[0].k !== 'D' && groups[0].k === groups.at(-1).k) groups[0].edges.unshift(...groups.pop().edges);
  for (const g of groups) {
    if (g.k === 'D') continue;
    let w = 0, s = 0;
    for (const e of g.edges) {
      const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
      w += L; s += L * (g.k === 'H' ? (e.a[1] + e.b[1]) / 2 : (e.a[0] + e.b[0]) / 2);
    }
    g.v = s / (w || 1);
  }
  // new vertex between group i-1 and group i
  const out = [];
  for (let i = 0; i < groups.length; i++) {
    const A = groups[(i - 1 + groups.length) % groups.length], B = groups[i];
    const p = [...B.edges[0].a];
    for (const g of [A, B]) {
      if (g.k === 'H') p[1] = g.v;
      if (g.k === 'V') p[0] = g.v;
    }
    out.push(p);
  }
  // drop tiny edges and collinear points
  const clean = [];
  for (const p of out) {
    const q = clean.at(-1);
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.12) clean.push(p);
  }
  for (let changed = true; changed && clean.length > 3; ) {
    changed = false;
    for (let i = 0; i < clean.length; i++) {
      const a = clean[(i - 1 + clean.length) % clean.length], b = clean[i], c = clean[(i + 1) % clean.length];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cross) < 0.02 || Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.2) { clean.splice(i, 1); changed = true; break; }
    }
  }
  return clean;
}
const floorLoops = rawLoops.map((l) => orthogonalize(l.map(rot))).filter((l) => l.length >= 3);

// Outer loops vs holes by winding (outer loops share the sign of the biggest loop)
const sign = Math.sign(area(floorLoops.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a))));
const outers = floorLoops.filter((l) => Math.sign(area(l)) === sign);
const holes = floorLoops.filter((l) => Math.sign(area(l)) !== sign);
function pointInPoly([px, pz], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// Walls follow the clean floor outline. Stretches of outline with no scanned wall nearby
// for longer than MIN_OPENING are left open (stairwells, wide openings); shorter gaps
// (scan holes, glass, doors) are closed.
const evidence = morph(walls, Math.round(WALL_EVIDENCE / CELL), true);
const hasWall = (p) => {
  const [x, z] = unrot(p);
  const gx = Math.floor((x + cx - minX) / CELL), gz = Math.floor((z + cz - minZ) / CELL);
  return gx >= 0 && gz >= 0 && gx < W && gz < H && evidence[gz * W + gx] === 1;
};
const wallLines = [];
for (const loop of floorLoops) {
  // sample the closed loop every ~10 cm
  const samples = []; // {p, wall, vertex}
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / CELL));
    for (let k = 0; k < n; k++) {
      const p = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      samples.push({ p, wall: hasWall(p), vertex: k === 0 ? a : null });
    }
  }
  const N = samples.length;
  const open = new Array(N).fill(false);
  const runLen = Math.round(MIN_OPENING / CELL);
  const start = samples.findIndex((s) => s.wall);
  if (start < 0) continue;
  for (let i = 0; i < N; ) {
    if (samples[(start + i) % N].wall) { i++; continue; }
    let j = i;
    while (j < N && !samples[(start + j) % N].wall) j++;
    if (j - i >= runLen) for (let k = i; k < j; k++) open[(start + k) % N] = true;
    i = j;
  }
  if (!open.some(Boolean)) { wallLines.push(loop.concat([loop[0]])); continue; }
  // emit polylines for the walled runs, keeping outline vertices
  const first = open.findIndex(Boolean);
  let cur = null;
  for (let i = 1; i <= N; i++) {
    const idx = (first + i) % N;
    if (open[idx]) { if (cur && cur.length > 1) wallLines.push(cur); cur = null; continue; }
    if (!cur) cur = [samples[idx].p];
    else if (samples[idx].vertex) cur.push(samples[idx].vertex);
    const next = (idx + 1) % N;
    if (open[next] || i === N) cur.push(samples[next].p);
  }
  if (cur && cur.length > 1) wallLines.push(cur);
}

const r2pts = (l) => l.map(([x, z]) => [r2(x), r2(z)]);
const floorOut = outers.map((o) => ({ outer: r2pts(o), holes: holes.filter((h) => pointInPoly(h[0], o)).map(r2pts) }));
const wallsOut = wallLines.map(r2pts);
const allPts = floorOut.flatMap((p) => p.outer);
const bounds = {
  minX: Math.min(...allPts.map((p) => p[0])), maxX: Math.max(...allPts.map((p) => p[0])),
  minZ: Math.min(...allPts.map((p) => p[1])), maxZ: Math.max(...allPts.map((p) => p[1])),
};

const out = {
  source: 'assets/reference/floor-scan.glb',
  generatedAt: new Date().toISOString(),
  cell: CELL,
  // scan -> app transform: translate by -offset, then rotate around Y by rotationY (three.js convention)
  offset: [r2(cx), r2(floorY), r2(cz)],
  rotationY: rotY,
  bounds,
  floor: floorOut,
  walls: wallsOut,
};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`floor polygons: ${floorOut.length} (holes ${holes.length}), wall polylines: ${wallLines.length}, wall points: ${wallLines.reduce((s, l) => s + l.length, 0)}`);
console.log(`bounds: ${JSON.stringify(out.bounds)}`);

// ---------- debug PNG ----------
if (DEBUG_PNG) {
  const S = 4, PW = W * S, PH = H * S;
  const px = Buffer.alloc(PW * PH * 3, 255);
  const set = (X, Z, c) => { if (X >= 0 && Z >= 0 && X < PW && Z < PH) px.set(c, (Z * PW + X) * 3); };
  for (let i = 0; i < W * H; i++) {
    const x = i % W, z = (i / W) | 0;
    const c = walls[i] ? [240, 160, 160] : wallG[i] ? [210, 210, 210] : floor[i] ? [170, 200, 240] : null;
    if (c) for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) set(x * S + a, z * S + b, c);
  }
  // polylines on top (black)
  const toPx = (q) => { const [x, z] = unrot(q); return [((x + cx - minX) / CELL) * S, ((z + cz - minZ) / CELL) * S]; };
  const drawLine = (p, q, c) => {
    const [a, b] = toPx(p), [d, e] = toPx(q), n = Math.ceil(Math.max(Math.abs(d - a), Math.abs(e - b))) || 1;
    for (let s = 0; s <= n; s++) set(Math.round(a + ((d - a) * s) / n), Math.round(b + ((e - b) * s) / n), c);
  };
  for (const l of wallLines) for (let i = 1; i < l.length; i++) drawLine(l[i - 1], l[i], [0, 0, 0]);
  for (const p of floorOut) for (const l of [p.outer, ...p.holes]) for (let i = 0; i < l.length; i++) drawLine(l[i], l[(i + 1) % l.length], [20, 90, 200]);
  const raw = Buffer.alloc((PW * 3 + 1) * PH);
  for (let z = 0; z < PH; z++) { raw[z * (PW * 3 + 1)] = 0; px.copy(raw, z * (PW * 3 + 1) + 1, z * PW * 3, (z + 1) * PW * 3); }
  const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(PW, 0); ihdr.writeUInt32BE(PH, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(DEBUG_PNG, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log(`debug png: ${DEBUG_PNG}`);
}
