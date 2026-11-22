import type { Door, FloorData, Vec2 } from '../map/types';

// ---------- entry points (where a visitor arrives on this floor) ----------

export interface EntryPoint {
  id: string;
  name: string;
  kind: 'stairs' | 'lift';
  /** standing point on the walkable floor, just inside the hallway */
  pos: Vec2;
  /** direction the visitor faces when arriving (into the hallway) */
  facing: Vec2;
}

const add = (a: Vec2, b: Vec2, k = 1): Vec2 => [a[0] + b[0] * k, a[1] + b[1] * k];

export function entryPoints(data: FloorData): EntryPoint[] {
  const out: EntryPoint[] = [];
  (data.stairs ?? []).forEach((s, i) => {
    const facing: Vec2 = [-s.entry.normal[0], -s.entry.normal[1]]; // normal points into the stairwell
    out.push({ id: s.id, name: `Scări ${i + 1}`, kind: 'stairs', pos: add(s.entry.center, facing, 0.8), facing });
  });
  const lifts = data.doors.filter((d) => d.type === 'elevator');
  if (lifts.length) {
    const c: Vec2 = [lifts.reduce((s, d) => s + d.center[0], 0) / lifts.length, lifts.reduce((s, d) => s + d.center[1], 0) / lifts.length];
    const facing: Vec2 = [-lifts[0].normal[0], -lifts[0].normal[1]];
    out.push({ id: 'lift', name: 'Lift', kind: 'lift', pos: add(c, facing, 1.0), facing });
  }
  return out;
}

/** Where a route can start: an entry point (stairs, lift) or a room you are leaving. */
export interface Origin {
  id: string; // entry id, or the door id of a room
  name: string;
  kind: 'stairs' | 'lift' | 'lab' | 'toilet';
  pos: Vec2;
  /** facing direction on arrival (entries); for rooms it is taken from the route's first segment */
  facing?: Vec2;
}

/** Direction of the first meaningful piece of a route (for the camera when leaving a room). */
export function routeHeading(points: Vec2[]): Vec2 {
  const a = points[0];
  const b = points.find((p) => Math.hypot(p[0] - a[0], p[1] - a[1]) > 1) ?? points[points.length - 1];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
}

/** Standing point in front of a door, on the hallway side. */
export const doorGoal = (d: Door): Vec2 => add(d.center, d.normal, -0.6);

// ---------- walkable grid ----------

const CELL = 0.15; // m
const CLEARANCE = 0.4; // never closer to a wall than this (m)
const PREFERRED = 1.0; // people walk this far from walls when there is room (narrow hallways: their middle)
const WALL_COST = 4; // extra cost factor for walking right next to a wall

export interface NavGrid {
  W: number;
  H: number;
  x0: number;
  z0: number;
  walk: Uint8Array;
  clear: Float32Array; // distance to the nearest wall per cell (m)
}

function pointInPoly([px, pz]: Vec2, poly: Vec2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}

export function buildGrid(data: FloorData): NavGrid {
  const b = data.bounds;
  const x0 = b.minX - CELL, z0 = b.minZ - CELL;
  const W = Math.ceil((b.maxX - b.minX) / CELL) + 3, H = Math.ceil((b.maxZ - b.minZ) / CELL) + 3;
  const walk = new Uint8Array(W * H);
  const clear = new Float32Array(W * H);
  const segs: [Vec2, Vec2][] = [];
  for (const p of data.floor) for (const loop of [p.outer, ...p.holes]) for (let i = 0; i < loop.length; i++) segs.push([loop[i], loop[(i + 1) % loop.length]]);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const c: Vec2 = [x0 + (i + 0.5) * CELL, z0 + (j + 0.5) * CELL];
    if (!data.floor.some((p) => pointInPoly(c, p.outer) && !p.holes.some((h) => pointInPoly(c, h)))) continue;
    let d = Infinity;
    for (const [a, s] of segs) { d = Math.min(d, distToSegment(c, a, s)); if (d < CLEARANCE) break; }
    if (d < CLEARANCE) continue;
    walk[j * W + i] = 1;
    clear[j * W + i] = d;
  }
  return { W, H, x0, z0, walk, clear };
}

const cellOf = (g: NavGrid, p: Vec2) => [Math.floor((p[0] - g.x0) / CELL), Math.floor((p[1] - g.z0) / CELL)];
const centerOf = (g: NavGrid, k: number): Vec2 => [g.x0 + ((k % g.W) + 0.5) * CELL, g.z0 + (Math.floor(k / g.W) + 0.5) * CELL];

/** Nearest walkable cell to a point (breadth-first outwards). */
function nearestWalkable(g: NavGrid, p: Vec2): number {
  const [ci, cj] = cellOf(g, p);
  for (let r = 0; r < Math.max(g.W, g.H); r++) {
    let best = -1, bd = Infinity;
    for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
      if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || i < 0 || j < 0 || i >= g.W || j >= g.H) continue;
      const k = j * g.W + i;
      if (!g.walk[k]) continue;
      const c = centerOf(g, k), d = Math.hypot(c[0] - p[0], c[1] - p[1]);
      if (d < bd) { bd = d; best = k; }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** Straight segment stays on walkable cells at least `minClear` from walls (sampled every half cell). */
function lineOfSight(g: NavGrid, a: Vec2, b: Vec2, minClear = 0) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL / 2));
  for (let s = 0; s <= n; s++) {
    const [i, j] = cellOf(g, [a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n]);
    if (i < 0 || j < 0 || i >= g.W || j >= g.H || !g.walk[j * g.W + i] || g.clear[j * g.W + i] < minClear) return false;
  }
  return true;
}

