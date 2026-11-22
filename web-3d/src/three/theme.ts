export type ThemeName = 'light' | 'dark';

export interface SceneColors {
  bg: string;
  ground: string;
  floor: string;
  wall: string;
  wallTop: string;
  door: string;
  doorEdge: string;
  doorMat: string;
  toilet: string;
  toiletEdge: string;
  toiletMat: string;
  lift: string;
  liftEdge: string;
  liftMat: string;
  stairs: string;
  room: string;
  route: string;
  routeHalo: string;
  roomEdge: string;
  stairsLine: string;
  walker: string;
  walkerDark: string;
  siteRoom: string;
  siteEdge: string;
  plot: string;
}

/** Reads the scene color tokens from CSS so the 3D scene follows the theme. */
export function readSceneColors(): SceneColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    bg: v('--scene-bg'),
    ground: v('--scene-ground'),
    floor: v('--scene-floor'),
    wall: v('--scene-wall'),
    wallTop: v('--scene-wall-top'),
    door: v('--scene-door'),
    doorEdge: v('--scene-door-edge'),
    doorMat: v('--scene-door-mat'),
    toilet: v('--scene-toilet'),
    toiletEdge: v('--scene-toilet-edge'),
    toiletMat: v('--scene-toilet-mat'),
    lift: v('--scene-lift'),
    liftEdge: v('--scene-lift-edge'),
    liftMat: v('--scene-lift-mat'),
    stairs: v('--scene-stairs'),
    room: v('--scene-room'),
    route: v('--scene-route'),
    routeHalo: v('--scene-route-halo'),
    roomEdge: v('--scene-room-edge'),
    stairsLine: v('--scene-stairs-line'),
    walker: v('--scene-walker'),
    walkerDark: v('--scene-walker-dark'),
    siteRoom: v('--scene-site-room'),
    siteEdge: v('--scene-site-edge'),
    plot: v('--scene-plot'),
  };
}
