import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SPEED = 2.4; // m/s along the route (a bit faster than walking, so a loop doesn't take forever)
const CLIMB_SPEED = 3.5; // m/s on the vertical link between floors in the stacked view
const PAUSE = 1.0; // s at the destination before starting again
const Y0 = 0.12; // route height

/**
 * A little yellow guy who walks the route from start to destination, over and over, so it's obvious
 * which way to go. `path` is in the parent's coordinates: [x, y, z] (y = floor height, 0 on a single floor).
 */
export function Walker({ path, color, dark }: { path: [number, number, number][]; color: string; dark: string }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const t = useRef(0);

  // a new array every render is fine: only a different route restarts the walk
  const sig = path.map((q) => q.map((n) => n.toFixed(2)).join(',')).join(';');
  // cumulative time to reach every point, so position = f(time walked)
  const { pts, cum, total, climb } = useMemo(() => {
    const pts = path.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const cum = [0];
    const climb: boolean[] = [];
    for (let i = 1; i < pts.length; i++) {
      const vertical = Math.abs(pts[i].y - pts[i - 1].y) > 0.01;
      climb.push(vertical);
      // time-weighted length: climbing counts at its own speed
      cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]) / (vertical ? CLIMB_SPEED : SPEED));
    }
    return { pts, cum, total: cum[cum.length - 1], climb };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => { t.current = 0; }, [sig]);

  const pos = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const g = root.current;
    if (!g || pts.length < 2) return;
    t.current = (t.current + Math.min(dt, 0.1)) % (total + PAUSE);
    const time = Math.min(t.current, total);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < time) i++;
    const a = pts[i - 1], b = pts[i];
    const k = cum[i] > cum[i - 1] ? (time - cum[i - 1]) / (cum[i] - cum[i - 1]) : 1;
    pos.lerpVectors(a, b, k);
    g.position.set(pos.x, pos.y + Y0, pos.z);

    const walking = t.current < total;
    const climbing = walking && climb[i - 1];
    // face the direction of travel (keep the last heading on the vertical link)
    if (!climbing && (b.x !== a.x || b.z !== a.z)) {
      const target = Math.atan2(b.x - a.x, b.z - a.z);
      let d = target - g.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * (1 - Math.exp(-dt * 12));
    }
    // walk cycle: legs and arms swing, body bobs; idle at the destination: a little hop
    const phase = performance.now() / 1000;
    const swing = walking && !climbing ? Math.sin(phase * 11) * 0.6 : 0;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.8;
    if (armR.current) armR.current.rotation.x = swing * 0.8;
    if (body.current) body.current.position.y = walking ? Math.abs(Math.sin(phase * 11)) * 0.05 : Math.abs(Math.sin(phase * 6)) * 0.12;
  });

  if (pts.length < 2) return null;
  return (
    <group ref={root} scale={1.3}>
      {/* always-visible soft disc under his feet, so he can be spotted behind walls and from far away */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} renderOrder={16}>
        <circleGeometry args={[0.3, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} depthTest={false} depthWrite={false} />
      </mesh>
      <group ref={body}>
        {/* legs (pivot at the hip) */}
        {[-0.075, 0.075].map((x, i) => (
          <group key={x} ref={i ? legR : legL} position={[x, 0.3, 0]}>
            <mesh position-y={-0.13} geometry={LEG} castShadow>
              <meshStandardMaterial color={dark} roughness={0.6} />
            </mesh>
          </group>
        ))}
        {/* smooth torso (lathe profile, like a map "person" figure) */}
        <mesh position-y={0.26} geometry={TORSO} castShadow>
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
        {/* arms (pivot at the shoulder) */}
        {[-0.175, 0.175].map((x, i) => (
          <group key={x} ref={i ? armR : armL} position={[x, 0.58, 0]} rotation-z={x < 0 ? -0.12 : 0.12}>
            <mesh position-y={-0.13} geometry={ARM} castShadow>
              <meshStandardMaterial color={color} roughness={0.45} />
            </mesh>
          </group>
        ))}
        {/* head + eyes (looking forward, +z) */}
        <mesh position-y={0.8} geometry={HEAD} castShadow>
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
        {[-0.05, 0.05].map((x) => (
          <mesh key={x} position={[x, 0.82, 0.128]} geometry={EYE}>
            <meshBasicMaterial color={dark} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// smooth, shared geometry (enough segments that nothing looks blocky)
const TORSO = new THREE.LatheGeometry(
  [
    [0.0, 0.0], [0.11, 0.0], [0.15, 0.03], [0.165, 0.1], [0.16, 0.2], [0.17, 0.28], [0.15, 0.33], [0.09, 0.37], [0.05, 0.4], [0.0, 0.41],
  ].map(([r, y]) => new THREE.Vector2(r, y)),
  40,
);
const LEG = new THREE.CapsuleGeometry(0.05, 0.16, 10, 20);
const ARM = new THREE.CapsuleGeometry(0.04, 0.17, 10, 20);
const HEAD = new THREE.SphereGeometry(0.135, 40, 28);
const EYE = new THREE.SphereGeometry(0.022, 16, 12);
