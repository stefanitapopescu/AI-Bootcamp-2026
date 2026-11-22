import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Layers } from 'lucide-react';
import type { FloorInfo } from '../map/building';
import { Floor } from './Floor';
import { Walls } from './Walls';
import { Doors } from './Doors';
import { Stairs } from './Stairs';
import { Footprint } from './Site';
import type { SceneColors } from './theme';

const GHOST_OPACITY = 0.42; // see-through floors, like the x-ray pass of the route

const TAG_GAP = 6; // px between a floor tag and what it steps away from
type Box = { left: number; right: number; top: number; bottom: number };
const moved = (b: Box, [x, y]: number[]): Box => ({ left: b.left + x, right: b.right + x, top: b.top + y, bottom: b.bottom + y });
const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const boxesOf = (selector: string) => [...document.querySelectorAll(selector)].map((e) => e.getBoundingClientRect()).filter((r) => r.width);

/** How far to move a floor tag so it doesn't cover the destination pin: the shortest step below or beside it. */
function clearOfPin(el: HTMLElement, base: Box): number[] {
  const pin = boxesOf('.pin-drop > *'); // its "TO" pill and the teardrop
  const hit = pin.filter((r) => overlaps(base, r));
  if (!hit.length) return [0, 0];
  const steps = [
    [0, Math.max(...pin.map((r) => r.bottom)) + TAG_GAP - base.top], // below the tip
    [Math.min(...hit.map((r) => r.left)) - TAG_GAP - base.right, 0], // left of it
    [Math.max(...hit.map((r) => r.right)) + TAG_GAP - base.left, 0], // right of it
    [Math.min(...pin.map((r) => r.left)) - TAG_GAP - base.right, 0], // left of all of it
    [Math.max(...pin.map((r) => r.right)) + TAG_GAP - base.left, 0], // right of all of it
  ].sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  const others = [...document.querySelectorAll('[data-floor-tag]')].filter((e) => e !== el).map((e) => e.getBoundingClientRect());
  const busy = [...others, ...boxesOf('[data-map-start] > *, section[data-overlay], [data-tour="view"], [data-tour="floor"]')];
  const offPin = steps.filter((s) => !pin.some((r) => overlaps(moved(base, s), r)));
  return (
    offPin.find((s) => {
      const b = moved(base, s);
      return b.left >= 4 && b.right <= window.innerWidth - 4 && !busy.some((r) => overlaps(b, r));
    }) ?? offPin[0] ?? [0, 0]
  );
}

interface Props {
  floor: FloorInfo;
  y: number;
  ghost: boolean; // see-through (another floor is the active one)
  active: boolean;
  showTag: boolean; // "Etaj 7" tag (all-floors view)
  tapToOpen?: boolean; // tapping the floor itself opens it
  colors: SceneColors;
  onSelect: () => void;
  visible?: boolean; // false: fade out (a floor being left)
  enterFrom?: number; // starts this far above (+) / below (-) its height and glides in (floor change)
  showChildren?: boolean; // labels, route: hidden while the floor slides in or out
  children?: ReactNode; // labels, route: never ghosted
}

/**
 * One floor of the building: geometry (ghosted when not active), its overlays, animated to its height.
 * Opacity is animated too, so changing floors reads as moving between them: the old floor slides away and fades,
 * the new one slides in and fades in.
 */
