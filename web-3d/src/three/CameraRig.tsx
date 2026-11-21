import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { floorCenter, floorData } from '../map/floor';
import { WALL_HEIGHT } from './Walls';

export type ViewMode = '3d' | 'top';

const POLAR = { '3d': THREE.MathUtils.degToRad(48), top: 0.0001 };

const MARGIN = 0.9; // fraction of the screen (in NDC) the floor may fill

interface Goal {
  target: THREE.Vector3;
  sph: THREE.Spherical;
}

// all floor outline vertices at floor and wall-top height, used to fit the camera
const FIT_POINTS = floorData.floor.flatMap((p) =>
  p.outer.flatMap(([x, z]) => [new THREE.Vector3(x, 0, z), new THREE.Vector3(x, WALL_HEIGHT, z)]),
);

/** A route to frame: its points, and the direction the visitor faces at its start. */
export interface CameraFocus {
  key: string;
  points: [number, number][];
  facing: [number, number];
}

const FOCUS_POLAR = THREE.MathUtils.degToRad(40); // steeper than the overview so walls hide less of the route

/** Screen window (NDC) left free by the UI: the nav panel sits bottom-left (desktop) or across the bottom (phone). */
type Window = { x0: number; x1: number; y0: number; y1: number };
const routeWindow = (aspect: number): Window => (aspect >= 1 ? { x0: -0.35, x1: 0.8, y0: -0.6, y1: 0.75 } : { x0: -0.8, x1: 0.8, y0: -0.15, y1: 0.7 });

/** Distance at which all points fit on screen for the given angles (binary search on projected points). */
function fitDistance(camera: THREE.PerspectiveCamera, target: THREE.Vector3, polar: number, azimuth: number, points: THREE.Vector3[], win: Window) {
  const probe = camera.clone();
  const fits = (dist: number) => {
    probe.position.setFromSpherical(new THREE.Spherical(dist, polar, azimuth)).add(target);
    probe.lookAt(target);
    probe.updateMatrixWorld();
    probe.updateProjectionMatrix();
    return points.every((c) => {
      const p = c.clone().project(probe);
      return p.x >= win.x0 && p.x <= win.x1 && p.y >= win.y0 && p.y <= win.y1 && p.z < 1;
    });
  };
  let lo = 1, hi = 400;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Whole floor, long side along the wider screen axis. */
function computeGoal(view: ViewMode, camera: THREE.PerspectiveCamera): Goal {
  const landscape = camera.aspect >= 1;
  const azimuth = (landscape ? Math.PI / 2 : 0) + (view === '3d' ? THREE.MathUtils.degToRad(-12) : 0);
  const target = new THREE.Vector3(floorCenter.x, 0, floorCenter.z);
  const dist = fitDistance(camera, target, POLAR[view], azimuth, FIT_POINTS, { x0: -MARGIN, x1: MARGIN, y0: -MARGIN, y1: MARGIN });
  return { target, sph: new THREE.Spherical(dist, POLAR[view], azimuth) };
}

/**
 * Route view: the camera stands behind the entry point, looking the way the visitor walks in,
 * and backs off until the whole route (plus a little context) is on screen.
 */
function computeFocusGoal(focus: CameraFocus, camera: THREE.PerspectiveCamera): Goal {
  const pts = focus.points;
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const target = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
  // camera offset points opposite to the facing direction: (sinθ, cosθ) = -facing
  const azimuth = Math.atan2(-focus.facing[0], -focus.facing[1]);
  const fit = pts.flatMap(([x, z]) => [new THREE.Vector3(x, 0, z), new THREE.Vector3(x, WALL_HEIGHT, z)]);
  const dist = Math.max(9, fitDistance(camera, target, FOCUS_POLAR, azimuth, fit, routeWindow(camera.aspect)));
  return { target, sph: new THREE.Spherical(dist, FOCUS_POLAR, azimuth) };
}

const applyGoal = (camera: THREE.Camera, c: MapControlsImpl, target: THREE.Vector3, sph: THREE.Spherical) => {
  c.target.copy(target);
  camera.position.setFromSpherical(sph).add(target);
  c.update();
};

export function CameraRig({ view, resetKey, focus }: { view: ViewMode; resetKey: number; focus?: CameraFocus | null }) {
  const controls = useRef<MapControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const goal = useRef<Goal | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const g = focus ? computeFocusGoal(focus, camera) : computeGoal(view, camera);
    if (first.current && controls.current) {
      // jump straight to the initial view on first render
      first.current = false;
      applyGoal(camera, controls.current, g.target, g.sph);
      return;
    }
    goal.current = g;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- focus is tracked by its key
  }, [view, resetKey, focus?.key, camera, size.width, size.height]);

  // stop the fly-to animation as soon as the user grabs the map
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => (goal.current = null);
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, []);

  // animate in spherical coordinates so the top-down view lands at an exact heading
  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    const k = 1 - Math.exp(-dt * 7);
    const cur = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target));
    let dTheta = g.sph.theta - cur.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta)); // shortest way round
    const next = new THREE.Spherical(
      cur.radius + (g.sph.radius - cur.radius) * k,
      cur.phi + (g.sph.phi - cur.phi) * k,
      cur.theta + dTheta * k,
    );
    const target = c.target.clone().lerp(g.target, k);
    const done =
      Math.abs(g.sph.radius - next.radius) < 0.02 &&
      Math.abs(g.sph.phi - next.phi) < 0.002 &&
      Math.abs(dTheta) < 0.002 &&
      target.distanceTo(g.target) < 0.01;
    if (done) {
      applyGoal(camera, c, g.target, g.sph);
      goal.current = null;
    } else applyGoal(camera, c, target, next);
  });

  return (
    <MapControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={4}
      maxDistance={140}
      maxPolarAngle={THREE.MathUtils.degToRad(78)}
      screenSpacePanning={false}
    />
  );
}
