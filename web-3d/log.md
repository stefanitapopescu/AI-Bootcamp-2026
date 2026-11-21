# Change Log

A running record of every change made to the UPT Navigator prototype (hackathon, UPT Timișoara).
Newest entries first. Each entry lists what changed, why, and the files touched.

---

## 2026-11-21 — CLAUDE.md project rules *(commit `f27132b`)*
**What:** Wrote `CLAUDE.md` with project rules (commands, generated-data pipeline, door-label rule, color meanings,
screenshot verification, log/commit/stash workflow, team repo notes), after checking each fact against the repo.
Also fixed outdated text in `scripts/door-labels.json` (`_readme` said unlabelled doors are not drawn; they are drawn neutral).

**Files:** `CLAUDE.md`, `scripts/door-labels.json`.

## 2026-11-21 — Lab labels + navigation from stairs/lift *(commit `a71eeb3`)*
**What:**
- **Lab labels:** each lab door has a clickable name chip. Names live in `scripts/door-labels.json` (`name`); only
  **B625** (D12) is known from the scan, the others are placeholders **Lab 1–7** (Lab 1–6 on the hallway by Scări 2,
  from the junction outwards; Lab 7 next to B625) to be replaced with real room codes.
- **Navigation:** pick an entry point (Scări 1, Scări 2, Lift: from the panel or by tapping its label) and a lab
  (from the list or by tapping its label). `src/nav/navigation.ts` builds a 15 cm walkable grid from the floor
  polygon with 40 cm wall clearance, runs A* (8-connected, no corner cutting) and simplifies the path with
  line-of-sight string pulling. Distance + walking time (1.3 m/s) shown in the panel. All 24 entry×lab routes are
  found (4–31 m), ~80 ms in total.
- **Route rendering** (`src/three/RoutePath.tsx`): blue halo + dashes flowing towards the lab, start dot, pulsing ring
  at the door. Parts hidden by walls stay faintly visible (x-ray pass).
- **Perspective from the entry point:** the camera flies to a spot behind the entry, looking the way the visitor walks
  in (40° tilt), and fits the whole route into the screen area not covered by the panel. "Show route" re-frames it;
  Reset / 3D / Top return to the overview.
- UI: navigation panel bottom-left (full width on phones; view controls move to the top-right there); UI sits above
  the 3D labels.

**Files:** `src/nav/navigation.ts`, `src/three/RoutePath.tsx` (new), `src/three/{Markers,CameraRig,Scene}.tsx`,
`src/App.tsx`, `src/three/theme.ts`, `src/index.css`, `src/map/types.ts`, `scripts/door-labels.json`,
`scripts/detect-doors.mjs`, `src/map/floor.json`.

## 2026-11-21 — All doors visible again, labs highlighted *(commit `a71eeb3`)*
**What:** The user reported doors disappearing again: non-lab doors were being hidden entirely. Now **every detected door is drawn**:
labs (8, amber + mat), toilet (teal), elevators (slate) are highlighted; the other 9 room doors use a quiet neutral
gray-beige style without a threshold mat, so labs still stand out but no door is missing.
- Also: the Vite dev server had missed a file change (served a stale `openings.ts`), so the phone could show old code.
  Restarted it on all interfaces.

**Files:** `src/map/openings.ts`, `src/three/Doors.tsx`, `src/three/theme.ts`, `src/index.css`.

## 2026-11-21 — Labs only on the two long hallways *(commit `a71eeb3`)*
**What:** New rule from the user: labs = doors on the two long hallways that have paper notices on them, plus the double doors there.
- Labs (8): D01, D02, D19, D20 (paper notices; D20 has only a small label, borderline) and D03, D04, D11, D12 (double doors).
- Hidden: D09, D10 (plates on the wall, no paper on the door), D17, D18 (plain), D13, D14, D16 (central hall, not on the long hallways),
  D05, D06 (glass stairwell doors). Toilet D15 and elevators D07/D08 unchanged.

**Files:** `scripts/door-labels.json`, `src/map/floor.json`.

## 2026-11-21 — Restored room/lab doors *(commit `a71eeb3`)*
**What:** The user reported that many relevant labs/doors had disappeared after the lab/toilet filtering. All detected room doors
are marked as labs again (15), because the scan's signs aren't readable enough to tell labs from other rooms. Only the glass
stairwell doors (D05, D06) stay hidden; elevators and the toilet keep their own styling.
- Fixed two detections: D16 also covered the hydrant cabinet next to it (narrowed to the door, 0.9 m); D10 sat on the
  wall plates next to the door (shifted onto the door).
- Removed the "Lab" labels (15 would clutter the map); lab doors are recognisable by their amber panels.
  Labels remain for Scări, Lift and WC.

**Files:** `scripts/door-labels.json`, `src/map/floor.json`, `src/three/Markers.tsx`.

## 2026-11-21 — Stairs, elevators, and only lab/toilet doors *(commit `a71eeb3`)*
**What:**
- **Stairs:** `scripts/detect-stairs.mjs` (`npm run stairs`) casts rays down from 2 m on a 5 cm grid; large regions
  (≥ 3 m²) spanning ≥ 0.6 m of height are stairwells (furniture is rejected). Found 2 stairwells (both with flights up
  and down). Each gets a footprint and an entry snapped to the nearest wall, which becomes an opening.
  Rendered as a soft green tile with step lines + a "Scări" label.
- **Elevators:** identified visually on door close-ups: D07 and D08 are brushed-steel sliding doors
  (sticker "450 kg / 6 persoane"). Rendered as slate sliding pairs + one "Lift" label.
