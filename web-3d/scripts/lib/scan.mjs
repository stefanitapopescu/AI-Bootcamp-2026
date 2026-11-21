// Shared helpers for analysing the 3D scan in Node: load meshes with BVH for fast
// raycasting, sample textures, convert between scan and app coordinates, write PNGs.
import { NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import jpeg from 'jpeg-js';
import fs from 'node:fs';
import zlib from 'node:zlib';

THREE.Mesh.prototype.raycast = acceleratedRaycast;

/** Loads every mesh primitive of the GLB as a THREE.Mesh with BVH + decoded base color texture. */
export async function loadScan(path) {
  const doc = await new NodeIO().read(path);
  const meshes = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = new THREE.Matrix4().fromArray(node.getWorldMatrix());
    for (const prim of mesh.listPrimitives()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(prim.getAttribute('POSITION').getArray()), 3));
      const uv = prim.getAttribute('TEXCOORD_0');
      if (uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv.getArray()), 2));
      if (prim.getIndices()) g.setIndex(new THREE.BufferAttribute(new Uint32Array(prim.getIndices().getArray()), 1));
      g.applyMatrix4(m);
      g.boundsTree = new MeshBVH(g);
      const tex = prim.getMaterial()?.getBaseColorTexture();
      let image = null;
      if (tex && tex.getMimeType() === 'image/jpeg') {
        const d = jpeg.decode(tex.getImage(), { useTArray: true, maxMemoryUsageInMB: 1024 });
        image = { w: d.width, h: d.height, data: d.data };
      }
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const obj = new THREE.Mesh(g, material);
      obj.userData.image = image;
      meshes.push(obj);
    }
  }
  return meshes;
}

/** Bilinear-free texture lookup (nearest), glTF UV convention (v down). */
export function sampleColor(hit) {
  const img = hit.object.userData.image;
  if (!img || !hit.uv) return [128, 128, 128];
  const u = ((hit.uv.x % 1) + 1) % 1, v = ((hit.uv.y % 1) + 1) % 1;
  const x = Math.min(img.w - 1, Math.floor(u * img.w)), y = Math.min(img.h - 1, Math.floor(v * img.h));
  const i = (y * img.w + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

/** Coordinate transforms between app space (floor.json) and scan space. */
export function makeTransforms(floor) {
  const [ox, oy, oz] = floor.offset;
  const c = Math.cos(floor.rotationY), s = Math.sin(floor.rotationY);
  return {
    toScan: ([x, z], h = 0) => new THREE.Vector3(x * c - z * s + ox, h + oy, x * s + z * c + oz),
    dirToScan: ([x, z]) => new THREE.Vector3(x * c - z * s, 0, x * s + z * c),
  };
}

/** Writes an RGB buffer (w*h*3) as PNG. */
export function writePng(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const crc = (buf) => {
    let c = ~0;
    for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, cb]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}

/** Samples a closed or open polyline every `step` meters; returns points with outward normals. */
export function samplePolyline(line, step, isInside) {
  const out = [];
  let dist = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    if (L < 1e-6) continue;
    let n = [-dz / L, dx / L];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (isInside([mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3])) n = [-n[0], -n[1]]; // make it point outward
    const count = Math.max(1, Math.round(L / step));
    for (let k = 0; k < count; k++) {
      const t = k / count;
      out.push({ p: [a[0] + dx * t, a[1] + dz * t], n, t: [dx / L, dz / L], seg: i - 1, s: dist + L * t });
    }
    dist += L;
  }
  return out;
}

export function pointInPoly([px, pz], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Unrolls every wall polyline of floor.json into elevation columns. For each column
 * (every `step` m along the wall) rays are cast outward from inside the hallway at
 * heights 0..hMax, recording texture color and depth relative to the outline.
 */
export function sampleWallElevations(floor, meshes, { step = 0.05, hMax = 2.6, back = 0.6, far = 2.5 } = {}) {
  const { toScan, dirToScan } = makeTransforms(floor);
  const inside = (p) => floor.floor.some((f) => pointInPoly(p, f.outer) && !f.holes.some((h) => pointInPoly(p, h)));
  const rows = Math.round(hMax / step);
  const ray = new THREE.Raycaster();
  ray.firstHitOnly = true;
  const cols = [];
  floor.walls.forEach((line, li) => {
    for (const smp of samplePolyline(line, step, inside)) {
      const col = { ...smp, line: li, color: [], depth: [] };
      const dir = dirToScan(smp.n);
      for (let r = 0; r < rows; r++) {
        ray.set(toScan([smp.p[0] - smp.n[0] * back, smp.p[1] - smp.n[1] * back], (r + 0.5) * step), dir);
        ray.far = far;
        const hit = ray.intersectObjects(meshes, false)[0];
        col.color.push(hit ? sampleColor(hit) : null);
        col.depth.push(hit ? hit.distance - back : null);
      }
      cols.push(col);
    }
  });
  return { cols, rows, step };
}
