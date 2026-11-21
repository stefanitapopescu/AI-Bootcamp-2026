import type { ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { ArrowUpDown, FlaskConical } from 'lucide-react';
import { floorData } from '../map/floor';
import type { Vec2 } from '../map/types';
import { WALL_HEIGHT } from './Walls';

function StairsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 20h5v-5h5v-5h5V5h3" />
    </svg>
  );
}

interface Chip {
  key: string;
  pos: Vec2;
  label: string;
  icon: ReactNode;
  tone: string; // tailwind text color for the icon
  /** lab door id: chip is clickable and selects this door as destination */
  doorId?: string;
  /** entry point id (stairs / lift) */
  entryId?: string;
}

/** Groups points closer than `dist` (e.g. two elevators side by side get one label). */
function cluster(points: Vec2[], dist: number): Vec2[] {
  const out: { sum: Vec2; n: number }[] = [];
  for (const p of points) {
    const c = out.find((o) => Math.hypot(o.sum[0] / o.n - p[0], o.sum[1] / o.n - p[1]) < dist);
    if (c) { c.sum = [c.sum[0] + p[0], c.sum[1] + p[1]]; c.n++; }
    else out.push({ sum: [...p], n: 1 });
  }
  return out.map((o) => [o.sum[0] / o.n, o.sum[1] / o.n]);
}

interface Props {
  selectedDoorId: string | null;
  activeEntryId: string | null;
  onSelectDoor: (id: string) => void;
  onSelectEntry: (id: string) => void;
}

/** Screen-space labels: stairs, elevators, toilets and lab doors (labs and entries are clickable). */
export function Markers({ selectedDoorId, activeEntryId, onSelectDoor, onSelectEntry }: Props) {
  const chips: Chip[] = [];
  // label sits slightly inside the hallway, in front of the door
  const front = (c: Vec2, n: Vec2, k = 0.9): Vec2 => [c[0] - n[0] * k, c[1] - n[1] * k];
  (floorData.stairs ?? []).forEach((s, i) => {
    const xs = s.footprint.map((p) => p[0]), zs = s.footprint.map((p) => p[1]);
    chips.push({ key: s.id, entryId: s.id, pos: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2], label: `Scări ${i + 1}`, icon: <StairsIcon />, tone: 'text-emerald-600' });
  });
  const lifts = floorData.doors.filter((d) => d.type === 'elevator');
  cluster(lifts.map((d) => front(d.center, d.normal)), 3).forEach((p, i) =>
    chips.push({ key: `lift${i}`, entryId: 'lift', pos: p, label: 'Lift', icon: <ArrowUpDown size={12} strokeWidth={2.4} />, tone: 'text-slate-500' }),
  );
  floorData.doors.filter((d) => d.type === 'toilet').forEach((d) =>
    chips.push({ key: d.id, pos: front(d.center, d.normal), label: 'WC', icon: <span className="block h-2 w-2 rounded-full bg-teal-500" />, tone: '' }),
  );
  floorData.doors.filter((d) => d.type === 'lab').forEach((d) =>
    chips.push({ key: d.id, doorId: d.id, pos: front(d.center, d.normal), label: d.name ?? 'Lab', icon: <FlaskConical size={12} strokeWidth={2.4} />, tone: 'text-amber-600' }),
  );

  return (
    <group>
      {chips.map((c) => {
        const selected = (c.doorId && c.doorId === selectedDoorId) || (c.entryId && c.entryId === activeEntryId);
        const clickable = Boolean(c.doorId || c.entryId);
        return (
          <Html key={c.key} position={[c.pos[0], WALL_HEIGHT + 0.5, c.pos[1]]} center zIndexRange={[selected ? 30 : 20, 0]}>
            <button
              type="button"
              tabIndex={clickable ? 0 : -1}
              onClick={() => (c.doorId ? onSelectDoor(c.doorId) : c.entryId ? onSelectEntry(c.entryId) : undefined)}
              aria-pressed={selected ? true : undefined}
              className={`flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-md shadow-black/10 select-none transition-colors ${
                clickable ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
              } ${selected ? 'border-transparent bg-accent text-white' : 'border-border bg-surface-solid text-text hover:bg-accent-soft'}`}
            >
              <span className={selected ? 'text-white' : c.tone}>{c.icon}</span>
              {c.label}
            </button>
          </Html>
        );
      })}
    </group>
  );
}
