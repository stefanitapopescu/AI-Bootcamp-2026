import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { CATEGORY } from '../three/Markers';
import { phoneLayout } from '../device';
import { useT, type Dict } from '../i18n';

/**
 * First-run guided tour: dims the screen, cuts a spotlight around one real element at a time (found by its
 * `data-tour` attribute) and explains it in a card next to it. Ends with how to move the map (touch or mouse).
 * Steps whose element isn't on screen (e.g. the phone-only sheet handle on desktop) are skipped.
 */

interface Step {
  target?: string; // data-tour value; none = centered card
  title: string;
  body: ReactNode;
  wide?: boolean;
  phoneOnly?: boolean; // e.g. dragging the bottom sheet
}

const touch = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;
const phone = phoneLayout;

/** Small animated phone screen showing a gesture with finger dots. */
function Gesture({ kind, label, sub }: { kind: 'move' | 'zoom' | 'turn' | 'tilt'; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`gesture gesture-${kind} relative h-20 w-14 overflow-hidden rounded-xl border-2 border-border bg-surface-2`}>
        <span className="finger finger-a" />
        {kind !== 'move' && kind !== 'tilt' && <span className="finger finger-b" />}
      </div>
      <div className="mt-1.5 text-xs font-semibold text-text">{label}</div>
      <div className="text-[11px] leading-tight text-muted">{sub}</div>
    </div>
  );
}

/** Texts may mark words as <b>bold</b>; turn that into elements (no raw HTML is injected). */
function rich(text: string): ReactNode {
  return text.split(/(<b>.*?<\/b>)/g).map((part, i) => (part.startsWith('<b>') ? <b key={i}>{part.slice(3, -4)}</b> : part));
}

function steps(d: Dict): Step[] {
  const isTouch = touch();
  const t = d.tour;
  return [
    { title: t.welcomeTitle, body: rich(t.welcome) },
    { target: 'search', title: t.searchTitle, body: rich(t.search) },
    { target: 'chips', title: t.chipsTitle, body: rich(t.chips) },
    { target: 'floor', title: t.floorTitle, body: rich(t.floor) },
    { target: 'view', title: t.viewTitle, body: rich(t.view) },
    { target: 'directions', title: t.directionsTitle, body: rich(t.directions) },
    { target: 'sheet', phoneOnly: true, title: t.sheetTitle, body: rich(t.sheet) },
    {
      title: isTouch ? t.moveTitle : t.moveTitleMouse,
      wide: true,
      body: isTouch ? (
        <div className="grid grid-cols-4 gap-2 pt-1">
          <Gesture kind="move" label={t.gMove} sub={t.gMoveSub} />
          <Gesture kind="zoom" label={t.gZoom} sub={t.gZoomSub} />
          <Gesture kind="turn" label={t.gTurn} sub={t.gTurnSub} />
          <Gesture kind="tilt" label={t.gLook} sub={t.gLookSub} />
        </div>
      ) : (
        <ul className="space-y-1 pt-1">
          <li>{rich(t.mouse1)}</li>
          <li>{rich(t.mouse2)}</li>
          <li>{rich(t.mouse3)}</li>
        </ul>
      ),
    },
    {
      title: t.readyTitle,
      body: (
        <>
          {t.ready1}{' '}
          <span className={`inline-grid h-4 w-4 place-items-center rounded-full align-[-3px] text-white ${CATEGORY.lab.bg}`}>{CATEGORY.lab.icon}</span>{' '}
          {rich(t.ready2)}
        </>
      ),
    },
  ];
}

const visible = (el: Element | null) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' ? r : null;
};

export function Intro({ onDone }: { onDone: () => void }) {
  const d = useT();
  const all = useMemo(() => steps(d), [d]);
  // keep only steps whose element is actually on screen right now
  const [list, setList] = useState<Step[]>(all);
  useLayoutEffect(() => {
    setList(all.filter((s) => (!s.phoneOnly || phone()) && (!s.target || visible(document.querySelector(`[data-tour="${s.target}"]`)))));
  }, [all]);
  const [i, setI] = useState(0);
  const step = list[Math.min(i, list.length - 1)];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [cardH, setCardH] = useState(180);

  // measure the highlighted element (again on resize / rotation)
  useLayoutEffect(() => {
    const measure = () => setRect(step.target ? visible(document.querySelector(`[data-tour="${step.target}"]`)) : null);
    measure();
    const t = setTimeout(measure, 350); // after sheets / menus finish moving
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [step]);
  useLayoutEffect(() => { if (card.current) setCardH(card.current.offsetHeight); }, [step, rect]);
  useEffect(() => { next.current?.focus({ preventScroll: true }); }, [i]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, list.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [list.length, onDone]);

  const last = i >= list.length - 1;
  const W = window.innerWidth, H = window.innerHeight;
  const PAD = 6; // spotlight margin around the element
  const width = Math.min(step.wide ? 380 : 340, W - 24);

  // card: below the element if it fits, else above; centered when there is no element
  let style: React.CSSProperties;
  if (rect) {
    const below = rect.bottom + PAD + 12;
    const top = below + cardH < H - 12 ? below : Math.max(12, rect.top - PAD - 12 - cardH);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), W - width - 12);
    style = { top, left, width };
  } else {
    style = { top: Math.max(12, (H - cardH) / 2), left: (W - width) / 2, width };
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={d.tour.label} className="fixed inset-0 z-[70]">
      {/* dim layer with a spotlight hole (a big shadow around the highlighted box); blocks taps on the app */}
      <div
        className="pointer-events-auto absolute rounded-2xl transition-all duration-300 ease-out"
        style={
          rect
            ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD, boxShadow: '0 0 0 9999px rgba(8,12,20,0.6)' }
            : { top: H / 2, left: W / 2, width: 0, height: 0, boxShadow: '0 0 0 9999px rgba(8,12,20,0.6)' }
        }
      />
      {rect && <div className="pointer-events-none absolute rounded-2xl ring-2 ring-white/90 transition-all duration-300 ease-out" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD }} />}

      <div ref={card} className="absolute rounded-3xl bg-surface-solid p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-[top,left] duration-300 ease-out" style={style} aria-live="polite">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-base leading-snug font-semibold text-text">{step.title}</h2>
          <button onClick={onDone} aria-label={d.tour.skipTour} className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2">
            <X size={16} />
          </button>
        </div>
        <div className="mt-1 text-sm leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-text">{step.body}</div>

        <div className="mt-4 flex items-center gap-2">
          {/* progress dots */}
          <div className="flex min-w-0 flex-1 flex-wrap gap-1" aria-label={d.tour.stepOf(i + 1, list.length)}>
            {list.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-4 bg-accent' : 'w-1.5 bg-border'}`} />
            ))}
          </div>
          {i === 0 ? (
            <button onClick={onDone} className="shrink-0 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-muted hover:bg-surface-2">{d.tour.skip}</button>
          ) : (
            <button onClick={() => setI(i - 1)} aria-label={d.back} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2">
              <ArrowLeft size={18} />
            </button>
          )}
          <button
            ref={next}
            onClick={() => (last ? onDone() : setI(i + 1))}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-sm active:opacity-90 dark:text-[#0b1f3a]"
          >
            {i === 0 ? d.tour.showMe : last ? d.tour.done : d.tour.next} {!last && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
