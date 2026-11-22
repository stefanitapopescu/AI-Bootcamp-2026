import { CornerUpRight } from 'lucide-react';
import { BUILDING_NAME, FLOORS } from '../map/building';
import { LocateFab, SheetHandle, SheetMore, useBottomSheet } from './Sheet';
import type { Place } from './SearchBar';
import { useT } from '../i18n';

interface Props {
  places: Place[];
  entryCount: number; // stairwells + lift per floor
  collapseSignal: number; // map tapped: slide down (phones)
  onDirections: () => void;
  onRecenter: () => void;
}

/**
 * Home card when nothing is selected: building name, "Get directions" and (pulled up) the building at a glance.
 * Rooms and favorites live in the search bar's chips. Floating under the search on desktop, a draggable bottom
 * sheet on phones.
 */
export function ExploreCard({ places, entryCount, collapseSignal, onDirections, onRecenter }: Props) {
  const t = useT();
  const sheet = useBottomSheet(collapseSignal);
  const labs = places.filter((p) => p.cat === 'lab');
  const toilets = places.filter((p) => p.cat === 'toilet');

  return (
    <section
      data-overlay
      aria-label={t.explore}
      ref={sheet.sheetProps.ref}
      className={`absolute inset-x-0 bottom-0 [@media(orientation:landscape)]:right-auto [@media(orientation:landscape)]:w-[26rem] [@media(orientation:landscape)]:max-w-full z-30 flex max-h-[70dvh] flex-col rounded-t-3xl bg-surface-solid pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-[7.25rem] sm:max-h-[calc(100dvh-8.25rem)] sm:w-[380px] sm:rounded-3xl sm:pb-3 sm:shadow-[0_2px_10px_rgba(0,0,0,0.2)] ${sheet.sheetProps.className}`}
    >
      {sheet.state !== 'full' && <LocateFab onClick={onRecenter} className="absolute -top-14 right-3" />}
      <div {...sheet.dragProps} data-tour="sheet" className={`shrink-0 px-4 sm:pt-3 ${sheet.dragProps.className}`}>
        <div className="-mx-4"><SheetHandle state={sheet.state} onChange={sheet.setState} /></div>
        <h2 className="text-lg leading-tight font-semibold text-text">{BUILDING_NAME} · ACS</h2>
        <p className="truncate text-xs text-muted">{t.faculty}</p>
      </div>

      <div className="shrink-0 px-4">
        <button
          data-tour="directions"
          onClick={onDirections}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-[15px] font-semibold text-white shadow-sm active:opacity-90 dark:text-[#0b1f3a]"
        >
          <CornerUpRight size={18} /> {t.getDirections}
        </button>
      </div>

      <SheetMore open={sheet.expanded} className="min-h-0">
        <div className="px-4">
          {/* building at a glance */}
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              [FLOORS.length, t.floors],
              [labs.length, t.labsStat],
              [toilets.length, t.wc],
              [entryCount, t.stairsLift],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl bg-surface-2 py-2">
                <div className="text-lg leading-tight font-semibold text-text">{n}</div>
                <div className="truncate px-1 text-[11px] text-muted">{l}</div>
              </div>
            ))}
          </div>
          <p className="pt-3 text-xs text-muted">
            {t.exploreTip}
            <span className="font-medium text-text"> {t.favorites}</span>{t.exploreTipEnd}
          </p>
        </div>
      </SheetMore>
    </section>
  );
}
