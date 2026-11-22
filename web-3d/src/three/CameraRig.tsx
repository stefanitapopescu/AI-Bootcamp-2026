import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { floorCenter, floorData } from '../map/floor';
import { FLOORS, stackY } from '../map/building';
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

// the same outline on every floor of the exploded "all floors" view
const STACK_POINTS = FLOORS.flatMap((f) => FIT_POINTS.map((v) => v.clone().setY(v.y + stackY(f.id))));
const STACK_POLAR = THREE.MathUtils.degToRad(60); // lower angle so the floors separate visually

/** A route to frame: its points [x, y, z] (y = height of the floor it is on), and the direction the visitor faces at its start. */
export interface CameraFocus {
  key: string;
  points: [number, number, number][];
  facing: [number, number];
}


/** Screen window in NDC (-1..1). */
type Window = { x0: number; x1: number; y0: number; y1: number };

/**
 * Part of the screen not covered by the UI, measured from the DOM: every floating panel is marked `data-overlay`
 * and counts as a bar on the side where it hides the least map (works for phone sheets, desktop cards and
 * landscape phones alike).
 */
function freeWindow(): Window {
  // some browsers report a 0 × 0 window for a moment while opening: dividing by it made the camera NaN (blank map)
  const W = window.innerWidth || document.documentElement.clientWidth, H = window.innerHeight || document.documentElement.clientHeight;
  if (!W || !H) return { x0: -1, x1: 1, y0: -1, y1: 1 };
  const pad = 24; // px of breathing room next to panels
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  document.querySelectorAll<HTMLElement>('[data-overlay]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // treat the panel as a bar on whichever side (it is on) costs the least map area
    const upper = r.top + r.height / 2 < H / 2, lefty = r.left + r.width / 2 < W / 2;
    const vert = upper ? { side: 'top' as const, px: r.bottom, area: r.bottom * W } : { side: 'bottom' as const, px: H - r.top, area: (H - r.top) * W };
    const horiz = lefty ? { side: 'left' as const, px: r.right, area: r.right * H } : { side: 'right' as const, px: W - r.left, area: (W - r.left) * H };
    // a panel can name its side (data-overlay="top"), e.g. the floor menu: the map is centered below it
    const forced = el.dataset.overlay;
    const pick = forced === 'top' || forced === 'bottom' ? vert : forced === 'left' || forced === 'right' ? horiz : vert.area <= horiz.area ? vert : horiz;
    inset[pick.side] = Math.max(inset[pick.side], pick.px);
  });
  const win = {
    x0: -1 + (2 * (inset.left + pad)) / W,
    x1: 1 - (2 * (inset.right + pad)) / W,
    y0: -1 + (2 * (inset.bottom + pad)) / H,
    y1: 1 - (2 * (inset.top + pad)) / H,
  };
  // never let the UI squeeze the map into a sliver
  if (win.x1 - win.x0 < 0.6) { const c = (win.x0 + win.x1) / 2; win.x0 = c - 0.3; win.x1 = c + 0.3; }
  if (win.y1 - win.y0 < 0.6) { const c = (win.y0 + win.y1) / 2; win.y0 = c - 0.3; win.y1 = c + 0.3; }
  return win;
}

/**
 * Fit points into the free part of the screen. The camera aims straight at the center of the points; the picture is
 * shifted into the free window by the camera's view offset (see usePadding), like the "padding" of map SDKs. So the
 * point the view turns and zooms around is always what you are looking at, never hidden behind a panel.
 */
function fitInWindow(camera: THREE.PerspectiveCamera, center: THREE.Vector3, polar: number, azimuth: number, points: THREE.Vector3[], w: Window, minDist = 0): Goal {
  const hw = ((w.x1 - w.x0) / 2) * 0.88, hh = ((w.y1 - w.y0) / 2) * 0.88; // labels and the pin stick out past the points
  const dist = Math.max(minDist, fitDistance(camera, center, polar, azimuth, points, { x0: -hw, x1: hw, y0: -hh, y1: hh }));
  return { target: center.clone(), sph: new THREE.Spherical(dist, polar, azimuth) };
}

