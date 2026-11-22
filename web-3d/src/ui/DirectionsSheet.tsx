import { LocateFab, SheetHandle, SheetMore, useBottomSheet } from './Sheet';
import {
  ArrowLeft, ArrowUp, ArrowUpDown, ArrowUpLeft, ArrowUpRight, ChevronDown, CornerUpLeft, CornerUpRight,
  ChevronsDown, ChevronsUp, Footprints, Layers3, MapPin, LogOut, Navigation, X,
} from 'lucide-react';
import type { EntryPoint, Origin, Route } from '../nav/navigation';
import type { Step, StepKind } from '../nav/directions';
import { etaText, type Trip } from '../nav/trip';
import { floorById, gid, type FloorId } from '../map/building';
import { CATEGORY, StairsIcon } from '../three/Markers';
import type { Place } from './SearchBar';
import { useT, type Dict } from '../i18n';

/** Walking time like a maps app: seconds under a minute (rounded to 5 s), minutes above. */
export const eta = (r: Route) => {
  const sec = r.minutes * 60;
  return sec < 60 ? `${Math.max(5, Math.round(sec / 5) * 5)} sec` : `${Math.round(sec / 60)} min`;
};

const STEP_ICON: Record<StepKind, typeof ArrowUp> = {
  depart: LogOut,
  straight: ArrowUp,
  left: CornerUpLeft,
  right: CornerUpRight,
  'slight-left': ArrowUpLeft,
  'slight-right': ArrowUpRight,
  arrive: MapPin,
  up: ChevronsUp,
  down: ChevronsDown,
};

interface Props {
  origin: Origin | null;
  originLabel?: string; // name + floor
  place: Place | null;
  placeLabel?: string;
  entries: EntryPoint[];
  entryRoutes: (Route | null)[]; // entry -> destination (same floor), same order as entries
  trip: Trip | null; // the chosen route
  trips: Trip[]; // every option, fastest first
  onPickRoute: (id: string) => void;
  floorView: FloorId | 'all';
  onFloorView: (v: FloorId | 'all') => void;
  steps: Step[];
  isFastest: boolean;
  onPickFrom: () => void;
  onPickTo: () => void;
  onSwap?: () => void; // undefined when the start can't be a destination (stairs, lift)
  onChooseEntry: (id: string) => void;
  onShowRoute: () => void;
  onBack: () => void;
  onClose: () => void;
  collapseSignal: number;
  navStarted: boolean; // false: choosing a route (preview); true: navigating
  onStart: () => void;
  onChangeRoute: () => void;
}

/** "Via Scări 2", "By lift", "Shortest way" (in the current language). */
const routeName = (t: Trip, d: Dict) =>
  t.transfer ? (t.transfer.entry.kind === 'lift' ? d.byLift : d.via(t.transfer.entry.name)) : t.id === 'alt' ? d.otherWay : d.shortestWay;

function Field({ label, value, placeholder, onClick, dot }: { label: string; value?: string; placeholder: string; onClick: () => void; dot: 'from' | 'to' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid w-4 place-items-center">
        {dot === 'from' ? (
          <span className="h-3 w-3 rounded-full border-[3px] border-accent bg-surface-solid" />
        ) : (
          <MapPin size={16} className="text-pin" fill="currentColor" stroke="var(--surface-solid)" />
        )}
      </span>
      <button
        onClick={onClick}
        aria-label={`${label}: ${value ?? placeholder}`}
        className="flex h-9 min-w-0 flex-1 items-center rounded-xl sm:h-10 border border-border bg-surface-2 px-3 text-left text-sm hover:border-accent"
      >
        <span className={`truncate ${value ? 'font-medium text-text' : 'text-muted'}`}>{value ?? placeholder}</span>
      </button>
    </div>
  );
}

/** Maps-style directions panel: From / To fields with swap, ETA, quick entry choices and turn-by-turn steps.
 *  Phones: bottom sheet that opens as a peek (From/To + time); swipe up for entry choices and steps. */
