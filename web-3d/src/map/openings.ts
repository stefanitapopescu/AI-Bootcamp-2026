import type { FloorData, Opening } from './types';

/** All doors are drawn; labs, toilets and elevators are highlighted, other rooms get a neutral style. */
export const shownDoors = (data: FloorData) => data.doors;

/** Wall openings: drawn doors plus stairwell entries. */
export function wallOpenings(data: FloorData): Opening[] {
  return [...shownDoors(data), ...(data.stairs ?? []).map((s) => s.entry)];
}
