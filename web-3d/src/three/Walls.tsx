import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { floorData } from '../map/floor';
import { wallOpenings } from '../map/openings';

const OPENINGS = wallOpenings(floorData);

export const WALL_HEIGHT = 1.4; // dollhouse height keeps hallways visible
export const WALL_THICKNESS = 0.15;
const THICKNESS = WALL_THICKNESS;
const CAP = 0.03; // thin darker cap on top of walls for definition

/** Openings (drawn doors, stair entries) on segment a→b, as [start, end] distances along the segment. */
function doorIntervals(x0: number, z0: number, x1: number, z1: number, len: number): [number, number][] {
  const tx = (x1 - x0) / len, tz = (z1 - z0) / len;
  const out: [number, number][] = [];
  for (const d of OPENINGS) {
    const rx = d.center[0] - x0, rz = d.center[1] - z0;
    const along = rx * tx + rz * tz;
    const off = Math.abs(rx * tz - rz * tx);
    const parallel = Math.abs(d.tangent[0] * tx + d.tangent[1] * tz) > 0.9;
    if (off < 0.25 && parallel && along > -0.01 && along < len + 0.01) {
      out.push([Math.max(0, along - d.width / 2), Math.min(len, along + d.width / 2)]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

function buildWalls(height: number, yOffset: number, thickness: number) {
  const parts: THREE.BufferGeometry[] = [];
  const box = (x0: number, z0: number, tx: number, tz: number, s0: number, s1: number, extend0: number, extend1: number) => {
    const a = s0 - extend0, b = s1 + extend1;
    if (b - a < 0.02) return;
    const g = new THREE.BoxGeometry(b - a, height, thickness);
    g.rotateY(-Math.atan2(tz, tx));
    const mid = (a + b) / 2;
    g.translate(x0 + tx * mid, yOffset + height / 2, z0 + tz * mid);
    parts.push(g);
  };
  for (const line of floorData.walls) {
    for (let i = 1; i < line.length; i++) {
      const [x0, z0] = line[i - 1];
      const [x1, z1] = line[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 0.01) continue;
      const tx = (x1 - x0) / len, tz = (z1 - z0) / len;
      // wall pieces between door openings; outer ends extend by half the thickness so joints overlap
      let s = 0, first = true;
      for (const [d0, d1] of doorIntervals(x0, z0, x1, z1, len)) {
        box(x0, z0, tx, tz, s, d0, first ? thickness / 2 : 0, 0);
        s = d1;
        first = false;
      }
      box(x0, z0, tx, tz, s, len, first ? thickness / 2 : 0, thickness / 2);
    }
  }
  return mergeGeometries(parts);
}

export function Walls({ color, topColor }: { color: string; topColor: string }) {
  const body = useMemo(() => buildWalls(WALL_HEIGHT, 0, THICKNESS), []);
  const cap = useMemo(() => buildWalls(CAP, WALL_HEIGHT, THICKNESS + 0.01), []);
  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh geometry={cap}>
        <meshStandardMaterial color={topColor} roughness={0.6} />
      </mesh>
    </group>
  );
}