- **Doors re-checked:** only lab entrances and toilets are drawn now.
  - Toilet: D15 (TOALETĂ pictogram, certain), teal door + "WC" label.
  - Labs: D03, D04, D11, D12 (double doors; D04 has a timetable posted, D12 has room plate B625). Best guess:
    the scan texture (~1 cm/px) is too blurry to read "Laborator" on the signs.
  - Not drawn (13): office-style single doors with paper notes, unsigned doors, glass stairwell doors (D05, D06).
- Classification lives in `scripts/door-labels.json` (matched by position, survives re-detection; edit it to fix a door).
- `scripts/inspect-scan.mjs` (`npm run inspect`): debug renders (top-down color/height, door and sign close-ups).
- `npm run extract` now runs extract → doors → stairs.

**Files:** `scripts/detect-stairs.mjs`, `scripts/inspect-scan.mjs`, `scripts/door-labels.json` (new), `scripts/detect-doors.mjs`,
`src/map/openings.ts`, `src/three/Stairs.tsx`, `src/three/Markers.tsx` (new), `src/three/{Doors,Walls,Scene}.tsx`,
`src/three/theme.ts`, `src/index.css`, `src/map/types.ts`, `src/map/floor.json`, `package.json`, `.gitignore`.

## 2026-11-21 — Rolled back visit360 floors *(commit `a71eeb3`)*
**What:** Rolled back to commit `01505e0` at the user's request, discarding the ACS multi-floor work
(visit360.upt.ro sketches for Parter / Etaj 3 / Etaj 4, floor switcher, `scripts/visit360-floors.mjs`, `scripts/lib/plan2d.mjs`).
**Recoverable:** the discarded work is saved in `git stash` as "visit360 floors + floor switcher (rolled back)"
(`git stash apply stash@{0}` brings it back).

## 2026-11-21 — Door detection and rendering *(commit `01505e0`)*
**What:** Doors are now detected automatically from the 3D scan and shown in the minimal 3D view.
- Each hallway wall is unrolled into elevation strips (texture color + recess depth) by raycasting the scan.
- Detector looks for the door pattern: two vertical frame edges 0.6–2.0 m apart that reach the floor,
  a consistent lintel line at ~1.9–2.3 m, and a smooth, non-colorful leaf (rejects windows, plants, notice boards).
  Touching leaves are merged into double doors. Result: 20 doors written to `floor.json` as `doors`.
- Rendering: walls get a gap at each door; inside it a muted amber door panel (slightly lower than walls,
  double doors show two leaves) plus a soft amber threshold mat on the hallway floor so doors read in Top view.
  Amber chosen to contrast with gray walls without being harsh, and to stay distinct from the blue accent used later for routes.
- `npm run doors` re-runs detection; `npm run extract` now runs it automatically after floor extraction.

**Known limitations:** 2–4 doors missed (mostly with posters/signs on them, one double door), one glass double
door may appear as two singles, a couple of doors sit at wall corners. Manual correction planned via the map editor.

**Files:** `scripts/detect-doors.mjs` (new), `scripts/lib/scan.mjs` (new: BVH raycasting, texture sampling, PNG writer,
wall sampling), `scripts/wall-elevations.mjs` (new debug tool), `src/three/Doors.tsx` (new), `src/three/Walls.tsx`
(door gaps), `src/three/Scene.tsx`, `src/three/theme.ts`, `src/index.css` (door color tokens), `src/map/types.ts`
(`Door` type), `src/map/floor.json`, `package.json` (scripts, dev deps `three-mesh-bvh`, `jpeg-js`).

## 2026-11-21 — Removed scan overlay *(commit `01505e0`)*
**What:** Removed the "Compare with original scan" feature to save space.
**Why:** It required a second 8.5 MB copy of the scan in `public/`.
**Files:** deleted `src/three/ScanOverlay.tsx` and `public/reference/floor-scan.glb`; updated `src/App.tsx`, `src/three/Scene.tsx`.
**Note:** The first commit still contains the duplicate scan in history; amending it would remove it for good (pending decision).

## 2026-11-21 — Minimal 3D floor view *(commit `b7167d4`)*
**What:** Initial project and the minimal 3D view of one floor, generated from the team's scan.
- Scaffold: Vite + React + TypeScript, Tailwind v4, three.js, @react-three/fiber, @react-three/drei.
- `scripts/extract-floor.mjs`: reads the scan GLB (moved to `assets/reference/floor-scan.glb`), detects the floor
  height, rasterizes walkable floor, extracts the outline, aligns it to the axes, snaps near-axis edges to straight
  lines (orthogonalization), and builds walls along the outline. Output: `src/map/floor.json`.
- Scene: white hallway floor, low 1.4 m "dollhouse" walls with dark caps, soft shadows, flat (no tone mapping) rendering.
- Camera: auto-fits the whole floor (long side along the wider screen axis), animated 3D / Top views, Reset view,
  map-style controls (pan, pinch zoom, rotate; touch friendly).
- UI: top bar, floating view controls, light/dark theme (CSS tokens drive both UI and 3D colors).
- Stairwells are currently walled in (stair geometry reads as wall); to be marked later.

**Files:** `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`, `.gitignore`, `scripts/extract-floor.mjs`,
`src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/map/*`, `src/three/*`, `assets/reference/floor-scan.glb`.

## 2026-11-21 — Planning
**What:** Implementation plan agreed (structured by feature): 3D floor → routing from all entrances → room pins and search →
room panel (Schedule / Exams tabs, next free slot) → Excel import into Supabase → polish.
**Decisions:** web app (React + R3F + Supabase), 1 building / 1 floor, data from an uploaded Excel,
"next exam scheduling" = the room's next free time slot, existing 3D scan simplified (not shown directly).
