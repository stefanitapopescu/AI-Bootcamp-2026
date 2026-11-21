// Geometria planului 2D pentru fundaluri, calculată o dată din floor.json (aceeași sursă ca harta).
// Coordonate SVG: u = (x - minX) * 10, v = (z - minZ) * 10, adică 1 m = 10 unități.
import floor from '@floor';

type Vec2 = [number, number];

interface FloorJson {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  floor: { outer: Vec2[]; holes: Vec2[][] }[];
  walls: Vec2[][];
  doors: { id: string; center: Vec2; width: number; tangent: Vec2; normal: Vec2 }[];
}

const data = floor as unknown as FloorJson;
const { minX, maxX, minZ, maxZ } = data.bounds;
const SCALE = 10;
const PAD = 6;
const MAT_DEPTH = 0.45; // covorașul din fața ușii, în metri, spre hol

const toSvg = ([x, z]: Vec2): Vec2 => [(x - minX) * SCALE, (z - minZ) * SCALE];
const fmt = ([u, v]: Vec2) => `${u.toFixed(1)} ${v.toFixed(1)}`;
const ring = (pts: Vec2[]) => `M${pts.map((p) => fmt(toSvg(p))).join(' ')}Z`;

export const PLAN_WIDTH = (maxX - minX) * SCALE;
export const PLAN_HEIGHT = (maxZ - minZ) * SCALE;
export const PLAN_VIEWBOX = `${-PAD} ${-PAD} ${(PLAN_WIDTH + 2 * PAD).toFixed(0)} ${(PLAN_HEIGHT + 2 * PAD).toFixed(0)}`;
export const PLAN_ASPECT = (PLAN_WIDTH + 2 * PAD) / (PLAN_HEIGHT + 2 * PAD);

export const floorPath = data.floor.map((p) => [p.outer, ...p.holes].map(ring).join(' ')).join(' ');

export const wallPaths = data.walls.map((w) => `M${w.map((p) => fmt(toSvg(p))).join(' ')}`);

export const doors = data.doors.map((d) => {
  const h = d.width / 2;
  const a: Vec2 = [d.center[0] - d.tangent[0] * h, d.center[1] - d.tangent[1] * h];
  const b: Vec2 = [d.center[0] + d.tangent[0] * h, d.center[1] + d.tangent[1] * h];
  // normal iese din hol, deci covorașul merge în sens opus
  const inward = (p: Vec2): Vec2 => [p[0] - d.normal[0] * MAT_DEPTH, p[1] - d.normal[1] * MAT_DEPTH];
  return {
    id: d.id,
    line: `M${fmt(toSvg(a))} L${fmt(toSvg(b))}`,
    mat: ring([a, b, inward(b), inward(a)]),
  };
});

/**
 * Traseul demo din desene: din holul central („Ești aici”, [-1.5, 0.4]) până la ușa D20 (B623, exemplu).
 * Când există rutarea reală, fundalul poate primi orice traseu ca prop.
 */
export const DEMO_ROUTE = 'M78.1 196.2 H166.6 V170.2 L172.6 164.2 V4 H166.6';