export function FloorLevel({ floor, y, ghost, active, showTag, tapToOpen = false, colors, onSelect, visible = true, enterFrom = 0, showChildren = true, children }: Props) {
  const outer = useRef<THREE.Group>(null);
  const geo = useRef<THREE.Group>(null);
  const placed = useRef(false);
  const tag = useRef<THREE.Group>(null);
  const tagButton = useRef<HTMLButtonElement>(null);
  const tagShift = useRef([0, 0]);
  const fade = useRef({ vis: 0, look: ghost ? GHOST_OPACITY : 1, applied: -1 }); // every floor fades in when it appears
  const camera = useThree((s) => s.camera);
  const b = floor.data.bounds;
  const corners = [[b.minX, b.minZ], [b.minX, b.maxZ], [b.maxX, b.minZ], [b.maxX, b.maxZ]].map(([x, z]) => new THREE.Vector3(x, 0, z));

  // new theme colors can mean new materials: apply the current opacity again
  useLayoutEffect(() => { fade.current.applied = -1; }, [colors]);

  /** Opacity factor for every material of the floor geometry (1 = as designed), remembering the original look. */
  const applyOpacity = (f: number) => {
    const g = geo.current;
    if (!g) return;
    g.visible = f > 0.01;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.castShadow === undefined) mesh.userData.castShadow = mesh.castShadow;
      mesh.castShadow = f > 0.99 ? mesh.userData.castShadow : false;
      for (const m of ([] as THREE.Material[]).concat(mesh.material)) {
        if (m.userData.base === undefined) m.userData.base = { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite };
        const base = m.userData.base;
        const transparent = f < 0.99 || base.transparent;
        if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
        m.opacity = base.opacity * f;
        m.depthWrite = f < 0.99 ? false : base.depthWrite;
      }
    });
  };

  useFrame((_, dt) => {
    const g = outer.current;
    if (!g) return;
    if (!placed.current) { g.position.y = y + enterFrom; placed.current = true; }
    const ease = 1 - Math.exp(-dt * 9);
    g.position.y += (y - g.position.y) * ease;
    // fade: visibility (floor change) x look (ghosted or solid)
    const fs = fade.current;
    fs.vis += ((visible ? 1 : 0) - fs.vis) * ease;
    fs.look += ((ghost ? GHOST_OPACITY : 1) - fs.look) * (1 - Math.exp(-dt * 10));
    let f = fs.vis * fs.look;
    if (f > 0.995) f = 1;
    if (Math.abs(f - fs.applied) > 0.004 || (f === 1 && fs.applied !== 1)) { applyOpacity(f); fs.applied = f; }
    // floor tag: at the corner of the floor that is leftmost on screen, so tags never sit on the route or the map buttons
    if (tag.current) {
      let best = corners[0], bx = Infinity, fallback = corners[0], fd = Infinity;
      const v = new THREE.Vector3();
      for (const c of corners) {
        v.copy(c).applyMatrix4(g.matrixWorld).project(camera);
        const onScreen = v.x > -0.75 && v.x < 0.7 && Math.abs(v.y) < 0.9 && v.z < 1;
        if (onScreen && v.x < bx) { bx = v.x; best = c; }
        const d = Math.hypot(v.x, v.y);
        if (d < fd) { fd = d; fallback = c; }
      }
      if (bx === Infinity) best = fallback; // no corner on screen (zoomed in): the one nearest the middle
      tag.current.position.set(best.x, 0, best.z);
      const el = tagButton.current;
      if (el) {
        // measured without its current step, so stepping aside doesn't make it step back on the next frame
        const now = el.getBoundingClientRect(), [sx, sy] = tagShift.current;
        tagShift.current = clearOfPin(el, moved(now, [-sx, -sy]));
        el.style.translate = tagShift.current.map((n) => `${n}px`).join(' ');
      }
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (!tapToOpen || e.delta > 6) return; // a drag, not a tap
    e.stopPropagation();
    onSelect();
  };

  return (
    <group ref={outer}>
      <group ref={geo} onClick={tapToOpen ? pick : undefined}>
        <Footprint room={colors.siteRoom} edge={colors.siteEdge} />
        <Floor color={colors.floor} groundColor={colors.ground} />
        <Walls color={colors.wall} topColor={colors.wallTop} />
        <Doors colors={colors} />
        <Stairs color={colors.stairs} lineColor={colors.stairsLine} />
      </group>
      {showChildren && children}
      {showTag && (
        <group ref={tag}>
        <Html center style={{ pointerEvents: 'none' }} zIndexRange={[25, 0]}>
          <button
            ref={tagButton}
            type="button"
            data-floor-tag=""
            onClick={onSelect}
            className={`pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap shadow-md select-none ${
              active ? 'bg-accent text-white dark:text-[#0b1f3a]' : 'bg-surface-solid text-text'
            }`}
          >
            <Layers size={14} /> {floor.name}
          </button>
        </Html>
        </group>
      )}
    </group>
  );
}