// ---------- A* + smoothing ----------

export interface Route {
  points: Vec2[];
  meters: number;
  minutes: number;
}

const WALK_SPEED = 1.3; // m/s

/** A* over the grid. `penalty` (optional, per cell) makes some cells costlier: used to find alternative routes. */
export function findRoute(g: NavGrid, from: Vec2, to: Vec2, penalty?: Float32Array): Route | null {
  const s = nearestWalkable(g, from), t = nearestWalkable(g, to);
  if (s < 0 || t < 0) return null;
  const N = g.W * g.H;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const [ti, tj] = [t % g.W, Math.floor(t / g.W)];
  const h = (k: number) => {
    const dx = Math.abs((k % g.W) - ti), dz = Math.abs(Math.floor(k / g.W) - tj);
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz); // octile distance
  };
  // binary heap of [f, k]
  const heap: [number, number][] = [];
  const push = (e: [number, number]) => {
    heap.push(e);
    for (let i = heap.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  gScore[s] = 0;
  push([h(s), s]);
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (heap.length) {
    const [, k] = pop();
    if (closed[k]) continue;
    if (k === t) break;
    closed[k] = 1;
    const i = k % g.W, j = Math.floor(k / g.W);
    for (const [di, dj, cost] of dirs) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= g.W || nj >= g.H) continue;
      const n = nj * g.W + ni;
      if (!g.walk[n] || closed[n]) continue;
      if (di && dj && (!g.walk[j * g.W + ni] || !g.walk[nj * g.W + i])) continue; // no corner cutting
      // stepping next to a wall costs more: routes keep to the middle of hallways, ~1 m off walls in open areas
      const wall = 1 + (WALL_COST * Math.max(0, PREFERRED - g.clear[n])) / PREFERRED;
      const ng = gScore[k] + cost * wall * (penalty ? 1 + penalty[n] : 1);
      if (ng < gScore[n]) { gScore[n] = ng; came[n] = k; push([ng + h(n), n]); }
    }
  }
  if (s !== t && came[t] < 0) return null;
  const cells: number[] = [];
  for (let k = t; k !== -1; k = came[k]) { cells.push(k); if (k === s) break; }
  cells.reverse();
  // string pulling: keep only the turns needed to stay on walkable cells, and never cut closer to a wall than the
  // A* path itself did there (up to the preferred distance), so straightened lines don't hug walls at corners
  const raw: Vec2[] = [from, ...cells.map((k) => centerOf(g, k)), to];
  const rawClear = [Infinity, ...cells.map((k) => g.clear[k]), Infinity];
  const pts: Vec2[] = [raw[0]];
  let anchor = 0;
  let minC = Infinity;
  for (let i = 2; i < raw.length; i++) {
    minC = Math.min(minC, rawClear[i - 1], rawClear[i]);
    const need = Math.min(PREFERRED, minC) - 0.05;
    if (!lineOfSight(g, raw[anchor === 0 ? 1 : anchor], raw[i], need)) {
      pts.push(raw[i - 1]);
      anchor = i - 1;
      minC = Math.min(rawClear[i - 1], rawClear[i]);
    }
  }
  pts.push(raw[raw.length - 1]);
  const meters = pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  return { points: pts, meters, minutes: meters / WALK_SPEED / 60 };
}

// ---------- alternative routes ----------

/** Shortest distance from a point to a polyline. */
function distToPolyline(p: Vec2, line: Vec2[]) {
  let d = Infinity;
  for (let i = 1; i < line.length; i++) d = Math.min(d, distToSegment(p, line[i - 1], line[i]));
  return d;
}

/** Points every `step` meters along a polyline. */
function samples(line: Vec2[], step: number): Vec2[] {
  const out: Vec2[] = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let s = 1; s <= n; s++) out.push([ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n]);
  }
  return out;
}

/**
 * A genuinely different way between two points, if there is one: the cells near the best route are made
 * costlier and A* runs again. Kept only when it shares less than 60 % of its length with the best route and is
 * not much longer (corridor layouts are mostly trees, so often there is none).
 */
export function alternativeRoute(g: NavGrid, from: Vec2, to: Vec2, best: Route): Route | null {
  const pen = new Float32Array(g.W * g.H);
  const R = 1.5; // m around the best route
  const r = Math.ceil(R / CELL);
  for (const p of samples(best.points, CELL)) {
    const [ci, cj] = cellOf(g, p);
    for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
      if (i < 0 || j < 0 || i >= g.W || j >= g.H) continue;
      if (Math.hypot(i - ci, j - cj) * CELL <= R) pen[j * g.W + i] = 3;
    }
  }
  // leave the ends free: both routes have to start and finish at the same doors
  for (const end of [from, to]) {
    const [ci, cj] = cellOf(g, end);
    const e = Math.ceil(2 / CELL);
    for (let j = cj - e; j <= cj + e; j++) for (let i = ci - e; i <= ci + e; i++) if (i >= 0 && j >= 0 && i < g.W && j < g.H) pen[j * g.W + i] = 0;
  }
  const alt = findRoute(g, from, to, pen);
  // not much longer, but not just the other side of the same corridor either
  if (!alt || alt.meters > best.meters * 1.6 + 6 || alt.meters < best.meters + 2) return null;
  const pts = samples(alt.points, 0.5);
  const shared = pts.filter((p) => distToPolyline(p, best.points) < 1.0).length / pts.length;
  return shared < 0.6 ? alt : null;
}
