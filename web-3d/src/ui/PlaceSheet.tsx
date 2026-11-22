import type { ReactNode } from 'react';
import { ArrowUpDown, Building2, CornerUpRight, Navigation, Share2, Star, X } from 'lucide-react';
import type { EntryPoint, Route } from '../nav/navigation';
import { etaText } from '../nav/trip';
import { CATEGORY, StairsIcon, WcIcon } from '../three/Markers';
import { LocateFab, SheetHandle, SheetMore, useBottomSheet } from './Sheet';
import type { Place } from './SearchBar';
import { useT } from '../i18n';

export interface Nearby {
  exit: { entry: EntryPoint; route: Route } | null; // closest stairs / lift
  toilet: Route | null; // walk to the WC (null when the place is the WC)
}

interface Props {
  place: Place;
  floorName: string;
  nearby: Nearby;
  favorite: boolean | null; // null: can't be a favorite (toilet)
  onToggleFavorite: () => void;
  onShare: () => void;
  collapseSignal: number;
  onDirections: () => void;
  onStartHere: () => void;
  onRecenter: () => void;
  onClose: () => void;
}

function Row({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">{icon}</span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm text-text">{title}</div>
        <div className="truncate text-xs text-muted">{detail}</div>
      </div>
    </div>
  );
}

/** Place card: name, actions (directions / start here) and what is nearby. Bottom sheet on phones, card on desktop. */
export function PlaceSheet({ place, floorName, nearby, favorite, onToggleFavorite, onShare, collapseSignal, onDirections, onStartHere, onRecenter, onClose }: Props) {
  const t = useT();
  const sheet = useBottomSheet(collapseSignal); // phones open as a peek: name + actions

  return (
    <section
      data-overlay
      aria-label={place.name}
      ref={sheet.sheetProps.ref}
      className={`absolute inset-x-0 bottom-0 [@media(orientation:landscape)]:right-auto [@media(orientation:landscape)]:w-[26rem] [@media(orientation:landscape)]:max-w-full z-40 flex max-h-[75dvh] flex-col rounded-t-3xl bg-surface-solid pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_rgba(0,0,0,0.18)] sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-[4.5rem] sm:max-h-[calc(100dvh-5.5rem)] sm:w-[380px] sm:rounded-3xl sm:pb-3 sm:shadow-[0_2px_10px_rgba(0,0,0,0.2)] ${sheet.sheetProps.className}`}
    >
      {sheet.state !== 'full' && <LocateFab onClick={onRecenter} className="absolute -top-14 right-3" />}
      <div {...sheet.dragProps}>
      <SheetHandle state={sheet.state} onChange={sheet.setState} />

      <div className="flex shrink-0 items-start gap-3 px-4 sm:pt-3">
        <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ${CATEGORY[place.cat].bg}`}>{CATEGORY[place.cat].icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl leading-tight font-semibold text-text">{place.name}</h2>
          <p className="truncate text-sm text-muted">{place.subtitle}</p>
        </div>
        {favorite !== null && (
          <button
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? t.removeFavorite : t.addFavorite}
            title={favorite ? t.removeFavorite : t.addFavorite}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 hover:text-text ${favorite ? 'text-amber-500' : 'text-muted'}`}
          >
            <Star size={18} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        )}
        <button onClick={onClose} aria-label={t.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:text-text">
          <X size={18} />
        </button>
      </div>

      </div>

      {/* actions */}
      <div className="flex shrink-0 gap-2 px-4 pt-3">
        <button
          onClick={onDirections}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-[15px] font-semibold text-white shadow-sm active:opacity-90 dark:text-[#0b1f3a]"
        >
          <CornerUpRight size={18} /> {t.directions}
        </button>
        <button
          onClick={onStartHere}
          title={t.startHereTitle}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2.5 text-[15px] font-semibold text-accent hover:bg-accent-soft"
        >
          <Navigation size={16} /> {t.startHere}
        </button>
        <button
          onClick={onShare}
          aria-label={t.share}
          title={t.share}
          className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full border border-border text-accent hover:bg-accent-soft"
        >
          <Share2 size={18} />
        </button>
      </div>

      <SheetMore open={sheet.expanded} className="min-h-0">
        <div className="px-4 pt-2">
          <Row icon={<Building2 size={16} />} title={floorName} detail={t.faculty} />
          {nearby.exit && (
            <Row
              icon={nearby.exit.entry.kind === 'lift' ? <ArrowUpDown size={16} /> : <StairsIcon size={16} />}
              title={t.nearestWayOut(nearby.exit.entry.name)}
              detail={`${etaText(nearby.exit.route.minutes * 60)} · ${Math.round(nearby.exit.route.meters)} m`}
            />
          )}
          {nearby.toilet && <Row icon={<WcIcon />} title={t.nearestToilet} detail={`${etaText(nearby.toilet.minutes * 60)} · ${Math.round(nearby.toilet.meters)} m`} />}
        </div>
      </SheetMore>
    </section>
  );
}
