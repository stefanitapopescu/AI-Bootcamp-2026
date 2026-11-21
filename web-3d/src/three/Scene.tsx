import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { Floor } from './Floor';
import { Walls } from './Walls';
import { Doors } from './Doors';
import { Stairs } from './Stairs';
import { Markers } from './Markers';
import { RoutePath } from './RoutePath';
import { CameraRig, type CameraFocus, type ViewMode } from './CameraRig';
import type { Route } from '../nav/navigation';
import type { SceneColors } from './theme';
import { floorCenter, floorSize } from '../map/floor';

interface Props {
  colors: SceneColors;
  view: ViewMode;
  resetKey: number;
  dark: boolean;
  route: Route | null;
  focus: CameraFocus | null;
  selectedDoorId: string | null;
  activeEntryId: string | null;
  onSelectDoor: (id: string) => void;
  onSelectEntry: (id: string) => void;
}

export function Scene({ colors, view, resetKey, dark, route, focus, selectedDoorId, activeEntryId, onSelectDoor, onSelectEntry }: Props) {
  const span = Math.max(floorSize.x, floorSize.z);
  return (
    <Canvas flat shadows dpr={[1, 2]} camera={{ fov: 40, near: 0.1, far: 500 }} gl={{ antialias: true }}>
      <color attach="background" args={[colors.bg]} />
      <fog attach="fog" args={[colors.bg, span * 2.2, span * 4]} />

      <ambientLight intensity={dark ? 0.55 : 0.75} />
      <hemisphereLight args={['#ffffff', colors.ground, dark ? 0.35 : 0.5]} />
      <directionalLight
        position={[floorCenter.x + 14, 30, floorCenter.z + 10]}
        intensity={dark ? 0.9 : 1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span * 0.7}
        shadow-camera-right={span * 0.7}
        shadow-camera-top={span * 0.7}
        shadow-camera-bottom={-span * 0.7}
        shadow-bias={-0.0005}
      />

      <Floor color={colors.floor} groundColor={colors.ground} />
      <Walls color={colors.wall} topColor={colors.wallTop} />
      <Doors colors={colors} />
      <Stairs color={colors.stairs} lineColor={colors.stairsLine} />
      <Markers selectedDoorId={selectedDoorId} activeEntryId={activeEntryId} onSelectDoor={onSelectDoor} onSelectEntry={onSelectEntry} />
      {route && <RoutePath points={route.points} color={colors.route} halo={colors.routeHalo} />}
      <ContactShadows position={[floorCenter.x, 0.07, floorCenter.z]} scale={span * 1.3} opacity={dark ? 0.5 : 0.3} blur={2.2} far={3} resolution={1024} />


      <CameraRig view={view} resetKey={resetKey} focus={focus} />
    </Canvas>
  );
}