/** Distance at which all points fit on screen for the given angles (binary search on projected points). */
function fitDistance(camera: THREE.PerspectiveCamera, target: THREE.Vector3, polar: number, azimuth: number, points: THREE.Vector3[], win: Window) {
  const probe = camera.clone();
  probe.clearViewOffset(); // fit around the optical center; the view offset then moves that center into the free window
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

/** Whole floor in the free part of the screen (what the user sees on reset). */
function computeOverviewGoal(view: ViewMode, camera: THREE.PerspectiveCamera, stacked = false): Goal {
  const ref = computeGoal(view, camera);
  const center = new THREE.Vector3(floorCenter.x, 0, floorCenter.z);
  if (stacked) return fitInWindow(camera, center, STACK_POLAR, ref.sph.theta, STACK_POINTS, freeWindow());
  return fitInWindow(camera, center, ref.sph.phi, ref.sph.theta, FIT_POINTS, freeWindow());
}

/**
 * Start / reset view: the standard zoom (STANDARD_ZOOM × the whole-floor distance) on the middle of the floor, not
 * the whole-floor overview. The stacked view shows both floors whole (that is its point).
 */
function computeHomeGoal(view: ViewMode, camera: THREE.PerspectiveCamera, stacked = false): Goal {
  const g = computeOverviewGoal(view, camera, stacked);
  if (!stacked) g.sph.radius *= STANDARD_ZOOM;
  return g;
}

/** Whole floor, long side along the wider screen axis (full screen; used for limits and the default heading). */
function computeGoal(view: ViewMode, camera: THREE.PerspectiveCamera): Goal {
  const landscape = camera.aspect >= 1;
  // one standard orientation for every view: the building's long side along the screen's longer side
  const azimuth = landscape ? Math.PI / 2 : 0;
  const target = new THREE.Vector3(floorCenter.x, 0, floorCenter.z);
  const dist = fitDistance(camera, target, POLAR[view], azimuth, FIT_POINTS, { x0: -MARGIN, x1: MARGIN, y0: -MARGIN, y1: MARGIN });
  return { target, sph: new THREE.Spherical(dist, POLAR[view], azimuth) };
}

/**
 * Route view, standardized: same orientation as the overview (north stays north), same tilt as the view mode
 * (2D straight down, 3D like the overview), and never closer than the standard route distance, so short routes
 * don't zoom in. Only the center and, for long routes, the distance change.
 */
function computeFocusGoal(focus: CameraFocus, camera: THREE.PerspectiveCamera, view: ViewMode = '3d'): Goal {
  const pts = focus.points;
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[2]);
  const multiLevel = new Set(pts.map((p) => p[1])).size > 1;
  const target = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
  const azimuth = computeGoal('top', camera).sph.theta;
  const fit = pts.flatMap(([x, y, z]) => [new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + WALL_HEIGHT, z)]);
  const [ex, ey, ez] = pts[pts.length - 1];
  fit.push(new THREE.Vector3(ex, ey + WALL_HEIGHT + 2.2, ez)); // top of the destination pin
  const polar = multiLevel ? STACK_POLAR : POLAR[view];
  // standard distance: a fixed share of the whole-floor view in the same mode (zooms out further only for long routes)
  const standard = computeOverviewGoal(multiLevel ? '3d' : view, camera, multiLevel).sph.radius * (multiLevel ? 1 : STANDARD_ZOOM);
  return fitInWindow(camera, target, polar, azimuth, fit, freeWindow(), Math.max(standard, minDistance(camera)));
}

/** Zoom-in limit: the narrower side of the screen always shows at least this many meters of floor. */
const MIN_VIEW = 14;
/** Standard zoom (start view and route views): this share of the whole-floor distance, the same everywhere. */
const STANDARD_ZOOM = 0.75;
const minDistance = (camera: THREE.PerspectiveCamera) =>
  MIN_VIEW / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
const ZOOM_OUT_LIMIT = 1.25; // max distance = overview distance × this
const PAN_MARGIN = 4; // m: how far past the floor outline the view center may go (room to slide a route out from under the UI)
const b = floorData.bounds;

/** Keep the view center over the building: shift target and camera together (angle unchanged). */
function clampTarget(camera: THREE.Camera, c: MapControlsImpl) {
  const t = c.target;
  const x = THREE.MathUtils.clamp(t.x, b.minX - PAN_MARGIN, b.maxX + PAN_MARGIN);
  const z = THREE.MathUtils.clamp(t.z, b.minZ - PAN_MARGIN, b.maxZ + PAN_MARGIN);
  if (x === t.x && z === t.z && t.y === 0) return;
  const d = new THREE.Vector3(x - t.x, -t.y, z - t.z);
  t.add(d);
  camera.position.add(d);
}

