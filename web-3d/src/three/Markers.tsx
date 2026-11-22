import { useMemo, useRef, type MouseEvent, type ReactNode } from 'react';
import { useT } from '../i18n';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { ArrowUpDown, FlaskConical } from 'lucide-react';
import { gid, roomName, type FloorInfo } from '../map/building';
import type { Vec2 } from '../map/types';
import { WALL_HEIGHT } from './Walls';

export function StairsIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 20h5v-5h5v-5h5V5h3" />
    </svg>
  );
}

export function WcIcon() {
  return <span className="text-[8px] leading-none font-extrabold tracking-tight">WC</span>;
}

/** Category look shared by map labels and the UI (search results, chips). */
export const CATEGORY = {
  lab: { bg: 'bg-amber-500', icon: <FlaskConical size={12} strokeWidth={2.6} /> },
  toilet: { bg: 'bg-teal-500', icon: <WcIcon /> },
  lift: { bg: 'bg-slate-500', icon: <ArrowUpDown size={12} strokeWidth={2.6} /> },
  stairs: { bg: 'bg-emerald-600', icon: <StairsIcon /> },
} as const;
export type Category = keyof typeof CATEGORY;

interface Label {
  key: string;
  pos: Vec2;
  text: string;
  cat: Category;
  doorId?: string; // destination candidate (labs, WC)
  entryId?: string; // entry point (stairs, lift)
  atDoor?: boolean; // anchored on a door: drawn just above the door panel
  normal?: Vec2; // door labels: direction of the room behind the door (the text extends that way)
}

/** Groups points closer than `dist` (two elevators side by side get one label). */
function cluster(points: Vec2[], dist: number): Vec2[] {
  const out: { sum: Vec2; n: number }[] = [];
  for (const p of points) {
    const c = out.find((o) => Math.hypot(o.sum[0] / o.n - p[0], o.sum[1] / o.n - p[1]) < dist);
    if (c) { c.sum = [c.sum[0] + p[0], c.sum[1] + p[1]]; c.n++; }
    else out.push({ sum: [...p], n: 1 });
  }
  return out.map((o) => [o.sum[0] / o.n, o.sum[1] / o.n]);
}

/** All map labels of a floor; ids are floor-qualified ("7:D12", "6:S1", "6:lift"). */
export function floorLabels(floor: FloorInfo): Label[] {
  const floorData = floor.data;
  const g = (id: string) => gid(floor.id, id);
  const out: Label[] = [];
  const front = (c: Vec2, n: Vec2, k = 0.9): Vec2 => [c[0] - n[0] * k, c[1] - n[1] * k];
  (floorData.stairs ?? []).forEach((s, i) => {
    const xs = s.footprint.map((p) => p[0]), zs = s.footprint.map((p) => p[1]);
    out.push({ key: g(s.id), entryId: g(s.id), cat: 'stairs', text: `Scări ${i + 1}`, pos: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2] });
  });
  const lifts = floorData.doors.filter((d) => d.type === 'elevator');
  cluster(lifts.map((d) => front(d.center, d.normal)), 3).forEach((p, i) => out.push({ key: g(`lift${i}`), entryId: g('lift'), cat: 'lift', text: 'Lift', pos: p }));
  // door labels sit right at their door (a hair into the hallway), not in the middle of the corridor
  floorData.doors.filter((d) => d.type === 'toilet').forEach((d) => out.push({ key: g(d.id), doorId: g(d.id), cat: 'toilet', text: 'WC', pos: front(d.center, d.normal, 0.15), atDoor: true, normal: d.normal }));
  floorData.doors.filter((d) => d.type === 'lab').forEach((d) => out.push({ key: g(d.id), doorId: g(d.id), cat: 'lab', text: roomName(floor, d), pos: front(d.center, d.normal, 0.15), atDoor: true, normal: d.normal }));
  return out;
}

