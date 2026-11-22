import { useState, type ReactNode, type RefObject } from 'react';
import { Check, ChevronDown, CircleHelp, Info, Layers3, LocateFixed, Minus, Moon, PersonStanding, Plus, Sun, X } from 'lucide-react';
import type { ViewMode } from '../three/CameraRig';
import { CATEGORY, type Category } from '../three/Markers';
import type { FloorId } from '../map/building';
import { useT, type Lang } from '../i18n';

interface Props {
  view: ViewMode;
  dark: boolean;
  floors: { id: FloorId; name: string }[]; // bottom to top
  floorView: FloorId | 'all';
  activeFloor: FloorId; // remembered floor (outlined in the all-floors view)
  onFloorView: (v: FloorId | 'all') => void;
  compact: boolean; // no search bar above (directions mode): start higher on phones
  compassRef: RefObject<HTMLSpanElement>;
  onToggleView: () => void;
  walker: boolean | null; // null: no route, button hidden
  onToggleWalker: () => void;
  onRecenter: () => void;
  onToggleTheme: () => void;
  onHelp: () => void; // replay the intro tour
  lang: Lang;
  onToggleLang: () => void;
  onZoom: (factor: number) => void;
  onResetHeading: () => void;
}

const SHADOW = 'shadow-[0_2px_6px_rgba(0,0,0,0.2)]';
const CELL = 'grid h-10 w-10 place-items-center sm:h-11 sm:w-11';