const applyGoal = (camera: THREE.Camera, c: MapControlsImpl, target: THREE.Vector3, sph: THREE.Spherical) => {
  c.target.copy(target);
  camera.position.setFromSpherical(sph).add(target);
  c.update();
};

/** Imperative camera actions for the map buttons. */
export interface CameraApi {
  zoom: (factor: number) => void;
  /** turn back to the default heading, keeping position and zoom */
  resetHeading: () => void;
}

/** DOM elements updated every frame without React renders: compass needle and scale bar. */
export interface HudRefs {
  compass: RefObject<HTMLElement>;
  scaleBar: RefObject<HTMLElement>;
  scaleText: RefObject<HTMLElement>;
}

const SCALE_STEPS = [1, 2, 5, 10, 20, 50]; // m
const SCALE_MAX_PX = 130;

interface RigProps {
  view: ViewMode;
  stacked?: boolean; // all floors, exploded
  resetKey: number;
  focus?: CameraFocus | null;
  api?: MutableRefObject<CameraApi | null>;
  hud?: HudRefs;
}

export function CameraRig({ view, stacked = false, resetKey, focus, api, hud }: RigProps) {
  const controls = useRef<MapControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const dom = useThree((s) => s.gl.domElement);
  // two-finger gesture: the ground point that was under the fingers, and where the fingers are now
  const pinch = useRef<{ anchor: THREE.Vector3 | null; mid: [number, number] | null }>({ anchor: null, mid: null });
  const raycaster = useRef(new THREE.Raycaster());
  const stackedRef = useRef(stacked);
  stackedRef.current = stacked;
  /** Point on the floor under a screen position: in the stacked view, the topmost floor that is actually there. */
  const groundUnder = ([mx, my]: [number, number]) => {
    const r = dom.getBoundingClientRect();
    camera.updateMatrixWorld();
    raycaster.current.setFromCamera(new THREE.Vector2(((mx - r.left) / r.width) * 2 - 1, -((my - r.top) / r.height) * 2 + 1), camera);
    const heights = stackedRef.current ? FLOORS.map((f) => stackY(f.id)).sort((a, b) => b - a) : [0];
    let fallback: THREE.Vector3 | null = null;
    for (const h of heights) {
      const hit = raycaster.current.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), new THREE.Vector3());
      if (!hit) continue;
      fallback ??= hit;
      if (hit.x > b.minX - 1 && hit.x < b.maxX + 1 && hit.z > b.minZ - 1 && hit.z < b.maxZ + 1) return hit;
    }
    return fallback;
  };
  /** Same, on one fixed height (keeps a gesture on the floor it started on). */
  const groundAt = ([mx, my]: [number, number], h: number) => {
    const r = dom.getBoundingClientRect();
    camera.updateMatrixWorld();
    raycaster.current.setFromCamera(new THREE.Vector2(((mx - r.left) / r.width) * 2 - 1, -((my - r.top) / r.height) * 2 + 1), camera);
    return raycaster.current.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), new THREE.Vector3());
  };

  // two fingers, like phone map apps: twist turns the map, and whatever is under the fingers stays under them
  // (pinch zooms towards the fingers, not towards the middle of the screen; the controls do the pinch and move)
  useEffect(() => {
    let last: number | null = null;
    const angle = (e: TouchEvent) => Math.atan2(e.touches[1].clientY - e.touches[0].clientY, e.touches[1].clientX - e.touches[0].clientX);
    const mid = (e: TouchEvent): [number, number] => [(e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2];
    // the 3D view's outer wrapper: holds the canvas and the map labels (drei <Html> renders next to the canvas' div)
    const container = dom.parentElement?.parentElement ?? dom;
    const onMap = (e: TouchEvent) => [...e.touches].every((t) => container.contains(t.target as Node));
    const start = (e: TouchEvent) => {
      const two = e.touches.length === 2 && onMap(e);
      last = two ? angle(e) : null;
      pinch.current.mid = two ? mid(e) : null;
      pinch.current.anchor = two ? groundUnder(pinch.current.mid!) : null;
      if (two) goal.current = null;
    };
    const move = (e: TouchEvent) => {
      const c = controls.current;
      if (!c || e.touches.length !== 2 || last === null) return;
      const a = angle(e);
      const d = Math.atan2(Math.sin(a - last), Math.cos(a - last));
      last = a;
      // the map turns with the fingers: turn the camera the other way around the view center
      const off = camera.position.clone().sub(c.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), d);
      camera.position.copy(c.target).add(off);
      c.update();
      pinch.current.mid = mid(e); // the frame loop keeps the anchored ground point under this
    };
    // on the document: a finger that lands on a map label (an HTML button over the canvas) counts too
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', start, { passive: true });
    document.addEventListener('touchcancel', start, { passive: true });

    // labels are buttons on top of the canvas, inside the controls' element, so a finger that starts on one already
    // moves the map (index.css gives them touch-action: none so the browser doesn't cancel the touch). What is left:
    // when the finger really moved, swallow the label's click, so a drag never opens a room.
    const starts = new Map<number, { x: number; y: number; moved: boolean }>();
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t !== dom && container.contains(t) && t.closest('button')) starts.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false });
    };
    const moveP = (e: PointerEvent) => {
      const p = starts.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) p.moved = true;
    };
    const up = (e: PointerEvent) => {
      const p = starts.get(e.pointerId);
      starts.delete(e.pointerId);
      if (!p?.moved) return;
      // the finger was dragging the map, not tapping the label: swallow the click that follows
      const block = (c: Event) => { c.stopPropagation(); c.preventDefault(); };
      window.addEventListener('click', block, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', block, { capture: true }), 400);
    };
    document.addEventListener('pointerdown', down, { capture: true });
    document.addEventListener('pointermove', moveP, { capture: true });
    document.addEventListener('pointerup', up, { capture: true });
    document.addEventListener('pointercancel', up, { capture: true });
    return () => {
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', start);
      document.removeEventListener('touchcancel', start);
      document.removeEventListener('pointerdown', down, { capture: true });
      document.removeEventListener('pointermove', moveP, { capture: true });
      document.removeEventListener('pointerup', up, { capture: true });
      document.removeEventListener('pointercancel', up, { capture: true });
    };
  }, [dom, camera]);
  const size = useThree((s) => s.size);
  const goal = useRef<Goal | null>(null);
  const first = useRef(true);
  const hudState = useRef({ heading: NaN, scale: '' });

  // the default heading (overview azimuth) is "north" for the compass
  const homeAzimuth = () => computeGoal('3d', camera).sph.theta;

  useEffect(() => {
    if (!api) return;
    const current = () => {
      const c = controls.current!;
      return { target: c.target.clone(), sph: new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target)) };
    };
    api.current = {
      zoom: (f) => {
        const c = controls.current;
        if (!c) return;
        const g = current();
        g.sph.radius = THREE.MathUtils.clamp(g.sph.radius * f, c.minDistance, c.maxDistance);
        goal.current = g;
      },
      resetHeading: () => {
        if (!controls.current) return;
        const g = current();
        g.sph.theta = homeAzimuth();
        goal.current = g;
      },
    };
    return () => { api.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, camera]);

  useEffect(() => {
    const g = focus ? computeFocusGoal(focus, camera, view) : computeHomeGoal(view, camera, stacked);
    // zoom-out limit: a bit beyond the distance that shows the whole floor (never below the goal itself)
    const overview = Math.max(computeGoal('3d', camera).sph.radius, computeGoal('top', camera).sph.radius, computeOverviewGoal(view, camera, stacked).sph.radius);
    if (controls.current) {
      controls.current.minDistance = minDistance(camera);
      controls.current.maxDistance = Math.max(overview * ZOOM_OUT_LIMIT, g.sph.radius);
    }
    if (first.current && controls.current) {
      // jump straight to the initial view on first render
      first.current = false;
      applyGoal(camera, controls.current, g.target, g.sph);
      return;
    }
    // measure the UI one frame later, once panels that open together with this change are laid out
    const raf = requestAnimationFrame(() => {
      goal.current = focus ? computeFocusGoal(focus, camera, view) : computeHomeGoal(view, camera, stacked);
    });
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- focus is tracked by its key
  }, [view, stacked, resetKey, focus?.key, camera, size.width, size.height]);

  // stop the fly-to animation as soon as the user grabs the map
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => (goal.current = null);
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, []);

  function updateHud(c: MapControlsImpl) {
    const off = camera.position.clone().sub(c.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    // compass: rotation of the default heading on screen (needle up = default orientation)
    const heading = Math.round(THREE.MathUtils.radToDeg(sph.theta - homeAzimuthCached.current));
    if (heading !== hudState.current.heading && hud!.compass.current) {
      hud!.compass.current.style.transform = `rotate(${heading}deg)`;
      hudState.current.heading = heading;
    }
    // scale bar: meters per pixel at the view center
    const mpp = (2 * sph.radius * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / size.height;
    const m = [...SCALE_STEPS].reverse().find((s) => s / mpp <= SCALE_MAX_PX) ?? 1;
    const key = `${m}:${Math.round(m / mpp)}`;
    if (key !== hudState.current.scale && hud!.scaleBar.current && hud!.scaleText.current) {
      hud!.scaleBar.current.style.width = `${Math.round(m / mpp)}px`;
      hud!.scaleText.current.textContent = `${m} m`;
      hudState.current.scale = key;
    }
  }
  const homeAzimuthCached = useRef(0);
  useEffect(() => { homeAzimuthCached.current = homeAzimuth(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width, size.height]);

  // padding: the optical center follows the middle of the free part of the screen (smoothly, also while a sheet slides)
  const pad = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const padFrame = useRef(0);
  function updatePadding(dt: number) {
    if (padFrame.current++ % 2) return; // measuring the panels every other frame is plenty
    const w = freeWindow(), W = size.width, H = size.height;
    const tx = (-(w.x0 + w.x1) / 2) * (W / 2), ty = ((w.y0 + w.y1) / 2) * (H / 2);
    const p = pad.current;
    if (!p || p.w !== W || p.h !== H) pad.current = { x: tx, y: ty, w: W, h: H };
    else {
      const k = 1 - Math.exp(-dt * 2 * 10);
      if (Math.abs(tx - p.x) < 0.3 && Math.abs(ty - p.y) < 0.3) return;
      p.x += (tx - p.x) * k;
      p.y += (ty - p.y) * k;
    }
    camera.setViewOffset(W, H, pad.current!.x, pad.current!.y, W, H);
  }

  // animate in spherical coordinates so the top-down view lands at an exact heading
  useFrame((_, dt) => {
    updatePadding(dt);
    const c = controls.current;
    // safety net: an invalid camera (NaN from a bad input event) would leave a blank map; go back to the start view
    if (c && (!Number.isFinite(c.target.x + c.target.z) || !Number.isFinite(camera.position.x + camera.position.y + camera.position.z))) {
      const g = computeHomeGoal(view, camera, stacked);
      applyGoal(camera, c, g.target, g.sph);
    }
    // while two fingers are down, whatever was under them stays under them (zoom/turn/move around the fingers)
    const pc = pinch.current;
    if (c && pc.anchor && pc.mid) {
      const now = groundAt(pc.mid, pc.anchor.y);
      if (now) {
        const shift = pc.anchor.clone().sub(now).setY(0);
        if (shift.lengthSq() > 1e-6) { c.target.add(shift); camera.position.add(shift); camera.updateMatrixWorld(); }
      }
    }
    if (c) clampTarget(camera, c);
    if (c && hud) updateHud(c);
    const g = goal.current;
    if (!g || !c) return;
    // make the goal reachable before flying to it: the pan clamp and zoom limits would otherwise pull the camera
    // back every frame and the animation would never settle (the view jitters until touched)
    g.target.x = THREE.MathUtils.clamp(g.target.x, b.minX - PAN_MARGIN, b.maxX + PAN_MARGIN);
    g.target.z = THREE.MathUtils.clamp(g.target.z, b.minZ - PAN_MARGIN, b.maxZ + PAN_MARGIN);
    g.target.y = 0;
    if (g.sph.radius > c.maxDistance) c.maxDistance = g.sph.radius;
    g.sph.radius = Math.max(g.sph.radius, c.minDistance);
    g.sph.phi = THREE.MathUtils.clamp(g.sph.phi, c.minPolarAngle, c.maxPolarAngle);
    const k = 1 - Math.exp(-dt * 9); // snappy, still smooth
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
      minDistance={10}
      maxDistance={80}
      // 2D mode is a flat map: it can turn (two-finger twist, right mouse drag) but never tilt. Only 3D can tilt.
      enableRotate // 2D: turning only (tilt is locked flat below); 3D: turning and tilting
      zoomToCursor // mouse wheel zooms towards the pointer (touch: see the two-finger handler)
      // touch: in 3D one finger turns and tilts the view (no two-finger twist needed), two fingers move and zoom;
      // in 2D one finger moves the map. Mouse matches: 3D left-drag turns, right-drag moves.
      touches={view === '3d' ? { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
      mouseButtons={view === '3d' ? { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
      minPolarAngle={0}
      maxPolarAngle={view === '3d' ? THREE.MathUtils.degToRad(78) : POLAR.top}
      screenSpacePanning={false}
    />
  );
}
