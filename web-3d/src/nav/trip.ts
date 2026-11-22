import type { Door, Vec2 } from '../map/types';
import { floorById, type FloorId } from '../map/building';
import { alternativeRoute, findRoute, type EntryPoint, type NavGrid, type Route } from './navigation';
import { buildSteps, type Step } from './directions';
import type { StepPhrases } from '../i18n';

/** Walking route on one floor. */
export interface Leg {
  floor: FloorId;
  route: Route;
}

/** Changing floors at a stairwell or the lift. */
export interface Transfer {
  entry: EntryPoint; // same stairwell / lift on both floors (same local id)
  from: FloorId;
  to: FloorId;
  seconds: number;
}

export interface Trip {
  id: string; // 'direct', 'alt', or the stairwell / lift id it goes through
  label: string; // "via Scări 2", "via the lift", "Direct", "Other way"
  legs: Leg[];
  transfer: Transfer | null;
  meters: number; // walking only
  seconds: number; // walking + floor change
}

export interface TripEnd {
  floor: FloorId;
  pos: Vec2;
}

const WALK = 1.3; // m/s, same as navigation.ts
const STAIRS_SEC_PER_FLOOR = 20; // one flight up or down
const LIFT_SEC = 45; // waiting + ride

const levelOf = (f: FloorId) => floorById(f).level;
export const transferSeconds = (e: EntryPoint, from: FloorId, to: FloorId) =>
  e.kind === 'lift' ? LIFT_SEC : STAIRS_SEC_PER_FLOOR * Math.abs(levelOf(to) - levelOf(from));

/**
 * Every sensible route between two points, fastest first. On one floor: the shortest walk plus a genuinely
 * different one if the layout has it. Across floors: one route per stairwell and one by lift, so the visitor
 * can pick (e.g. the lift with a heavy bag). Floors share their layout, so one grid and entry list serve all.
 */
export function planTrips(grid: NavGrid, entries: EntryPoint[], from: TripEnd, to: TripEnd): Trip[] {
  if (from.floor === to.floor) {
    const r = findRoute(grid, from.pos, to.pos);
    if (!r) return [];
    const one = (id: string, label: string, route: Route): Trip => ({ id, label, legs: [{ floor: from.floor, route }], transfer: null, meters: route.meters, seconds: route.meters / WALK });
    const alt = alternativeRoute(grid, from.pos, to.pos, r);
    return alt ? [one('direct', 'Shortest way', r), one('alt', 'Other way', alt)] : [one('direct', 'Shortest way', r)];
  }
  const trips: Trip[] = [];
  for (const e of entries) {
    const a = findRoute(grid, from.pos, e.pos);
    const b = findRoute(grid, e.pos, to.pos);
    if (!a || !b) continue;
    const t = transferSeconds(e, from.floor, to.floor);
    trips.push({
      id: e.id,
      label: e.kind === 'lift' ? 'by lift' : `via ${e.name}`,
      legs: [{ floor: from.floor, route: a }, { floor: to.floor, route: b }],
      transfer: { entry: e, from: from.floor, to: to.floor, seconds: t },
      meters: a.meters + b.meters,
      seconds: (a.meters + b.meters) / WALK + t,
    });
  }
  return trips.sort((x, y) => x.seconds - y.seconds);
}

/** The fastest route (see planTrips). */
export const planTrip = (grid: NavGrid, entries: EntryPoint[], from: TripEnd, to: TripEnd): Trip | null => planTrips(grid, entries, from, to)[0] ?? null;

/** Turn-by-turn steps for a trip, tagged with the floor they happen on. */
export function tripSteps(trip: Trip, from: { name: string; door?: Door }, to: { name: string; door?: Door }, ph: StepPhrases): Step[] {
  const tag = (steps: Step[], floor: FloorId) => steps.map((s) => ({ ...s, floor }));
  if (!trip.transfer) return tag(buildSteps(trip.legs[0].route, from, to, ph), trip.legs[0].floor);
  const { entry, from: f0, to: f1 } = trip.transfer;
  const up = levelOf(f1) > levelOf(f0);
  const target = floorById(f1).name;
  const change = entry.kind === 'lift' ? ph.takeLift(up, target) : ph.takeStairs(entry.name, up, target);
  return [
    ...tag(buildSteps(trip.legs[0].route, from, { name: entry.name, text: change, kind: up ? 'up' : 'down' }, ph), f0),
    ...tag(buildSteps(trip.legs[1].route, { name: entry.name, text: ph.leave(entry.name, target) }, to, ph), f1),
  ];
}

/** Walking time like a maps app: seconds under a minute (rounded to 5 s), minutes above. */
export const etaText = (seconds: number) => (seconds < 60 ? `${Math.max(5, Math.round(seconds / 5) * 5)} sec` : `${Math.round(seconds / 60)} min`);
