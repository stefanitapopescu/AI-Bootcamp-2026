import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { floorData } from '../map/floor';
import { shownDoors } from '../map/openings';
import type { Door } from '../map/types';
import { WALL_HEIGHT, WALL_THICKNESS } from './Walls';
import type { SceneColors } from './theme';

const PANEL_HEIGHT = WALL_HEIGHT - 0.3; // a bit lower than the walls so doors read as openings
const PANEL_THICKNESS = 0.07;
const GAP = 0.04; // gap between panel and the wall ends / between leaves
const MAT_DEPTH = 0.55; // threshold mat on the hallway floor, visible from the top view

interface Parts {
  panels: THREE.BufferGeometry | null;
  edges: THREE.BufferGeometry | null;
  mats: THREE.BufferGeometry | null;
}

function build(doors: Door[], leavesOf: (d: Door) => number): Parts {
  const panels: THREE.BufferGeometry[] = [];
  const edges: THREE.BufferGeometry[] = [];
  const mats: THREE.BufferGeometry[] = [];
  for (const d of doors) {
    const angle = -Math.atan2(d.tangent[1], d.tangent[0]);
    const [cx, cz] = d.center;
    const [nx, nz] = d.normal;
    const [tx, tz] = d.tangent;
    const leaves = leavesOf(d);
    const leafW = (d.width - GAP * (leaves + 1)) / leaves;
    for (let k = 0; k < leaves; k++) {
      const off = -d.width / 2 + GAP + leafW / 2 + k * (leafW + GAP);
      const px = cx + tx * off, pz = cz + tz * off;
      const g = new THREE.BoxGeometry(leafW, PANEL_HEIGHT, PANEL_THICKNESS);
      g.rotateY(angle);
      g.translate(px, PANEL_HEIGHT / 2, pz);
      panels.push(g);
      const e = new THREE.BoxGeometry(leafW, 0.03, PANEL_THICKNESS + 0.01);
      e.rotateY(angle);
      e.translate(px, PANEL_HEIGHT + 0.015, pz);
      edges.push(e);
    }
    // threshold mat on the hallway side
    const m = new THREE.BoxGeometry(d.width, 0.012, MAT_DEPTH);
    m.rotateY(angle);
    const back = WALL_THICKNESS / 2 + MAT_DEPTH / 2;
    m.translate(cx - nx * back, 0.066, cz - nz * back);
    mats.push(m);
  }
  const merge = (g: THREE.BufferGeometry[]) => (g.length ? mergeGeometries(g) : null);
  return { panels: merge(panels), edges: merge(edges), mats: merge(mats) };
}

function DoorGroup({ parts, color, edge, mat }: { parts: Parts; color: string; edge: string; mat?: string }) {
  return (
    <group>
      {parts.panels && (
        <mesh geometry={parts.panels} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      )}
      {parts.edges && (
        <mesh geometry={parts.edges}>
          <meshStandardMaterial color={edge} roughness={0.6} />
        </mesh>
      )}
      {parts.mats && mat && (
        <mesh geometry={parts.mats} receiveShadow>
          <meshStandardMaterial color={mat} roughness={1} />
        </mesh>
      )}
    </group>
  );
}

/** Lab entrances (amber), toilets (teal), elevators (steel, sliding pair); other room doors in a neutral style. */
export function Doors({ colors }: { colors: SceneColors }) {
  const groups = useMemo(() => {
    const doors = shownDoors(floorData);
    const byType = (t: string) => doors.filter((d) => d.type === t);
    return {
      lab: build(byType('lab'), (d) => (d.kind === 'double' ? 2 : 1)),
      toilet: build(byType('toilet'), () => 1),
      elevator: build(byType('elevator'), () => 2),
      other: build(doors.filter((d) => !d.type || d.type === 'other'), (d) => (d.kind === 'double' ? 2 : 1)),
    };
  }, []);
  return (
    <group>
      <DoorGroup parts={groups.lab} color={colors.door} edge={colors.doorEdge} mat={colors.doorMat} />
      <DoorGroup parts={groups.toilet} color={colors.toilet} edge={colors.toiletEdge} mat={colors.toiletMat} />
      <DoorGroup parts={groups.elevator} color={colors.lift} edge={colors.liftEdge} mat={colors.liftMat} />
      {/* ordinary room doors: visible but quiet, no threshold mat */}
      <DoorGroup parts={groups.other} color={colors.room} edge={colors.roomEdge} />
    </group>
  );
}
