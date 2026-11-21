import { useMemo } from 'react';
import * as THREE from 'three';
import { floorData } from '../map/floor';
import type { Vec2 } from '../map/types';

// Shapes live in the XY plane; rotating -90° around X maps (x, y) -> (x, 0, -y),
// so we feed (x, -z) to land points at world (x, 0, z).
const toShapePts = (pts: Vec2[]) => pts.map(([x, z]) => new THREE.Vector2(x, -z));

export function Floor({ color, groundColor }: { color: string; groundColor: string }) {
  const geometry = useMemo(() => {
    const shapes = floorData.floor.map((poly) => {
      const shape = new THREE.Shape(toShapePts(poly.outer));
      shape.holes = poly.holes.map((h) => new THREE.Path(toShapePts(h)));
      return shape;
    });
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.06, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const { bounds } = floorData;
  const size = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * 3;

  return (
    <group>
      {/* walkable hallway floor */}
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* invisible ground that only shows shadows, so the floor floats on the page background */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
        <planeGeometry args={[size, size]} />
        <shadowMaterial color={groundColor} opacity={0.18} transparent />
      </mesh>
    </group>
  );
}
