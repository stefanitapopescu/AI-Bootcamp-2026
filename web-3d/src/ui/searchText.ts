import type { Category } from '../three/Markers';

/** Lower case without diacritics: "Toaletă" → "toaleta", "Scări" → "scari". */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Other words people type for each kind of place (both languages). */
const ALIASES: Record<Category, string> = {
  lab: 'lab laborator laboratory sala room',
  toilet: 'wc toilet toaleta baie restroom bathroom',
  stairs: 'stairs scari scara',
  lift: 'lift elevator ascensor',
};

/**
 * Search score of a place for a query (0 = no match). Every word of the query must appear somewhere (name,
 * subtitle or the kind's aliases); a name that equals or starts with the query ranks first.
 */
export function score(q: string, name: string, subtitle: string, cat: Category): number {
  const query = fold(q.trim());
  if (!query) return 1;
  const n = fold(name);
  const hay = `${n} ${fold(subtitle)} ${ALIASES[cat]}`;
  if (!query.split(/\s+/).every((w) => hay.includes(w))) return 0;
  return n === query ? 4 : n.startsWith(query) ? 3 : n.includes(query) ? 2 : 1;
}
