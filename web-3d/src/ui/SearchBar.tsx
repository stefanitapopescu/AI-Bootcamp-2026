import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, History, Search, Star, X } from 'lucide-react';
import type { Door } from '../map/types';
import type { FloorId } from '../map/building';
import { CATEGORY, type Category } from '../three/Markers';
import { useT } from '../i18n';
import { score } from './searchText';

export interface Place {
  id: string; // floor-qualified door id, e.g. "7:D12"
  floor: FloorId;
  door: Door;
  name: string;
  cat: Extract<Category, 'lab' | 'toilet'>;
  subtitle: string;
}

interface Props {
  places: Place[];
  favorites: string[]; // place ids
  recent: string[]; // recently opened place ids, newest first
  selected: Place | null;
  open: boolean; // owned by App: the Back button closes the list
  onOpenChange: (open: boolean) => void;
  onSelect: (p: Place) => void;
  onClear: () => void;
}

/** Floating maps-style search bar with suggestions and quick category chips. */
export function SearchBar({ places, favorites, recent, selected, open, onOpenChange: setOpen, onSelect, onClear }: Props) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Place['cat'] | 'fav' | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // however it was closed (also by Back): empty it and put the keyboard away
  useEffect(() => {
    if (open) return;
    setQuery('');
    setFilter(null);
    input.current?.blur();
  }, [open]);
  // chips row wider than its space (longer words in Romanian): it scrolls sideways, with a soft fade at the edge
  const chips = useRef<HTMLDivElement>(null);
  const [chipsOverflow, setChipsOverflow] = useState(false);
  useLayoutEffect(() => {
    const el = chips.current;
    if (!el) return;
    const check = () => setChipsOverflow(el.scrollWidth > el.clientWidth + 1 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener('scroll', check, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', check); };
  }, [t, open, selected]);

  // accent-insensitive, any word order, aliases ("wc", "baie", "toaleta"); best name matches first
  const results = useMemo(() => {
    const pool = filter === 'fav' ? (favorites.map((id) => places.find((p) => p.id === id)).filter(Boolean) as Place[]) : places;
    return pool
      .filter((p) => !filter || filter === 'fav' || p.cat === filter)
      .map((p, i) => ({ p, s: score(query, p.name, p.subtitle, p.cat), i }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((x) => x.p);
  }, [places, favorites, query, filter]);
  // empty search: recently opened places on top
  const recentPlaces = !query.trim() && !filter ? (recent.map((id) => places.find((p) => p.id === id)).filter(Boolean) as Place[]) : [];
  const list = recentPlaces.length ? [...recentPlaces, ...results.filter((p) => !recent.includes(p.id))] : results;

  const pick = (p: Place) => {
    onSelect(p);
    setQuery('');
    setFilter(null);
    setOpen(false);
    input.current?.blur();
  };
  const close = () => setOpen(false);

  return (
    <div data-overlay className="pointer-events-none absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 sm:inset-x-auto sm:left-4 sm:top-4 sm:w-[380px]">
      <div data-tour="search" className="pointer-events-auto rounded-3xl bg-surface-solid shadow-[0_2px_6px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.1)]">
        <div className="flex h-12 items-center gap-2 pr-2 pl-3">
          {open ? (
            <button onClick={close} aria-label={t.back} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <span className="grid h-9 w-9 place-items-center text-muted">
              <Search size={20} />
            </span>
          )}
          <input
            ref={input}
            value={open ? query : selected?.name ?? query}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && list[0]) pick(list[0]); // Enter opens the best match
              if (e.key === 'Escape') close();
            }}
            enterKeyHint="search"
            placeholder={filter === 'fav' ? t.searchFavorites : t.search}
            aria-label={t.search}
            className="min-w-0 flex-1 bg-transparent text-base text-text sm:text-[15px] outline-none placeholder:text-muted"
          />
          {selected && !open && (
            <button onClick={onClear} aria-label={t.clear} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2">
              <X size={20} />
            </button>
          )}
        </div>

        {open && (
          <div className="max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain border-t border-border py-1">
            {filter === 'fav' && (
              <div className="flex items-center gap-1.5 px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
                <Star size={12} fill="currentColor" className="text-amber-500" /> {t.favorites}
              </div>
            )}
            {list.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted">
                {filter === 'fav' && !query ? t.noFavorites('☆') : t.noResults}
              </div>
            )}
            {list.map((p, i) => {
              const isRecent = i < recentPlaces.length;
              return (
              <div key={p.id}>
                {isRecent && i === 0 && <div className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{t.recent}</div>}
                {!isRecent && i === recentPlaces.length && i > 0 && <div className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{t.allPlaces}</div>}
              <button
                onClick={() => pick(p)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 ${i === 0 && query.trim() ? 'bg-surface-2/70' : ''}`}
              >
                {isRecent ? (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted"><History size={16} /></span>
                ) : (
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${CATEGORY[p.cat].bg}`}>{CATEGORY[p.cat].icon}</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{p.subtitle}</span>
                </span>
              </button>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* quick category chips (hidden while searching or when a place is open) */}
      {!open && !selected && (
        <div ref={chips} data-tour="chips" className={`pointer-events-auto mt-2 flex w-fit max-w-[calc(100%-6.25rem)] touch-pan-x gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:max-w-none ${chipsOverflow ? "[mask-image:linear-gradient(to_right,black_80%,transparent)]" : ""}`}>
          <button
            onClick={() => { setFilter('fav'); setOpen(true); }}
            className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full bg-surface-solid py-1.5 pr-3 pl-1.5 text-sm font-medium text-text shadow-[0_1px_3px_rgba(0,0,0,0.18)] hover:bg-surface-2"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-white"><Star size={12} fill="currentColor" /></span>
            {t.favorites}{favorites.length ? <span className="text-muted">{favorites.length}</span> : null}
          </button>
          {(['lab', 'toilet'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                const only = places.filter((p) => p.cat === cat);
                if (only.length === 1) pick(only[0]);
                else { setFilter(cat); setOpen(true); input.current?.focus(); }
              }}
              className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full bg-surface-solid py-1.5 pr-3 pl-1.5 text-sm font-medium text-text shadow-[0_1px_3px_rgba(0,0,0,0.18)] hover:bg-surface-2"
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full text-white ${CATEGORY[cat].bg}`}>{CATEGORY[cat].icon}</span>
              {cat === 'lab' ? t.labs : t.wc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
