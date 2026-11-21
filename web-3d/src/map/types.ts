export type Vec2 = [number, number]; // [x, z] in meters, app coordinates

export interface FloorPolygon {
  outer: Vec2[];
  holes: Vec2[][];
}

export interface FloorData {
  source: string;
  generatedAt: string;
  cell: number;
  /** scan -> app: translate by -offset, then rotate around Y by rotationY */
  offset: [number, number, number];
  rotationY: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  floor: FloorPolygon[];
  walls: Vec2[][];
  doors: Door[];
  stairs?: Stairs[];
}

export type DoorType = 'lab' | 'toilet' | 'elevator' | 'other';

/** An opening in a wall: center on the wall line, unit tangent along it, width in meters. */
export interface Opening {
  center: Vec2;
  tangent: Vec2;
  normal: Vec2;
  width: number;
}

export interface Stairs {
  id: string;
  /** axis-aligned rectangle of the stairwell (4 corners) */
  footprint: Vec2[];
  /** where the stairwell meets the hallway wall (becomes an opening) */
  entry: Opening;
  up: boolean;
  down: boolean;
  area: number;
}

export interface Door {
  id: string;
  center: Vec2;
  width: number;
  /** unit vector along the wall */
  tangent: Vec2;
  /** unit vector pointing out of the hallway, into the room behind the door */
  normal: Vec2;
  kind: 'single' | 'double';
  score: number;
  /** from the manual review in scripts/door-labels.json; only lab, toilet and elevator are drawn */
  type?: DoorType;
  /** display name (labs), from scripts/door-labels.json */
  name?: string;
}
