import { useEffect, useMemo, useState } from 'react';
import { score } from './searchText';
import { ArrowLeft, Search } from 'lucide-react';
import { CATEGORY, type Category } from '../three/Markers';
import { useT } from '../i18n';

export interface PickOption {
  id: string;
  name: string;
  subtitle: string;
  cat: Category;
  section: string;
  disabled?: boolean;
  note?: string; // small text on the right (e.g. "Current destination")
}

interface Props {
  title: string;
  placeholder: string;
  options: PickOption[];
  onPick: (id: string) => void;
  onClose: () => void;
}

/** Full-screen chooser on phones, card on desktop: searchable list grouped in sections. */
export function PlacePicker({ title, placeholder, options, onPick, onClose }: Props) {
  const t = useT();
  const [q, setQ] = useState('');
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  const groups = useMemo(() => {
    const hits = options.filter((o) => score(q, o.name, o.subtitle, o.cat) > 0);
    const out = new Map<string, PickOption[]>();
    for (const o of hits) out.set(o.section, [...(out.get(o.section) ?? []), o]);
    return [...out.entries()];
  }, [options, q]);

  return (
    <div
      role="dialog"
      aria-label={title}
      className="fixed inset-0 z-[60] flex flex-col bg-surface-solid sm:absolute sm:inset-auto sm:top-4 sm:left-4 sm:max-h-[min(640px,calc(100dvh-2rem))] sm:w-[380px] sm:rounded-3xl sm:shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-center gap-2 border-b border-border px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:pt-2">
        <button onClick={onClose} aria-label={t.back} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-2">
          <ArrowLeft size={20} />
        </button>
        <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-surface-2 px-3">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            autoFocus={!window.matchMedia?.('(pointer: coarse)').matches} // phones: show the list first, keyboard on tap
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="min-w-0 flex-1 bg-transparent text-base text-text sm:text-[15px] outline-none placeholder:text-muted"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
        {groups.length === 0 && <div className="px-4 py-4 text-sm text-muted">{t.noResults}</div>}
        {groups.map(([section, items]) => (
          <div key={section} className="py-1">
            <div className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{section}</div>
            {items.map((o) => (
              <button
                key={o.id}
                disabled={o.disabled}
                onClick={() => onPick(o.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 disabled:opacity-45 disabled:hover:bg-transparent"
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${CATEGORY[o.cat].bg}`}>{CATEGORY[o.cat].icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">{o.name}</span>
                  <span className="block truncate text-xs text-muted">{o.subtitle}</span>
                </span>
                {o.note && <span className="shrink-0 text-[11px] text-muted">{o.note}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
