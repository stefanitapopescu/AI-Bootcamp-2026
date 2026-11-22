import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Line2 } from 'three-stdlib';
import type { Vec2 } from '../map/types';

const Y = 0.12; // just above the floor slab

/**
 * Animated route: soft halo + dashed line flowing towards the destination, start dot, pulsing goal ring.
 * Parts hidden behind walls stay faintly visible (x-ray pass); start and goal markers are always on top.
 */
export function RoutePath({ points, color, halo }: { points: Vec2[]; color: string; halo: string }) {
  const pts = useMemo(() => points.map(([x, z]) => new THREE.Vector3(x, Y, z)), [points]);
  const dashed = useRef<Line2>(null);
  const ring = useRef<THREE.Mesh>(null);
  const start = pts[0], end = pts[pts.length - 1];

  useFrame((_, dt) => {
    const m = dashed.current?.material as { dashOffset: number } | undefined;
    if (m) m.dashOffset -= dt * 1.6; // dashes flow from start to destination
    if (ring.current) {
      const t = (performance.now() / 1200) % 1;
      ring.current.scale.setScalar(0.6 + t * 1.2);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
    }
  });

  return (
    <group>
      {/* x-ray pass: the whole route faintly, even where walls hide it */}
      <Line points={pts} color={color} lineWidth={5} transparent opacity={0.28} depthWrite={false} depthTest={false} renderOrder={10} />
      {/* visible pass: halo + flowing dashes, hidden by walls where they are in front */}
      <Line points={pts} color={halo} lineWidth={14} transparent opacity={0.45} depthWrite={false} renderOrder={11} />
      <Line ref={dashed} points={pts} color={color} lineWidth={6} dashed dashSize={0.55} gapSize={0.3} renderOrder={12} />
      {/* start: solid dot with white rim */}
      <mesh position={[start.x, Y + 0.01, start.z]} rotation-x={-Math.PI / 2} renderOrder={12}>
        <circleGeometry args={[0.32, 32]} />
        <meshBasicMaterial color="#ffffff" depthTest={false} />
      </mesh>
      <mesh position={[start.x, Y + 0.02, start.z]} rotation-x={-Math.PI / 2} renderOrder={13}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      {/* destination: solid dot + pulsing ring */}
      <mesh position={[end.x, Y + 0.02, end.z]} rotation-x={-Math.PI / 2} renderOrder={13}>
        <circleGeometry args={[0.26, 32]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      <mesh ref={ring} position={[end.x, Y + 0.015, end.z]} rotation-x={-Math.PI / 2} renderOrder={12}>
        <ringGeometry args={[0.45, 0.6, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}

