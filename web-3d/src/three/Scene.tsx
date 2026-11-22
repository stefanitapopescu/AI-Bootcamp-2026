import { useEffect, useState, type MutableRefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Html, Line } from '@react-three/drei';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Markers } from './Markers';
import { Walker } from './Walker';
import { RoutePath } from './RoutePath';
import { SitePlot } from './Site';
import { FloorLevel } from './FloorLevel';
import { CameraRig, type CameraApi, type CameraFocus, type HudRefs, type ViewMode } from './CameraRig';
import { WALL_HEIGHT } from './Walls';
import { useT } from '../i18n';
import type { Trip } from '../nav/trip';
import type { SceneColors } from './theme';
import { floorCenter, floorSize } from '../map/floor';
import { FLOORS, STACK_GAP, floorById, gid, stackY, type FloorId } from '../map/building';

interface Props {
  colors: SceneColors;
  view: ViewMode;
  floorView: FloorId | 'all';
  activeFloor: FloorId; // opaque floor in the all-floors view
  resetKey: number;
  dark: boolean;
  trip: Trip | null;
  walker: boolean; // little guy walking the route (optional, off by default)
  focus: CameraFocus | null;
  destinationId: string | null; // floor-qualified ids
  originId: string | null;
  cameraApi: MutableRefObject<CameraApi | null>;
  hud: HudRefs;
  onSelectDoor: (id: string) => void;
  onSelectEntry: (id: string) => void;
  onSelectFloor: (id: FloorId) => void;
}