interface Props {
  floor: FloorInfo;
  /** when set, only labels whose key passes are drawn (see-through floors show only what the route needs) */
  only?: (id: string) => boolean;
  destinationId: string | null;
  /** start of the route: an entry id or the door id of a room */
  originId: string | null;
  onSelectDoor: (id: string) => void;
  onSelectEntry: (id: string) => void;
}

/**
 * The finger-sized pads of close labels overlap and the topmost would win, so a tap goes to the label whose icon or
 * text is nearest to the finger (inside two: the icon whose middle is nearer).
 */
function nearestLabel([x, y]: [number, number], tapped: HTMLButtonElement): HTMLButtonElement {
  let best = tapped, bestD = Infinity;
  tapped.closest('.map-canvas')?.querySelectorAll<HTMLButtonElement>('button[data-map-label]').forEach((el) => {
    if (getComputedStyle(el).visibility === 'hidden') return;
    const i = el.firstElementChild!.getBoundingClientRect();
    if (!i.width) return;
    let d = Math.hypot(x - i.x - i.width / 2, y - i.y - i.height / 2) - i.width / 2; // < 0 inside the icon
    const t = el.lastElementChild!.getBoundingClientRect();
    if (t.width) d = Math.min(d, Math.hypot(Math.max(t.left - x, 0, x - t.right), Math.max(t.top - y, 0, y - t.bottom)));
    if (d < bestD) { bestD = d; best = el; }
  });
  return best;
}

const DOOR_LABEL_Y = WALL_HEIGHT - 0.1; // just above the door panels, below the wall caps
const ICON = 20; // px, icon diameter
const CHAR_W = 6.4; // px, approx. width of one 11px semibold character
const GAP = 3; // px between labels

/** Maps-style labels: round category icon + haloed text; the destination becomes a red pin.
 *  Labels are decluttered every few frames: when a label's text would overlap a higher-priority
 *  label on screen it collapses to its icon (text returns when you zoom in). */
