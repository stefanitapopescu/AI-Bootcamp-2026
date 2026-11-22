import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { LocateFixed } from 'lucide-react';
import { useT } from '../i18n';
import { phoneLayout } from '../device';

/** Phone bottom sheet states: just the title strip, the default peek, or fully open. */
export type SheetState = 'min' | 'peek' | 'full';

const DRAG_START = 8; // px before a press on the header becomes a drag (taps on its buttons still work)
const SNAP = 40; // px of drag that changes the state

/**
 * Phone bottom sheet behavior, shared by every panel:
 * - drag the top of the sheet (handle + header) up or down; it follows the finger and snaps min / peek / full
 * - tap the handle: min → peek → full → peek
 * - a tap on the map (`collapseSignal` changes) slides it down to its title strip
 * Desktop panels are floating cards: none of this applies there (classes are phone-only).
 */
export function useBottomSheet(collapseSignal: number, initial: SheetState = 'peek') {
  const [state, setState] = useState<SheetState>(initial);
  const sheet = useRef<HTMLElement>(null);
  const header = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; id: number; base: number; active: boolean } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // only a tap that happens while this sheet is open collapses it (not taps from before it opened)
  const seen = useRef(collapseSignal);
  useEffect(() => {
    if (collapseSignal !== seen.current) { seen.current = collapseSignal; setState('min'); }
  }, [collapseSignal]);

  const isPhone = phoneLayout;
  /** How far down the sheet slides when minimized: exactly so that the header (handle + title) stays visible. */
  const minOffset = () => {
    const el = sheet.current, h = header.current;
    if (!el || !h) return 0;
    // keep only the phone's home-indicator inset (if any) below the header; the normal bottom padding would show
    // a sliver of the content under the header
    const pad = parseFloat(getComputedStyle(el).paddingBottom) || 0;
    const safe = pad > 12.5 ? pad - 12 : 0;
    return Math.max(0, el.offsetHeight - (h.offsetTop + h.offsetHeight) - safe);
  };
  /** Put the sheet where its state says (animated by the CSS transition). */
  const place = (s: SheetState = stateRef.current) => {
    const el = sheet.current;
    if (!el) return;
    const min = isPhone() && s === 'min';
    el.style.transform = min ? `translateY(${minOffset()}px)` : '';
    el.classList.toggle('sheet-min', min); // fades out everything below the header (index.css)
  };
  useLayoutEffect(() => {
    place(state);
    const el = sheet.current;
    if (!el) return;
    // content can change height while minimized (e.g. a new route): keep exactly the header visible
    const ro = new ResizeObserver(() => { if (!drag.current?.active) place(); });
    ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const offset = (el: HTMLElement) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42; // current translateY

  const onPointerDown = (e: RPointerEvent) => {
    if (!sheet.current || !isPhone()) return;
    drag.current = { y0: e.clientY, id: e.pointerId, base: offset(sheet.current), active: false };
  };
  const onPointerMove = (e: RPointerEvent) => {
    const d = drag.current, el = sheet.current;
    if (!d || !el || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      if (Math.abs(dy) < DRAG_START) return;
      d.active = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); // only now, so plain taps still reach buttons
      el.style.transition = 'none';
    }
    // follows the finger, but never lower than the minimized strip; above the open position it resists
    const y = Math.min(d.base + dy, minOffset());
    el.style.transform = `translateY(${y < 0 ? y / 4 : y}px)`;
  };
  const onPointerUp = (e: RPointerEvent) => {
    const d = drag.current, el = sheet.current;
    drag.current = null;
    if (!d || !el || !d.active) return;
    const dy = e.clientY - d.y0;
    el.style.transition = '';
    const next: SheetState = dy < -SNAP ? (state === 'min' ? 'peek' : 'full') : dy > SNAP ? (state === 'full' ? 'peek' : 'min') : state;
    if (next === state) place(state); // snap back (animated)
    else setState(next);
  };

  return {
    state,
    setState,
    expanded: state === 'full',
    /** spread on the <section>: phone slide animation */
    sheetProps: {
      ref: sheet as React.RefObject<HTMLElement & HTMLDivElement>,
      className: 'transition-transform duration-300 ease-out',
    },
    /** spread on the draggable top part (handle + header): its bottom edge is where the minimized strip ends */
    dragProps: { ref: header, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, className: 'sheet-header max-sm:touch-none' },
  };
}

/** Drag handle of a phone bottom sheet (the drag itself is on the whole header via useBottomSheet). */
export function SheetHandle({ state, onChange }: { state: SheetState; onChange: (s: SheetState) => void }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-label={state === 'full' ? t.collapsePanel : t.expandPanel}
      aria-expanded={state === 'full'}
      className="flex h-6 w-full shrink-0 items-center justify-center sm:hidden"
      onClick={() => onChange(state === 'min' ? 'peek' : state === 'peek' ? 'full' : 'peek')}
    >
      <span className="h-1 w-10 rounded-full bg-border" />
    </button>
  );
}

/** Round "locate / recenter" button floating just above a phone bottom sheet (or the screen bottom). */
export function LocateFab({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      aria-label={t.recenter}
      title={t.recenter}
      className={`sheet-fab grid h-11 w-11 place-items-center rounded-full bg-surface-solid text-accent shadow-[0_2px_6px_rgba(0,0,0,0.25)] active:bg-surface-2 sm:hidden ${className}`}
    >
      <LocateFixed size={20} />
    </button>
  );
}

/**
 * Extra content of a phone bottom sheet (shown when it is pulled all the way up). Opens and closes with the same
 * smooth slide as the sheet (animated grid rows + fade) instead of popping in. Always open on desktop.
 */
export function SheetMore({ open, children, className = '' }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out sm:grid-rows-[1fr] sm:opacity-100 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'} ${className}`}
      aria-hidden={!open || undefined}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
