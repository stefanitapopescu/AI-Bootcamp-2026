import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Crosshair, Layers, Map as MapIcon, Moon, Navigation, RotateCcw, Sun, X } from 'lucide-react';
import { Scene } from './three/Scene';
import type { ViewMode } from './three/CameraRig';
import { readSceneColors, type SceneColors, type ThemeName } from './three/theme';
import type { CameraFocus } from './three/CameraRig';
import { floorData } from './map/floor';
import { buildGrid, doorGoal, entryPoints, findRoute } from './nav/navigation';

// navigation data is static per floor: build once
const ENTRIES = entryPoints(floorData);
const LABS = floorData.doors.filter((d) => d.type === 'lab').sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ro', { numeric: true }));
const GRID = buildGrid(floorData);

function initialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [colors, setColors] = useState<SceneColors | null>(null);
  const [view, setView] = useState<ViewMode>('3d');
  const [resetKey, setResetKey] = useState(0);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [doorId, setDoorId] = useState<string | null>(null);
  const [follow, setFollow] = useState(true); // camera follows the route until the user resets the view
  const [focusNonce, setFocusNonce] = useState(0);

  const entry = ENTRIES.find((e) => e.id === entryId) ?? null;
  const door = LABS.find((d) => d.id === doorId) ?? null;
  const route = useMemo(() => (entry && door ? findRoute(GRID, entry.pos, doorGoal(door)) : null), [entry, door]);
  const focus: CameraFocus | null =
    route && entry && follow ? { key: `${entry.id}>${door?.id}#${focusNonce}`, points: route.points, facing: entry.facing } : null;

  const chooseEntry = (id: string) => { setEntryId(id); setFollow(true); };
  const chooseDoor = (id: string) => { setDoorId(id); setFollow(true); };
  const clearRoute = () => { setDoorId(null); setEntryId(null); setResetKey((k) => k + 1); };
  const overview = () => { setFollow(false); setResetKey((k) => k + 1); };

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
    setColors(readSceneColors());
  }, [theme]);

  return (
    <div className="relative h-full w-full">
      {colors && (
        <Scene
          colors={colors}
          view={view}
          resetKey={resetKey}
          dark={theme === 'dark'}
          route={route}
          focus={focus}
          selectedDoorId={doorId}
          activeEntryId={entryId}
          onSelectDoor={chooseDoor}
          onSelectEntry={chooseEntry}
        />
      )}

      {/* top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center p-3 sm:justify-start sm:p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white">
            <MapIcon size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">UPT Navigator</div>
            <div className="text-xs text-muted">Floor plan · hallways</div>
          </div>
        </div>
      </header>

      {/* view controls */}
      <div className="absolute top-20 right-3 z-40 flex flex-col items-end gap-2 sm:top-auto sm:right-4 sm:bottom-4">
        <div className="flex rounded-xl border border-border bg-surface p-1 shadow-lg shadow-black/5 backdrop-blur-xl">
          <Segment active={view === '3d'} onClick={() => { setView('3d'); overview(); }} icon={<Box size={16} />} label="3D" />
          <Segment active={view === 'top'} onClick={() => { setView('top'); overview(); }} icon={<Layers size={16} />} label="Top" />
        </div>
        <div className="flex gap-2">
          <IconButton label={theme === 'dark' ? 'Light theme' : 'Dark theme'} onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <IconButton label="Reset view" onClick={overview}>
            <RotateCcw size={18} />
          </IconButton>
        </div>
      </div>

      {/* navigation panel */}
      <section
        aria-label="Navigation"
        className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-2xl border border-border bg-surface p-3 shadow-lg shadow-black/10 backdrop-blur-xl sm:inset-x-auto sm:left-4 sm:bottom-4 sm:w-80"
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Navigation size={16} className="text-accent" /> Navigate to a lab
          {(entry || door) && (
            <button onClick={clearRoute} aria-label="Clear route" title="Clear route" className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-accent-soft hover:text-text">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mb-1 text-[11px] font-medium tracking-wide text-muted uppercase">From</div>
        <div className="mb-2.5 flex gap-1 rounded-xl bg-accent-soft/60 p-1">
          {ENTRIES.map((e) => (
            <button
              key={e.id}
              onClick={() => chooseEntry(e.id)}
              aria-pressed={e.id === entryId}
              className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                e.id === entryId ? 'bg-accent text-white shadow-sm' : 'text-text hover:bg-surface-solid'
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>

        <label htmlFor="dest" className="mb-1 block text-[11px] font-medium tracking-wide text-muted uppercase">To</label>
        <select
          id="dest"
          value={doorId ?? ''}
          onChange={(e) => e.target.value && chooseDoor(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-solid px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="" disabled>
            Choose a lab (or tap one on the map)
          </option>
          {LABS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <div className="mt-2.5 min-h-9 text-sm">
          {route && door ? (
            <div className="flex items-center gap-2">
              <div className="leading-tight">
                <div className="font-semibold">
                  {entry?.name} → {door.name}
                </div>
                <div className="text-xs text-muted">
                  {Math.round(route.meters)} m · ~{Math.max(1, Math.round(route.minutes))} min walk
                </div>
              </div>
              <button
                onClick={() => { setFollow(true); setFocusNonce((n) => n + 1); }}
                className="ml-auto flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm"
              >
                <Crosshair size={14} /> Show route
              </button>
            </div>
          ) : (
            <div className="text-xs text-muted">
              {!entry && !door && 'Pick where you enter the floor and the lab you want to reach.'}
              {!entry && door && 'Where are you coming from? Pick stairs or lift above.'}
              {entry && !door && 'Now pick a lab, from the list or on the map.'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Segment({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-text'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function IconButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-11 w-11 place-items-center rounded-xl border border-border shadow-lg shadow-black/5 backdrop-blur-xl transition-colors ${
        active ? 'bg-accent text-white' : 'bg-surface text-text hover:bg-accent-soft'
      }`}
    >
      {children}
    </button>
  );
}