export function DirectionsSheet(p: Props) {
  const t = useT();
  const d = t;
  const sheet = useBottomSheet(p.collapseSignal);
  const expanded = sheet.expanded;
  const same = p.origin && p.place && p.origin.id === p.place.id;
  const tr = p.trip?.transfer ?? null;

  const chips = p.place && (
    <div className="pt-3">
      <div className="mb-1.5 text-xs font-medium text-muted">{t.arrivingOn(p.place ? floorById(p.place.floor).name : '')}</div>
      <div className="flex gap-2">
        {p.entries.map((e, i) => {
          const r = p.entryRoutes[i];
          const active = !!p.place && gid(p.place.floor, e.id) === p.origin?.id;
          return (
            <button
              key={e.id}
              onClick={() => p.onChooseEntry(e.id)}
              aria-pressed={active}
              className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-2xl border px-2 py-1.5 text-left text-xs transition-colors ${
                active ? 'border-accent bg-accent-soft text-text' : 'border-border text-muted hover:bg-surface-2'
              }`}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${e.kind === 'lift' ? CATEGORY.lift.bg : CATEGORY.stairs.bg}`}>
                {e.kind === 'lift' ? <ArrowUpDown size={12} strokeWidth={2.6} /> : <StairsIcon size={12} />}
              </span>
              <span className="min-w-0 leading-tight">
                <span className={`block truncate font-semibold ${active ? 'text-text' : ''}`}>{e.name}</span>
                <span className="block truncate">{r ? eta(r) : '—'}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const message = (text: string) => <div className="mt-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm text-muted">{text}</div>;

  return (
    <section
      data-overlay
      aria-label={t.directions}
      ref={sheet.sheetProps.ref}
      className={`absolute inset-x-0 bottom-0 [@media(orientation:landscape)]:right-auto [@media(orientation:landscape)]:w-[26rem] [@media(orientation:landscape)]:max-w-full z-40 flex max-h-[75dvh] flex-col rounded-t-3xl bg-surface-solid pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:bottom-auto sm:top-[4.5rem] sm:left-4 sm:max-h-[calc(100dvh-5.5rem)] sm:w-[380px] sm:rounded-3xl sm:pb-3 sm:shadow-[0_2px_10px_rgba(0,0,0,0.2)] ${sheet.sheetProps.className}`}
    >
      {/* left side: the right column (floor menu, map buttons, walker) is tall here and would collide */}
      {!expanded && <LocateFab onClick={p.onShowRoute} className="absolute -top-14 left-3" />}
      <div {...sheet.dragProps}>
      <SheetHandle state={sheet.state} onChange={sheet.setState} />

      {/* header */}
      <div className="flex shrink-0 items-center gap-1 px-2 sm:pt-2">
        <button onClick={p.onBack} aria-label={t.back} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2">
          <ArrowLeft size={20} />
        </button>
        {p.trip && !same ? (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[15px] font-semibold text-text">
              {p.navStarted ? `${etaText(p.trip.seconds)} · ${routeName(p.trip, t)}` : t.chooseRoute}
            </div>
            <div className="truncate text-xs text-muted">
              {p.navStarted
                ? tr ? `${floorById(tr.from).name} → ${floorById(tr.to).name}` : floorById(p.trip.legs[0].floor).name
                : `${etaText(p.trip.seconds)} · ${routeName(p.trip, t)}`}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-1.5 text-sm font-semibold text-text">
            <Footprints size={16} className="text-accent" /> {t.walkingDirections}
          </div>
        )}
        <button onClick={p.onClose} aria-label={t.closeDirections} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2">
          <X size={18} />
        </button>
      </div>

      </div>

      {/* from / to (while navigating: only in the pulled-up sheet, the map needs the room) */}
      <SheetMore open={!p.navStarted || expanded} className="shrink-0">
      <div className="flex items-center gap-2 px-4 pt-1">
        <div className="relative flex flex-1 flex-col gap-2">
          <span aria-hidden className="absolute top-[24px] bottom-[24px] left-[7px] border-l-2 border-dotted border-muted/60" />
          <Field label={t.from} dot="from" value={p.originLabel} placeholder={t.chooseStart} onClick={p.onPickFrom} />
          <Field label={t.to} dot="to" value={p.placeLabel} placeholder={t.chooseDestination} onClick={p.onPickTo} />
        </div>
        <button
          onClick={p.onSwap}
          disabled={!p.onSwap}
          aria-label={t.swap}
          title={p.onSwap ? t.swap : t.swapDisabled}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-35"
        >
          <ArrowUpDown size={18} />
        </button>
      </div>
      </SheetMore>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        {same ? (
          message(t.sameEnds)
        ) : !p.origin || !p.place ? (
          message(!p.origin ? t.needStart : t.needDestination)
        ) : p.trip ? (
          <>
            {!p.navStarted ? (
              <>
                {/* preview: every route, fastest first; tapping one shows it on the map */}
                <div role="radiogroup" aria-label={t.routes} className="mt-3 space-y-1.5">
                  {p.trips.map((t, i) => {
                    const on = t === p.trip;
                    const kind = t.transfer?.entry.kind;
                    const ttr = t.transfer;
                    return (
                      <button
                        key={t.id}
                        role="radio"
                        aria-checked={on}
                        onClick={() => p.onPickRoute(t.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${on ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'}`}
                      >
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${kind === 'lift' ? CATEGORY.lift.bg : kind ? CATEGORY.stairs.bg : 'bg-accent'}`}>
                          {kind === 'lift' ? <ArrowUpDown size={15} strokeWidth={2.6} /> : kind ? <StairsIcon size={15} /> : <Footprints size={15} />}
                        </span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block text-sm font-semibold text-text">{routeName(t, d)}</span>
                          <span className="block truncate text-xs text-muted">
                            {Math.round(t.meters)} m {d.walking}{ttr ? ` · ${ttr.entry.kind === 'lift' ? d.lift : d.stairs} ${floorById(ttr.from).level}→${floorById(ttr.to).level}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-right leading-tight">
                          <span className={`block text-[15px] font-semibold ${i === 0 ? 'text-success' : 'text-text'}`}>{etaText(t.seconds)}</span>
                          {i === 0 && <span className="block text-[10px] font-bold tracking-wide text-success uppercase">{d.fastest}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={p.onStart}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-[15px] font-semibold text-white shadow-sm active:opacity-90 dark:text-[#0b1f3a]"
                >
                  <Navigation size={17} /> {t.start}
                </button>
                <SheetMore open={expanded}>{chips}</SheetMore>
              </>
            ) : (
              <>
            {/* trips over two floors: look at both floors at once, or one floor at a time (phones: in the expanded sheet,
                the floor menu on the map does the same) */}
            {tr && (
              <div role="group" aria-label={t.showFloor} className="mt-3 flex gap-1.5">
                {(['all', tr.from, tr.to] as const).map((v) => {
                  const on = p.floorView === v;
                  const leg = v === 'all' ? null : p.trip!.legs.find((l) => l.floor === v);
                  return (
                    <button
                      key={v}
                      onClick={() => p.onFloorView(v)}
                      aria-pressed={on}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-xs font-semibold transition-colors ${
                        on ? 'border-accent bg-accent-soft text-text' : 'border-border text-muted hover:bg-surface-2'
                      }`}
                    >
                      {v === 'all' ? <><Layers3 size={13} /> {t.bothFloors}</> : <>{floorById(v).name} <span className="font-normal">{leg ? etaText(leg.route.meters / 1.3) : ''}</span></>}
                    </button>
                  );
                })}
              </div>
            )}
            {/* phones, collapsed: hint that there is more */}
            {!expanded && (
              <button onClick={() => sheet.setState('full')} className="mt-1 flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-accent sm:hidden">
                {t.stepsHint(p.steps.length)} <ChevronDown size={14} className="rotate-180" />
              </button>
            )}
            <SheetMore open={expanded}>
              <div className="mt-3 mb-1 text-sm font-medium text-text">
                {t.steps} <span className="text-muted">({p.steps.length})</span>
              </div>
              <ol className="pb-1">
                {p.steps.map((s, i) => {
                  const Icon = STEP_ICON[s.kind];
                  const heading = tr && s.floor && (i === 0 || p.steps[i - 1].floor !== s.floor);
                  const edge = s.kind === 'depart' || s.kind === 'arrive';
                  return (
                    <li key={i} className="border-b border-border last:border-b-0">
                      {heading && (
                        <button onClick={() => p.onFloorView(s.floor as FloorId)} className="mt-2 mb-0.5 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-accent uppercase">
                          <Layers3 size={12} /> {floorById(s.floor as FloorId).name}
                        </button>
                      )}
                      <div className="flex items-center gap-3 py-2">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${edge ? (s.kind === 'arrive' ? 'bg-pin text-white' : 'bg-accent text-white dark:text-[#0b1f3a]') : s.kind === 'up' || s.kind === 'down' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-text'}`}>
                        <Icon size={15} strokeWidth={2.4} />
                      </span>
                      <span className={`text-sm ${s.kind === 'up' || s.kind === 'down' ? 'font-semibold text-accent' : 'text-text'}`}>{s.text}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <button onClick={p.onChangeRoute} className="mb-1 w-full rounded-full border border-border py-2 text-sm font-medium text-accent hover:bg-accent-soft">
                {t.changeRoute}
              </button>
            </SheetMore>
              </>
            )}
          </>
        ) : (
          message(t.noRoute)
        )}
        {/* entry shortcuts stay reachable when there is no route yet */}
        {(!p.trip || same) && <SheetMore open={expanded}>{chips}</SheetMore>}
      </div>
    </section>
  );
}
