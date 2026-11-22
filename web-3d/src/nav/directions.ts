import type { Door, Vec2 } from '../map/types';
import type { Route } from './navigation';
import type { StepPhrases } from '../i18n';

export type StepKind = 'depart' | 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'arrive' | 'up' | 'down';

export interface Step {
  kind: StepKind;
  text: string;
  meters?: number;
  floor?: string; // set by trip steps (multi-floor)
}

export interface StepEnd {
  name: string;
  door?: Door; // a room: departing says which way to turn, arriving says which side the door is on
  text?: string; // custom first/last step text (floor changes)
  kind?: StepKind; // custom last step kind (up/down)
}

const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const len = (v: Vec2) => Math.hypot(v[0], v[1]);
const norm = (v: Vec2): Vec2 => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
// x to the right, z towards the bottom of a top view: cross > 0 means a clockwise (right) turn
const cross = (a: Vec2, b: Vec2) => a[0] * b[1] - a[1] * b[0];
const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];

const MIN_SEG = 1.0; // m: shorter pieces at the ends are just stepping out of / up to a door
const TURN = 25; // deg: smaller direction changes count as "straight"
const SLIGHT = 60; // deg: below this a turn is a "bear left/right"

const WIGGLE = 0.6; // m: bends smaller than this (keeping to the middle of a hallway) are not turns

/** Douglas–Peucker: drop points that stay within `tol` of the straight line between their neighbours. */
function simplify(pts: Vec2[], tol: number): Vec2[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const ab = sub(b, a), L = len(ab) || 1e-9;
  let far = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(cross(ab, sub(pts[i], a))) / L;
    if (d > far) { far = d; idx = i; }
  }
  if (far <= tol) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}

/** Turn-by-turn text directions from a route polyline. */
export function buildSteps(route: Route, from: StepEnd, to: StepEnd, ph: StepPhrases): Step[] {
  // steps describe the shape of the walk, not every small bend of the drawn line
  let pts = simplify(route.points, WIGGLE);
  // drop tiny first/last pieces so they don't produce fake turns
  if (pts.length > 2 && len(sub(pts[1], pts[0])) < MIN_SEG) pts = [pts[0], ...pts.slice(2)];
  if (pts.length > 2 && len(sub(pts[pts.length - 1], pts[pts.length - 2])) < MIN_SEG) pts = [...pts.slice(0, -2), pts[pts.length - 1]];

  let depart = from.text ?? ph.startAt(from.name);
  if (!from.text && from.door && pts.length > 1) {
    // leaving a room: you face out of the door (-normal); say which way to turn into the hallway
    const out: Vec2 = [-from.door.normal[0], -from.door.normal[1]];
    const first = norm(sub(pts[1], pts[0]));
    const a = (Math.atan2(cross(out, first), dot(out, first)) * 180) / Math.PI;
    depart = Math.abs(a) < 35 ? ph.exitStraight(from.name) : ph.exitTurn(from.name, a > 0 ? 'right' : 'left');
  }
  const steps: Step[] = [{ kind: 'depart', text: depart }];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += len(sub(pts[i], pts[i - 1]));
    if (i === pts.length - 1) break;
    const d1 = norm(sub(pts[i], pts[i - 1])), d2 = norm(sub(pts[i + 1], pts[i]));
    const ang = (Math.atan2(cross(d1, d2), dot(d1, d2)) * 180) / Math.PI;
    if (Math.abs(ang) < TURN) continue;
    if (acc >= 1.5) steps.push({ kind: 'straight', text: ph.straight(Math.round(acc)), meters: acc });
    acc = 0;
    const side = ang > 0 ? 'right' : 'left';
    const slight = Math.abs(ang) < SLIGHT;
    steps.push({ kind: slight ? `slight-${side}` : side, text: slight ? ph.bear(side) : ph.turn(side) });
  }
  if (acc >= 1.5) steps.push({ kind: 'straight', text: ph.straight(Math.round(acc)), meters: acc });

  if (to.text) {
    steps.push({ kind: to.kind ?? 'arrive', text: to.text });
    return steps;
  }
  if (!to.door) {
    steps.push({ kind: 'arrive', text: ph.arrive(to.name) });
    return steps;
  }
  // which side is the door on, looking along the last piece of the walk
  const last = norm(sub(pts[pts.length - 1], pts[Math.max(0, pts.length - 2)]));
  const c = cross(last, to.door.normal);
  const where = Math.abs(c) < 0.35 ? 'ahead' : c > 0 ? 'right' : 'left';
  steps.push({ kind: 'arrive', text: ph.arriveDoor(to.name, where) });
  return steps;
}