/** One icon button inside a grouped pill. */
function PillButton({ label, onClick, children, pressed }: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={`${CELL} transition-colors hover:text-text active:bg-surface-2 ${pressed ? 'text-accent' : 'text-muted'}`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-2 h-px bg-border" />;

const LEGEND: { cat: Category; key: 'legendLab' | 'legendToilet' | 'legendStairs' | 'legendLift' }[] = [
  { cat: 'lab', key: 'legendLab' },
  { cat: 'toilet', key: 'legendToilet' },
  { cat: 'stairs', key: 'legendStairs' },
  { cat: 'lift', key: 'legendLift' },
];

function Legend({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <div role="dialog" aria-label={t.mapLegend} className={`absolute top-0 right-12 w-52 rounded-2xl sm:right-14 bg-surface-solid p-3 ${SHADOW}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-text">{t.legend}</span>
        <button onClick={onClose} aria-label={t.closeLegend} className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-surface-2">
          <X size={14} />
        </button>
      </div>
      <ul className="space-y-1.5 text-xs text-text">
        {LEGEND.map((l) => (
          <li key={l.key} className="flex items-center gap-2">
            <span className={`grid h-5 w-5 place-items-center rounded-full text-white ${CATEGORY[l.cat].bg}`}>{CATEGORY[l.cat].icon}</span>
            {t[l.key]}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center"><span className="h-1.5 w-4 rounded-sm bg-[var(--scene-room)]" /></span>
          {t.legendOtherDoor}
        </li>
        <li className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center"><span className="h-1 w-5 rounded-full border-t-[3px] border-dashed border-accent" /></span>
          {t.legendRoute}
        </li>
        <li className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center"><span className="h-3.5 w-5 rounded-sm border border-[var(--scene-site-edge)] bg-[var(--scene-site-room)]" /></span>
          {t.legendRooms}
        </li>
        <li className="flex items-center gap-2">
          <span className="rounded bg-accent px-1 text-[9px] leading-[14px] font-bold text-white uppercase dark:text-[#0b1f3a]">{t.pillFrom}</span>
          {t.legendStart}
        </li>
        <li className="flex items-center gap-2">
          <span className="rounded bg-pin px-1.5 text-[9px] leading-[14px] font-bold text-white uppercase">{t.pillTo}</span>
          {t.legendDestination}
        </li>
      </ul>
    </div>
  );
}

/** Floor dropdown: "Etaj 6 ▾", opens the list of floors and the all-floors (exploded) view. */
function FloorMenu({ floors, floorView, activeFloor, onFloorView }: Pick<Props, 'floors' | 'floorView' | 'activeFloor' | 'onFloorView'>) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const current = floorView === 'all' ? t.allFloors : floors.find((f) => f.id === floorView)?.name;
  const pick = (v: FloorId | 'all') => { setOpen(false); onFloorView(v); };
  const item = 'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-surface-2';
  return (
    <div className="relative" data-overlay="top" data-tour="floor">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.floor}: ${current}`}
        className={`flex h-10 items-center gap-1.5 rounded-full bg-surface-solid pr-2.5 pl-3.5 text-sm font-semibold whitespace-nowrap text-text sm:h-11 ${SHADOW}`}
      >
        {floorView === 'all' && <Layers3 size={16} className="text-accent" />}
        {current}
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" className={`absolute top-full right-0 z-10 mt-2 w-48 overflow-hidden rounded-2xl bg-surface-solid py-1 ${SHADOW}`}>
            {[...floors].reverse().map((f) => (
              <button key={f.id} role="menuitemradio" aria-checked={floorView === f.id} onClick={() => pick(f.id)} className={`${item} ${floorView === f.id ? 'text-accent' : 'text-text'}`}>
                <span className="w-4">{floorView === f.id && <Check size={16} />}</span>
                {f.name}
                {floorView === 'all' && activeFloor === f.id && <span className="ml-auto text-[11px] font-normal text-muted">{t.lastViewed}</span>}
              </button>
            ))}
            <span className="mx-3 my-1 block h-px bg-border" />
            <button role="menuitemradio" aria-checked={floorView === 'all'} onClick={() => pick('all')} className={`${item} ${floorView === 'all' ? 'text-accent' : 'text-text'}`}>
              <span className="w-4">{floorView === 'all' ? <Check size={16} /> : <Layers3 size={15} className="text-muted" />}</span>
              {t.allFloors} <span className="ml-auto text-[11px] font-normal text-muted">3D</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Floating map controls on the right, grouped in pills like Google/Apple Maps. */
export function MapButtons(p: Props) {
  const t = useT();
  const [legend, setLegend] = useState(false);
  return (
    <div
      data-overlay
      // the column is as wide as the floor menu: only the buttons take taps, the empty part beside them is map
      className={`pointer-events-none *:pointer-events-auto absolute right-3 z-40 flex flex-col items-end gap-2 sm:top-4 sm:right-4 sm:gap-2.5 ${
        p.compact ? 'top-[max(0.75rem,env(safe-area-inset-top))]' : 'top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)]'
      }`}
    >
      <FloorMenu floors={p.floors} floorView={p.floorView} activeFloor={p.activeFloor} onFloorView={p.onFloorView} />

      <div data-tour="view" className={`relative flex flex-col rounded-full bg-surface-solid ${SHADOW}`}>
        {/* shows the current mode; tap to switch (2D = flat map from above, 3D = tilted) */}
        <PillButton label={p.view === '3d' ? t.to2D : t.to3D} onClick={p.onToggleView}>
          <span className="text-[13px] font-bold tracking-tight text-text">{p.view === '3d' ? '3D' : '2D'}</span>
        </PillButton>
        <Divider />
        {/* compass: the red tip points to the default orientation; tap to turn back */}
        <PillButton label={t.resetRotation} onClick={p.onResetHeading}>
          <span ref={p.compassRef} className="block">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2l3.5 10h-7z" fill="var(--pin)" />
              <path d="M12 22l-3.5-10h7z" fill="currentColor" opacity="0.55" />
              <circle cx="12" cy="12" r="1.6" fill="var(--surface-solid)" />
            </svg>
          </span>
        </PillButton>
        <Divider />
        <PillButton label={t.legend} onClick={() => setLegend((l) => !l)} pressed={legend}>
          <Info size={19} />
        </PillButton>
        <Divider />
        <PillButton label={p.dark ? t.lightTheme : t.darkTheme} onClick={p.onToggleTheme}>
          {p.dark ? <Sun size={19} /> : <Moon size={19} />}
        </PillButton>
        <Divider />
        {/* language: shows the current one; tap to switch */}
        <PillButton label={t.language} onClick={p.onToggleLang}>
          <span className="text-[12px] font-bold tracking-tight text-text">{p.lang === 'en' ? 'EN' : 'RO'}</span>
        </PillButton>
        <Divider />
        <PillButton label={t.help} onClick={p.onHelp}>
          <CircleHelp size={19} />
        </PillButton>
        {legend && <Legend onClose={() => setLegend(false)} />}
      </div>

      {/* the little walking guy: optional, only while a route is shown */}
      {p.walker !== null && (
        <button
          onClick={p.onToggleWalker}
          aria-pressed={p.walker}
          aria-label={p.walker ? t.walkerOff : t.walkerOn}
          title={p.walker ? t.walkerOff : t.walkerOn}
          className={`grid h-10 w-10 place-items-center rounded-full sm:h-11 sm:w-11 ${SHADOW} ${p.walker ? 'bg-[var(--scene-walker)] text-[#3c2f00]' : 'bg-surface-solid text-muted'}`}
        >
          <PersonStanding size={20} />
        </button>
      )}

      {/* zoom + recenter: desktop only (phones pinch, and get a floating locate button) */}
      <div className={`hidden flex-col rounded-full bg-surface-solid sm:flex [@media(max-height:560px)]:hidden ${SHADOW}`}>
        <PillButton label={t.zoomIn} onClick={() => p.onZoom(0.7)}><Plus size={19} /></PillButton>
        <Divider />
        <PillButton label={t.zoomOut} onClick={() => p.onZoom(1.4)}><Minus size={19} /></PillButton>
      </div>
      <div className={`hidden rounded-full bg-surface-solid sm:block ${SHADOW}`}>
        <PillButton label={t.recenter} onClick={p.onRecenter}><LocateFixed size={19} /></PillButton>
      </div>
    </div>
  );
}

/** Scale bar (bottom-left), width/text updated by the camera rig every frame. */
export function ScaleBar({ barRef, textRef }: { barRef: RefObject<HTMLDivElement>; textRef: RefObject<HTMLSpanElement> }) {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-30 flex items-end gap-1.5 sm:bottom-4 sm:left-4">
      <div ref={barRef} className="h-2 w-16 border-x-2 border-b-2 border-text/70" />
      <span ref={textRef} className="map-label text-[11px] leading-none font-semibold text-text">5 m</span>
    </div>
  );
}
