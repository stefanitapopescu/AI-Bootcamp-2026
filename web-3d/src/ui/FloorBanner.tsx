import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Layers } from 'lucide-react';
import { floorById, type FloorId } from '../map/building';
import { useT } from '../i18n';

/**
 * Short "↑ Etaj 7" announcement when the map switches to another floor, so it is clear that
 * you are now looking at a different floor (the scene animates the floors at the same time).
 */
export function FloorBanner({ floorView, via }: { floorView: FloorId | 'all'; via?: string }) {
  const t = useT();
  const prev = useRef(floorView);
  const [shown, setShown] = useState<{ floor: FloorId; dir: number; n: number } | null>(null);

  useEffect(() => {
    const a = prev.current;
    prev.current = floorView;
    if (floorView === 'all') { setShown(null); return; }
    if (a === floorView) return;
    const dir = a === 'all' ? 0 : Math.sign(floorById(floorView).level - floorById(a).level);
    setShown((s) => ({ floor: floorView, dir, n: (s?.n ?? 0) + 1 }));
    const t = setTimeout(() => setShown(null), 1900);
    return () => clearTimeout(t);
  }, [floorView]);

  if (!shown) return null;
  const f = floorById(shown.floor);
  const Icon = shown.dir > 0 ? ArrowUp : shown.dir < 0 ? ArrowDown : Layers;
  return (
    <div
      key={shown.n}
      role="status"
      className="floor-banner pointer-events-none absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+7.25rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-surface-solid py-2 pr-4 pl-2 shadow-[0_4px_16px_rgba(0,0,0,0.22)] sm:top-auto sm:bottom-10 sm:left-[calc(50%+190px)]"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white dark:text-[#0b1f3a]">
        <Icon size={18} className={shown.dir ? 'floor-banner-arrow' : ''} style={{ ['--dir' as string]: shown.dir > 0 ? '-1' : '1' }} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold whitespace-nowrap text-text">
          {shown.dir > 0 ? t.upTo(f.name) : shown.dir < 0 ? t.downTo(f.name) : f.name}
        </span>
        {via && <span className="block text-xs whitespace-nowrap text-muted">{t.viaShort(via)}</span>}
      </span>
    </div>
  );
}
