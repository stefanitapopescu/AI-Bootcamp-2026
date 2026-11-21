import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { floorData } from '../map/floor';

const TREAD = 0.3; // spacing of the step lines (m)

/** Stairwells: a soft tile over the footprint with step lines across the flight direction. */
export function Stairs({ color, lineColor }: { color: string; lineColor: string }) {
  const geo = useMemo(() => {
    const tiles: THREE.BufferGeometry[] = [];
    const lines: THREE.BufferGeometry[] = [];
    for (const s of floorData.stairs ?? []) {
      const xs = s.footprint.map((p) => p[0]), zs = s.footprint.map((p) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
      const w = maxX - minX, d = maxZ - minZ;
      const t = new THREE.BoxGeometry(w, 0.04, d);
      t.translate((minX + maxX) / 2, 0.02, (minZ + maxZ) / 2);
      tiles.push(t);
      // flights run along the long side, so step lines cross it
      const alongX = w >= d;
      const len = alongX ? w : d;
      for (let k = TREAD; k < len - 0.05; k += TREAD) {
        const l = new THREE.BoxGeometry(alongX ? 0.03 : w - 0.1, 0.012, alongX ? d - 0.1 : 0.03);
        l.translate(alongX ? minX + k : (minX + maxX) / 2, 0.046, alongX ? (minZ + maxZ) / 2 : minZ + k);
        lines.push(l);
      }
    }
    return { tiles: tiles.length ? mergeGeometries(tiles) : null, lines: lines.length ? mergeGeometries(lines) : null };
  }, []);
  if (!geo.tiles) return null;
  return (
    <group>
      <mesh geometry={geo.tiles} receiveShadow>
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {geo.lines && (
        <mesh geometry={geo.lines}>
          <meshStandardMaterial color={lineColor} roughness={1} />
        </mesh>
      )}
    </group>
  );
}