export function Scene(p: Props) {
  const t = useT();
  const { colors, dark, trip } = p;
  const span = Math.max(floorSize.x, floorSize.z);
  const stacked = p.floorView === 'all';
  const tr = trip?.transfer ?? null;
  const transferIds = tr ? [gid(tr.from, tr.entry.id), gid(tr.to, tr.entry.id)] : [];
  const routeIds = new Set([p.destinationId, p.originId, ...transferIds].filter(Boolean) as string[]);

  // changing floor in the single-floor view: the old floor slides away (down when going up) and fades out
  // while the new one comes in from the other side, like riding the stairs. State is adjusted during render
  // so the old floor never unmounts for a frame.
  const [move, setMove] = useState<{ from: FloorId | null; to: FloorId | 'all'; dir: number; n: number }>({ from: null, to: p.floorView, dir: 0, n: 0 });
  if (move.to !== p.floorView) {
    const a = move.to, b = p.floorView;
    const single = a !== 'all' && b !== 'all';
    setMove({ from: single ? a : null, to: b, dir: single ? Math.sign(floorById(b).level - floorById(a).level) : 0, n: move.n + 1 });
  }
  useEffect(() => {
    if (!move.from) return;
    const t = setTimeout(() => setMove((m) => ({ ...m, from: null })), 550);
    return () => clearTimeout(t);
  }, [move.n, move.from]);
  const moving = move.from !== null;

  // the yellow guy's path: whole trip in the stacked view (climbing the dashed link), else the leg on this floor
  let walk: [number, number, number][] | null = null;
  if (trip && stacked && p.walker) {
    walk = trip.legs.flatMap((l) => l.route.points.map(([x, z]) => [x, stackY(l.floor), z] as [number, number, number]));
  }

  return (
    <Canvas className="map-canvas" flat shadows dpr={[1, 2]} camera={{ fov: 40, near: 0.1, far: 500 }} gl={{ antialias: true, alpha: true }}>
      {/* transparent canvas: the soft page backdrop (index.css) shows through */}
      {/* soft fade at the edge of the map; pushed back far enough for the zoomed-out views (stacked floors, portrait phones) */}
      <fog attach="fog" args={[colors.bg, span * 5, span * 9]} />

      <ambientLight intensity={dark ? 0.55 : 0.75} />
      <hemisphereLight args={['#ffffff', colors.ground, dark ? 0.35 : 0.5]} />
      <directionalLight
        position={[floorCenter.x + 14, 30, floorCenter.z + 10]}
        intensity={dark ? 0.9 : 1.4}
        castShadow={p.view === '3d'} // 2D is a flat map: no shadows
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span * 0.7}
        shadow-camera-right={span * 0.7}
        shadow-camera-top={span * 0.7}
        shadow-camera-bottom={-span * 0.7}
        shadow-bias={-0.0005}
      />

      {FLOORS.map((f) => {
        const leaving = !stacked && moving && f.id === move.from;
        const shown = stacked || f.id === p.floorView || leaving;
        if (!shown) return null;
        // stacked view: other floors are see-through; for a trip over two floors both are, so the route stands out
        // trip over two floors: the floor you start on stays solid, the other one is see-through
        const ghost = stacked && (tr ? f.id !== tr.from : f.id !== p.activeFloor);
        const leg = trip?.legs.find((l) => l.floor === f.id);
        // single-floor view on the first leg: button at the stairs/lift to continue on the next floor
        const showTransfer = !stacked && tr && tr.from === f.id;
        const up = tr ? floorById(tr.to).level > floorById(tr.from).level : false;
        return (
          <FloorLevel
            key={f.id}
            floor={f}
            y={stacked ? stackY(f.id) : leaving ? -move.dir * STACK_GAP : 0}
            enterFrom={!stacked && moving && !leaving ? move.dir * STACK_GAP : 0}
            visible={!leaving}
            showChildren={!leaving}
            ghost={ghost}
            active={tr ? f.id === tr.from : f.id === p.activeFloor}
            showTag={stacked}
            // during a route, tapping the map must not switch floors (it only tucks the sheet away): use the floor tags
            tapToOpen={stacked && !trip}
            colors={colors}
            onSelect={() => p.onSelectFloor(f.id)}
          >
            <Markers
              floor={f}
              // while a route is shown, only its own labels (start, destination, stairs/lift used): no clutter when moving around
              only={ghost || trip ? (id) => routeIds.has(id) : undefined}
              destinationId={p.destinationId}
              originId={p.originId}
              onSelectDoor={p.onSelectDoor}
              onSelectEntry={p.onSelectEntry}
            />
            {leg && <RoutePath points={leg.route.points} color={colors.route} halo={colors.routeHalo} />}
            {leg && !stacked && p.walker && <Walker path={leg.route.points.map(([x, z]) => [x, 0, z])} color={colors.walker} dark={colors.walkerDark} />}
            {showTransfer && tr && (
              <Html position={[tr.entry.pos[0], WALL_HEIGHT + 1.6, tr.entry.pos[1]]} center zIndexRange={[34, 0]}>
                <button
                  type="button"
                  onClick={() => p.onSelectFloor(tr.to)}
                  className="pointer-events-auto flex animate-bounce items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg select-none dark:text-[#0b1f3a]"
                >
                  {up ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {t.continueOn(floorById(tr.to).name)}
                </button>
              </Html>
            )}
          </FloorLevel>
        );
      })}

      {/* floor change in the stacked view: vertical dashed link between the two legs */}
      {stacked && tr && (
        <Line
          points={[
            [tr.entry.pos[0], stackY(tr.from) + 0.12, tr.entry.pos[1]],
            [tr.entry.pos[0], stackY(tr.to) + 0.12, tr.entry.pos[1]],
          ]}
          color={colors.route}
          lineWidth={5}
          dashed
          dashSize={0.4}
          gapSize={0.25}
          transparent
          opacity={0.9}
          depthTest={false}
          renderOrder={14}
        />
      )}

      {/* the ground the building stands on (under the lowest floor in the stacked view) */}
      <SitePlot y={(stacked ? stackY(FLOORS[0].id) : 0) - 0.08} color={colors.plot} />

      {walk && <Walker path={walk} color={colors.walker} dark={colors.walkerDark} />}

      {!stacked && !moving && p.view === '3d' && (
        <ContactShadows position={[floorCenter.x, 0.07, floorCenter.z]} scale={span * 1.3} opacity={dark ? 0.5 : 0.3} blur={2.2} far={3} resolution={1024} />
      )}

      <CameraRig view={p.view} stacked={stacked} resetKey={p.resetKey} focus={p.focus} api={p.cameraApi} hud={p.hud} />
    </Canvas>
  );
}