export function Markers({ floor, only, destinationId, originId, onSelectDoor, onSelectEntry }: Props) {
  const t = useT();
  const all = useMemo(() => floorLabels(floor), [floor]);
  const LABELS = only ? all.filter((l) => only(l.doorId ?? l.entryId ?? l.key)) : all;
  const group = useRef<THREE.Group>(null);
  const textRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  const frame = useRef(0);
  const v = useRef(new THREE.Vector3());
  const press = useRef<[number, number] | null>(null); // where the finger landed (a click's position gets snapped to its target)
  const isOrigin = (l: Label) => originId !== null && (l.entryId === originId || l.doorId === originId);

  useFrame(() => {
    if (frame.current++ % 4) return; // ~15 Hz is plenty
    // priority: destination, route start, entries, toilet, labs (in list order)
    const rank = (l: Label) => (l.doorId === destinationId ? 0 : isOrigin(l) ? 1 : l.entryId ? 2 : l.cat === 'toilet' ? 3 : 4);
    const order = [...LABELS].sort((a, b) => rank(a) - rank(b));
    type Box = [number, number, number, number];
    const hit = (a: Box, list: Box[]) => list.some((p) => a[0] < p[2] + GAP && a[2] + GAP > p[0] && a[1] < p[3] + GAP && a[3] + GAP > p[1]);
    const w = new THREE.Vector3();
    // 1) where every label is on screen, and which side its text goes: towards the room behind the door, so doors on
    //    opposite walls of a hallway spread their texts apart instead of stacking them
    const items = order.map((l) => {
      v.current.set(l.pos[0], l.atDoor ? DOOR_LABEL_Y : WALL_HEIGHT + 0.4, l.pos[1]);
      if (group.current) v.current.applyMatrix4(group.current.matrixWorld); // floors sit at different heights
      const world = v.current.clone();
      v.current.project(camera);
      const x = ((v.current.x + 1) / 2) * size.width, y = ((1 - v.current.y) / 2) * size.height;
      let left = false;
      if (l.normal) {
        w.copy(world).add(new THREE.Vector3(l.normal[0], 0, l.normal[1])).project(camera);
        left = ((w.x + 1) / 2) * size.width - x < -3;
      }
      const tw = 4 + l.text.length * CHAR_W;
      const text: Box = left ? [x - ICON / 2 - tw, y - 8, x - ICON / 2, y + 8] : [x + ICON / 2, y - 8, x + ICON / 2 + tw, y + 8];
      return { l, x, y, left, text, icon: [x - ICON / 2, y - ICON / 2, x + ICON / 2, y + ICON / 2] as Box };
    });
    // 2) icons: every lab stays visible; one is only hidden when it sits right on top of a more important one
    const icons: Box[] = []; // what texts must not cover
    const centers: [number, number][] = []; // icons already shown
    const shown = new Set<string>();
    for (const it of items) {
      const isDest = it.l.doorId === destinationId;
      const big: Box = isDest ? [it.x - 55, it.y - 78, it.x + 55, it.y + 4] : isOrigin(it.l) ? [it.x - 60, it.y - 56, it.x + 60, it.y + 12] : it.icon;
      const onTop = centers.some(([cx, cy]) => Math.hypot(cx - it.x, cy - it.y) < ICON * 0.6); // practically the same spot
      if (isDest || isOrigin(it.l) || !onTop) { icons.push(big); centers.push([it.x, it.y]); shown.add(it.l.key); }
    }
    // 3) texts, most important first: shown when they don't cover an icon or another text
    const texts: Box[] = [];
    for (const it of items) {
      const important = it.l.doorId === destinationId || rank(it.l) <= 1;
      const visible = shown.has(it.l.key);
      const showText = visible && (important || (!hit(it.text, icons.filter((b) => b !== it.icon)) && !hit(it.text, texts)));
      if (showText) texts.push(it.text);
      const el = textRefs.current[it.l.key];
      if (el) el.style.display = showText ? '' : 'none';
      const lab = labelRefs.current[it.l.key];
      if (lab) {
        lab.style.visibility = visible ? '' : 'hidden';
        // text on the left: the icon stays on the spot, the text runs to its left
        lab.style.flexDirection = it.left ? 'row-reverse' : '';
        lab.style.translate = it.left ? 'calc(-100% + 10px) -10px' : '';
      }
    }
  });

  return (
    <group ref={group}>
      {LABELS.map((l) => {
        const isDest = l.doorId !== undefined && l.doorId === destinationId;
        const isEntry = isOrigin(l);
        const onClick = () => (l.doorId ? onSelectDoor(l.doorId) : l.entryId ? onSelectEntry(l.entryId) : undefined);
        const onTap = (e: MouseEvent<HTMLButtonElement>) => {
          const at = press.current;
          press.current = null;
          // detail 0: keyboard, screen reader, or handed over by the label that was tapped
          const best = e.detail && at ? nearestLabel(at, e.currentTarget) : e.currentTarget;
          if (best === e.currentTarget) onClick();
          else best.click();
        };
        const y = l.atDoor ? DOOR_LABEL_Y : WALL_HEIGHT + 0.4;
        return (
          // the destination pin stands exactly where the lab's label is (its tip on the label's spot)
          // the wrapper lets taps through: it stays at the anchor when the button is shifted, over the neighbour's icon
          <Html key={l.key} position={[l.pos[0], y, l.pos[1]]} style={{ pointerEvents: 'none' }} zIndexRange={[isDest ? 35 : isEntry ? 30 : 20, 0]}>
            {isDest ? (
              // anchored at the pin's tip (bottom center), so the tip marks the label's spot exactly
              // the keys matter: pin and label must never share a DOM element, or the pin inherits the label's inline
              // styles from the declutter pass (left-side shift, reversed row, hidden)
              <button key="pin" type="button" onClick={onClick} aria-label={t.destinationLabel(l.text)} // pointer-events-none: the pin is tall and would block taps on the neighbouring labels; tapping it adds nothing
              className="pin-drop pointer-events-none flex -translate-x-1/2 -translate-y-full flex-col items-center select-none">
                {/* "TO Lab 10": the end of the route says so in words, not only by color */}
                <span className="mb-1 flex items-center gap-1.5 rounded-full bg-pin py-1 pr-2.5 pl-2 text-[13px] font-bold whitespace-nowrap text-white shadow-md">
                  <span className="rounded bg-white/25 px-1 text-[9px] leading-[14px] tracking-wider uppercase">{t.pillTo}</span>
                  {l.text}
                </span>
                {/* teardrop pin */}
                <svg width="30" height="40" viewBox="0 0 30 40" aria-hidden className="drop-shadow-md">
                  <path d="M15 39C15 39 2 23.5 2 14.5a13 13 0 0 1 26 0C28 23.5 15 39 15 39z" fill="var(--pin)" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
                  <circle cx="15" cy="14.5" r="5" fill="#fff" />
                </svg>
              </button>
            ) : isEntry ? (
              // route start: the icon stays exactly on the spot; the "FROM Scări 2" tag floats above it on a stem,
              // so it never covers where you start
              <div key="start" data-map-start="" className="relative -translate-x-[10px] -translate-y-[10px] select-none">
                <button
                  type="button"
                  aria-label={t.startLabel(l.text)} // tapping the start does nothing: it must not become the destination
                  className="pointer-events-auto absolute bottom-[calc(100%+16px)] left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full bg-accent py-1 pr-2.5 pl-1.5 whitespace-nowrap text-white shadow-md dark:text-[#0b1f3a]"
                >
                  <span className="rounded bg-white/25 px-1 text-[9px] leading-[14px] font-bold tracking-wider uppercase">{t.pillFrom}</span>
                  <span className="text-[12px] font-bold">{l.text}</span>
                </button>
                <span aria-hidden className="absolute bottom-full left-1/2 h-4 w-0.5 -translate-x-1/2 bg-accent" />
                <span className={`pointer-events-auto grid h-5 w-5 place-items-center rounded-full text-white shadow-md ring-2 ring-accent ${CATEGORY[l.cat].bg}`}>
                  {CATEGORY[l.cat].icon as ReactNode}
                </span>
              </div>
            ) : (
              // anchored on the icon's center (text extends to the right), so the icon marks the exact spot
              <button
                key="label"
                ref={(el) => { labelRefs.current[l.key] = el; if (el) frame.current = 0; }} // new element: place its text on the next frame
                type="button"
                data-map-label=""
                onPointerDown={(e) => { press.current = [e.clientX, e.clientY]; }}
                onClick={onTap}
                aria-pressed={isEntry || undefined}
                aria-label={l.text}
                title={l.text}
                // the ::before pad makes a finger-sized tap target around the small icon
                className="pointer-events-auto relative flex -translate-x-[10px] -translate-y-[10px] cursor-pointer items-center gap-1 whitespace-nowrap select-none before:absolute before:-inset-2.5 before:content-['']"
              >
                <span
                  className={`relative grid h-5 w-5 shrink-0 place-items-center rounded-full text-white shadow-md ring-2 ${CATEGORY[l.cat].bg} ${
                    isEntry ? 'scale-125 ring-accent' : 'ring-white/90'
                  } transition-transform`}
                >
                  {CATEGORY[l.cat].icon as ReactNode}
                </span>
                <span ref={(el) => { textRefs.current[l.key] = el; }} className={`map-label text-[11px] font-semibold ${isEntry ? 'text-accent' : 'text-text'}`}>
                  {l.text}
                </span>
              </button>
            )}
          </Html>
        );
      })}
    </group>
  );
}
