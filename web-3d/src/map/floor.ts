import raw from './floor.json';
import type { FloorData } from './types';

export const floorData = raw as unknown as FloorData;

export const floorCenter = {
  x: (floorData.bounds.minX + floorData.bounds.maxX) / 2,
  z: (floorData.bounds.minZ + floorData.bounds.maxZ) / 2,
};
export const floorSize = {
  x: floorData.bounds.maxX - floorData.bounds.minX,
  z: floorData.bounds.maxZ - floorData.bounds.minZ,
};
