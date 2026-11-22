import { floorData } from './floor';
import type { Door, FloorData } from './types';

export type FloorId = '6' | '7';

export interface FloorInfo {
  id: FloorId;
  level: number;
  name: string; // "Etaj 6"
  data: FloorData;
}

export const BUILDING_NAME = 'Corp B';
export const FACULTY_NAME = 'Facultatea de Automatică și Calculatoare';

/**
 * Floors of the building, bottom to top. Only Etaj 6 is scanned: Etaj 7 is an exact copy of its geometry
 * (same hallways, doors, stairs and lift) until it gets its own scan.
 */
export const FLOORS: FloorInfo[] = [
  { id: '6', level: 6, name: 'Etaj 6', data: floorData },
  { id: '7', level: 7, name: 'Etaj 7', data: floorData },
];
export const floorById = (id: FloorId) => FLOORS.find((f) => f.id === id)!;

/** Vertical distance between floors in the "all floors" (exploded) view, in meters. */
export const STACK_GAP = 8;
/** Height of a floor in the exploded view; the stack is centered on y = 0. */
export const stackY = (id: FloorId) => (FLOORS.findIndex((f) => f.id === id) - (FLOORS.length - 1) / 2) * STACK_GAP;

/** Global ids are floor-qualified: "7:D12" (door), "6:S1" (stairs), "7:lift". */
export const gid = (floor: FloorId, id: string) => `${floor}:${id}`;
export const splitGid = (g: string) => {
  const i = g.indexOf(':');
  return { floor: g.slice(0, i) as FloorId, id: g.slice(i + 1) };
};

/** Placeholder labs ("Lab 1" … "Lab 7") on the scanned floor: upper floors continue the numbering. */
const PLACEHOLDER_LABS = floorData.doors.filter((d) => d.type === 'lab' && /^Lab \d+$/.test(d.name ?? '')).length;

/**
 * Room name on a given floor. Real codes follow the floor number (B625 on Etaj 6 is B725 on Etaj 7);
 * placeholder labs get their own numbers per floor (Lab 1–7 on Etaj 6, Lab 8–14 on Etaj 7).
 */
export function roomName(floor: FloorInfo, door: Door): string {
  if (door.type === 'toilet') return 'Toaletă';
  const n = door.name ?? 'Lab';
  const index = FLOORS.indexOf(floor);
  return n
    .replace(/^([A-Z])\d(\d\d)$/, (_, b, r) => `${b}${floor.level}${r}`)
    .replace(/^Lab (\d+)$/, (_, k) => `Lab ${Number(k) + index * PLACEHOLDER_LABS}`);
}
