import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { floorData } from '../map/floor';

/**
 * Context around the hallways, so the plan sits inside a building instead of floating in a void
 * (indoor maps show the building footprint and its surroundings, not just corridors).
 *
 * ROOM_DEPTH is an ESTIMATE: only hallways were scanned, rooms are not mapped. The footprint is the hallway
 * shape grown by a typical room depth, drawn as a calm "rooms" area with the building outline around it.
 */
const ROOM_DEPTH = 5; // m, guessed depth of the rooms on each side of a hallway
const PAD = ROOM_DEPTH + 1.5;
const PPM = 16; // texture pixels per meter

const b = floorData.bounds;
const FW = b.maxX - b.minX + 2 * PAD, FH = b.maxZ - b.minZ + 2 * PAD;
const CX = (b.minX + b.maxX) / 2, CZ = (b.minZ + b.maxZ) / 2;

function footprintTexture(room: string, edge: string) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(FW * PPM);
  c.height = Math.ceil(FH * PPM);
  const ctx = c.getContext('2d')!;
  const path = new Path2D();
  for (const poly of floorData.floor) {
    poly.outer.forEach(([x, z], i) => {
      const px = (x - b.minX + PAD) * PPM, py = (z - b.minZ + PAD) * PPM;
      if (i) path.lineTo(px, py);
      else path.moveTo(px, py);
    });
    path.closePath();
  }
  ctx.lineJoin = 'miter'; // square building corners
  ctx.miterLimit = 3;
  // outline first (a bit wider), then the rooms area on top of it
  for (const [color, grow] of [[edge, ROOM_DEPTH + 0.25], [room, ROOM_DEPTH]] as const) {
    ctx.fillStyle = ctx.strokeStyle = color;
    ctx.lineWidth = 2 * grow * PPM;
    ctx.fill(path);
    ctx.stroke(path);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Building footprint of one floor (rooms area + outline), just under the hallway floor. Ghosted with its floor. */
export function Footprint({ room, edge }: { room: string; edge: string }) {
  const tex = useMemo(() => footprintTexture(room, edge), [room, edge]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[CX, -0.03, CZ]}>
      <planeGeometry args={[FW, FH]} />
      {/* unlit: a calm, exact tone that stays in the background of the hallways */}
      <meshBasicMaterial map={tex} transparent />
    </mesh>
  );
}

const PLOT_PAD = 9; // m of ground around the building outline
const FEATHER = 7; // m over which the ground fades into the background
const PLOT_W = FW + 2 * PLOT_PAD, PLOT_H = FH + 2 * PLOT_PAD;

function plotTexture(color: string) {
  const ppm = 6;
  const c = document.createElement('canvas');
  c.width = Math.ceil(PLOT_W * ppm);
  c.height = Math.ceil(PLOT_H * ppm);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  // feathered rounded rectangle: stacked rings, more opaque towards the middle (works everywhere, no canvas filters)
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const inset = (FEATHER * (1 - i / steps)) * ppm;
    ctx.globalAlpha = 1 / steps + (i === steps - 1 ? 0.2 : 0);
    const w = c.width - 2 * inset, h = c.height - 2 * inset, rad = Math.min(w, h) * 0.12;
    ctx.beginPath();
    ctx.roundRect(inset, inset, w, h, rad);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The ground the building stands on: one soft, flat plot of stone color around the building that fades into the
 * background. No pattern, so the plan stays the only thing with detail.
 */
export function SitePlot({ y, color }: { y: number; color: string }) {
  const tex = useMemo(() => plotTexture(color), [color]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[CX, y, CZ]} renderOrder={-1}>
      <planeGeometry args={[PLOT_W, PLOT_H]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} fog={false} />
    </mesh>
  );
}
