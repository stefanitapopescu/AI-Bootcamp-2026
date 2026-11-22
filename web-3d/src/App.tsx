import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Scene } from './three/Scene';
import type { CameraApi, CameraFocus, HudRefs, ViewMode } from './three/CameraRig';
import { readSceneColors, type SceneColors, type ThemeName } from './three/theme';
import { floorData } from './map/floor';
import type { Door } from './map/types';
import { BUILDING_NAME, FLOORS, floorById, gid, roomName, stackY, type FloorId } from './map/building';
import { buildGrid, doorGoal, entryPoints, findRoute, routeHeading, type Origin } from './nav/navigation';
import { planTrips, tripSteps } from './nav/trip';
import { SearchBar, type Place } from './ui/SearchBar';
import { MapButtons, ScaleBar } from './ui/MapButtons';
import { PlaceSheet, type Nearby } from './ui/PlaceSheet';
import { DirectionsSheet } from './ui/DirectionsSheet';
import { PlacePicker, type PickOption } from './ui/PlacePicker';
import { ExploreCard } from './ui/ExploreCard';
import { FloorBanner } from './ui/FloorBanner';
import { Intro } from './ui/Intro';
import { setLang, useLang, useT } from './i18n';
import { getPref, setPref } from './prefs';
import { MapErrorBoundary, MapUnavailable, webglAvailable } from './ui/MapFallback';

const WEBGL = webglAvailable();

// navigation data is static: floors share the layout, so one grid and one set of entry points serve all of them
const ENTRIES = entryPoints(floorData); // local ids (S1, S2, lift); floor-qualified with gid()
const GRID = buildGrid(floorData);

const PLACES: Place[] = FLOORS.flatMap((f) =>
  f.data.doors
    .filter((d) => d.type === 'lab' || d.type === 'toilet')
    .map((d) => ({
      id: gid(f.id, d.id),
      floor: f.id,
      door: d,
      name: roomName(f, d),
      cat: d.type === 'toilet' ? ('toilet' as const) : ('lab' as const),
      subtitle: '', // localized in App (current language)
    }))
    .sort((a, b) => (a.cat === b.cat ? a.name.localeCompare(b.name, 'ro', { numeric: true }) : a.cat === 'lab' ? -1 : 1)),
);

/** A route start: stairs or lift on a floor, or a room you are leaving. */
type Start = Origin & { floor: FloorId; door?: Door };
const ORIGINS: Start[] = FLOORS.flatMap((f) => [
  ...ENTRIES.map((e) => ({ id: gid(f.id, e.id), floor: f.id, name: e.name, kind: e.kind, pos: e.pos, facing: e.facing })),
  ...PLACES.filter((p) => p.floor === f.id).map((p) => ({ id: p.id, floor: f.id, name: p.name, kind: p.cat, pos: doorGoal(p.door), door: p.door })),
]);
const withFloor = (name: string, floor: FloorId) => `${name} · ${floorById(floor).name}`;

/** Favorite labs: kept in this browser only (a per-viewer convenience; nothing is sent anywhere). */
function loadFavorites(): string[] {
  try {
    const v = JSON.parse(getPref('favorites') ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && PLACES.some((p) => p.id === x)) : [];
  } catch {
    return [];
  }
}

/**
 * Shareable links: ?to=<place id> opens a room, &from=<start id> opens directions. Only ids that exist are accepted
 * (anything else in the URL is ignored).
 */
function readLink(): { to: string | null; from: string | null } {
  try {
    const q = new URLSearchParams(window.location.search);
    const to = q.get('to'), from = q.get('from');
    return {
      to: to && PLACES.some((p) => p.id === to) ? to : null,
      from: from && ORIGINS.some((o) => o.id === from) ? from : null,
    };
  } catch {
    return { to: null, from: null };
  }
}
const LINK = readLink();
const linkUrl = (to: string | null, from: string | null) => {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return `${window.location.pathname}${qs ? `?${qs}` : ''}`;
};
const loadRecent = (): string[] => {
  try {
    const v = JSON.parse(getPref('recent') ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && PLACES.some((p) => p.id === x)).slice(0, 4) : [];
  } catch {
    return [];
  }
};

/** A tap on the map itself: the canvas or the label wrappers around it (fingers land on those too), not a button. */
const onMapSurface = (t: EventTarget | null) => t instanceof Element && !!t.closest('.map-canvas') && !t.closest('button');

/** The intro tour runs once per browser (until replayed from the ? button). */
const introSeen = () => getPref('introSeen') === '1';

/**
 * Theme follows the device (light / dark, live, also when it switches at sunset). The moon/sun button sets an
 * override that is remembered; switching back to what the device uses removes it, so the app follows the device again.
 */
const DARK_MQ = '(prefers-color-scheme: dark)';
const systemTheme = (): ThemeName => (window.matchMedia?.(DARK_MQ).matches ? 'dark' : 'light');
function savedThemeOverride(): ThemeName | null {
  try { localStorage.removeItem('theme'); } catch { /* old versions saved the theme on every load: forget it */ }
  const v = getPref('themeOverride');
  return v === 'light' || v === 'dark' ? v : null;
}

export default function App() {
  const t = useT();
  const lang = useLang();
  // place subtitles in the current language ("Laborator · Etaj 7 · Corp B")
  const places = useMemo(
    () => PLACES.map((p) => ({ ...p, subtitle: `${p.cat === 'toilet' ? t.toilet : t.laboratory} · ${floorById(p.floor).name} · ${BUILDING_NAME}` })),
    [t],
  );
  const [sysTheme, setSysTheme] = useState<ThemeName>(systemTheme);
  const [themeOverride, setThemeOverride] = useState<ThemeName | null>(savedThemeOverride);
  useEffect(() => {
    const mq = window.matchMedia?.(DARK_MQ);
    if (!mq) return;
    const on = () => setSysTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const theme = themeOverride ?? sysTheme;
  const toggleTheme = () => {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark';
    const o = next === sysTheme ? null : next; // back to the device's choice = follow the device again
    setThemeOverride(o);
    setPref('themeOverride', o);
  };
  const [colors, setColors] = useState<SceneColors | null>(null);
  const [view, setView] = useState<ViewMode>('top'); // one floor opens as a flat 2D map; all floors open in 3D
  const [floorView, setFloorView] = useState<FloorId | 'all'>(() => (LINK.to ? PLACES.find((p) => p.id === LINK.to)!.floor : '6'));
  const [resetKey, setResetKey] = useState(0);
  const [placeId, setPlaceId] = useState<string | null>(LINK.to); // destination (floor-qualified)
  const [originId, setOriginId] = useState<string | null>(LINK.from); // route start (entry or room, floor-qualified)
  const [mode, setMode] = useState<'place' | 'directions'>(LINK.from && LINK.to ? 'directions' : 'place');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [follow, setFollow] = useState(true); // camera follows the route until the user changes the view
  const [focusNonce, setFocusNonce] = useState(0);

  const [lastFloor, setLastFloor] = useState<FloorId>('6'); // floor to come back to from the all-floors view
  const [routeId, setRouteId] = useState<string | null>(null); // chosen route among the options (null = fastest)
  const [walker, setWalker] = useState(false); // walking guide on the route: optional
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const showToast = (text: string) => setToast((tt) => ({ text, n: (tt?.n ?? 0) + 1 }));
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);
  const toggleFavorite = (id: string) =>
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      setPref('favorites', JSON.stringify(next));
      return next;
    });
  // a tap on the map (not a drag, not a label) slides the phone bottom sheet down to its title strip
  const [mapTap, setMapTap] = useState(0);
  /** Slide the phone sheet down so the map shows: after a map tap, or after a choice in the sheet that changes the map. */
  const collapseSheet = () => setMapTap((n) => n + 1);
  const [navStarted, setNavStarted] = useState(false);
  // directions: false = choosing a route, true = navigating (navStarted above)
  // intro: shown on the first visit only. It counts as seen as soon as it opens, so a refresh (or leaving halfway)
  // never brings it back; the ? button replays it.
  // (someone arriving from a shared link goes straight to the room; the tour waits for their next visit)
  const [intro, setIntro] = useState(() => !introSeen() && !LINK.to);
  useEffect(() => { if (intro) setPref('introSeen', '1'); }, [intro]);
  const finishIntro = () => setIntro(false);
  const tapStart = useRef<{ x: number; y: number } | null>(null);
  const prevFloorView = useRef(floorView);
  useEffect(() => {
    if (floorView !== 'all') setLastFloor(floorView);
    // default view per mode: a single floor reads best as a flat 2D map, stacked floors only make sense in 3D
    const was = prevFloorView.current;
    prevFloorView.current = floorView;
    if (floorView === 'all' && was !== 'all') setView('3d');
    else if (floorView !== 'all' && was === 'all') setView('top');
  }, [floorView]);

  const cameraApi = useRef<CameraApi | null>(null);
  const compassRef = useRef<HTMLSpanElement>(null);
  const scaleBarRef = useRef<HTMLDivElement>(null);
  const scaleTextRef = useRef<HTMLSpanElement>(null);
  const hud = useMemo<HudRefs>(() => ({ compass: compassRef, scaleBar: scaleBarRef, scaleText: scaleTextRef }), []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    setColors(readSceneColors());
    // browser UI color (phone address bar) follows the app theme, not only the system one
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  }, [theme]);

  const place = places.find((p) => p.id === placeId) ?? null;
  const origin = ORIGINS.find((o) => o.id === originId) ?? null;

  // walks from each stairwell / the lift on the destination floor (quick choices + fastest)
  const entryRoutes = useMemo(() => (place ? ENTRIES.map((e) => findRoute(GRID, e.pos, doorGoal(place.door))) : []), [place]);
  const fastestIdx = entryRoutes.reduce<number>((best, r, i) => (r && (best < 0 || r.meters < entryRoutes[best]!.meters) ? i : best), -1);

  // every route option (each stairwell, the lift, another hallway), fastest first
  const trips = useMemo(() => {
    if (mode !== 'directions' || !origin || !place || origin.id === place.id) return [];
    return planTrips(GRID, ENTRIES, { floor: origin.floor, pos: origin.pos }, { floor: place.floor, pos: doorGoal(place.door) });
  }, [mode, origin, place]);
  const trip = trips.find((t) => t.id === routeId) ?? trips[0] ?? null;
  const steps = useMemo(
    () => (trip && origin && place ? tripSteps(trip, { name: origin.name, door: origin.door }, { name: place.name, door: place.door }, t.step) : []),
    [trip, origin, place, t],
  );

  // a new trip: show both floors when it changes floor, otherwise the floor it is on
  const tripKey = trip ? `${origin?.id}>${place?.id}` : null;
  useEffect(() => {
    setRouteId(null); // new start or destination: back to the fastest route, and choose again
    setNavStarted(false);
    if (!trip) return;
    setFloorView(trip.transfer ? 'all' : trip.legs[0].floor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripKey]);

  const nearby = useMemo<Nearby>(() => {
    if (!place) return { exit: null, toilet: null };
    const toilet = PLACES.find((p) => p.cat === 'toilet' && p.floor === place.floor);
    return {
      exit: fastestIdx >= 0 ? { entry: ENTRIES[fastestIdx], route: entryRoutes[fastestIdx]! } : null,
      toilet: toilet && place.cat !== 'toilet' ? findRoute(GRID, doorGoal(place.door), doorGoal(toilet.door)) : null,
    };
  }, [place, entryRoutes, fastestIdx]);

  // camera: the whole trip in the stacked view, or the leg on the floor being looked at; a room on its own is centered
  let focus: CameraFocus | null = null;
  if (!trip && mode === 'place' && place && follow) {
    // the lab's door, where its label and pin are (CameraRig adds the pin's height)
    const y = floorView === 'all' ? stackY(place.floor) : 0;
    const [dx, dz] = doorGoal(place.door), [cx, cz] = place.door.center;
    focus = { key: `place:${place.id}@${floorView}#${focusNonce}`, points: [[dx, y, dz], [cx, y, cz]], facing: [0, 1] };
  }
  if (trip && origin && follow) {
    const legs = trip.legs.map((l, i) => ({ ...l, i })).filter((l) => floorView === 'all' || l.floor === floorView);
    if (legs.length) {
      const first = legs[0];
      const facing = first.i === 0 ? origin.facing ?? routeHeading(first.route.points) : trip.transfer!.entry.facing;
      focus = {
        key: `${tripKey}:${trip.id}@${floorView}#${focusNonce}`,
        points: legs.flatMap((l) => l.route.points.map(([x, z]) => [x, floorView === 'all' ? stackY(l.floor) : 0, z] as [number, number, number])),
        facing,
      };
    }
  }
  // the all-floors view keeps the floor you were on as the solid one (it remembers the floor switcher)
  const activeFloor: FloorId = floorView !== 'all' ? floorView : lastFloor;

  const refocus = () => { setFollow(true); setFocusNonce((n) => n + 1); };
  const pickRoute = (id: string) => { setRouteId(id); refocus(); collapseSheet(); };
  // Start: navigation begins on the floor you are on (one floor, 2D), with the steps for that floor
  const startNavigation = () => {
    if (!trip) return;
    setNavStarted(true);
    setFloorView(trip.legs[0].floor);
    refocus();
    collapseSheet();
  };
  const changeRoute = () => {
    if (!trip) return;
    setNavStarted(false);
    setFloorView(trip.transfer ? 'all' : trip.legs[0].floor);
    refocus();
  };

  const selectPlace = (id: string) => {
    const p = PLACES.find((x) => x.id === id);
    setPlaceId(id);
    if (p && floorView !== 'all') setFloorView(p.floor);
    else if (p) setLastFloor(p.floor);
    if (mode === 'directions') refocus(); // keep directions open and re-route to the new destination
    else { setMode('place'); refocus(); } // center the room
    setRecent((rc) => {
      const next = [id, ...rc.filter((x) => x !== id)].slice(0, 4);
      setPref('recent', JSON.stringify(next));
      return next;
    });
  };
  /** Share a link to the open room (or the route): the phone's share sheet, or copy it. */
  const share = async () => {
    const url = window.location.origin + linkUrl(placeId, mode === 'directions' ? originId : null);
    const title = place ? `${place.name} · ${BUILDING_NAME}` : 'UPT Navigator';
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      showToast(t.linkCopied);
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') showToast(url); // no share/clipboard: show the link itself
    }
  };
  const startDirections = () => {
    setMode('directions');
    // keep the last start, unless it is the room we are going to now: then the nearest stairs / lift
    setOriginId((cur) => (cur && cur !== placeId ? cur : place && fastestIdx >= 0 ? gid(place.floor, ENTRIES[fastestIdx].id) : null));
    refocus();
  };
  const startHere = () => {
    setOriginId(placeId);
    setPlaceId(null);
    setMode('directions');
    setPicker('to');
  };
  const chooseOrigin = (id: string) => {
    setOriginId(id);
    collapseSheet();
    setMode('directions');
    refocus();
  };
  const swap = () => {
    if (!origin || !place || !origin.door) return;
    setOriginId(place.id);
    setPlaceId(origin.id);
    refocus();
  };
  const closeAll = () => {
    setPlaceId(null);
    setOriginId(null);
    setMode('place');
    setPicker(null);
    setFollow(false);
    setResetKey((k) => k + 1);
  };
  const backFromDirections = () => {
    if (place) { setMode('place'); setFollow(false); }
    else closeAll();
  };
  // the URL always describes what is open, so it can be copied or shared
  const url = linkUrl(placeId, mode === 'directions' ? originId : null);
  const urlRef = useRef(url);
  urlRef.current = url;
  useEffect(() => {
    try { window.history.replaceState(window.history.state, '', url); } catch { /* sandboxed */ }
  }, [url]);
  // phone Back button / browser back: closes the top layer (tour → picker → search → directions → room) instead of
  // leaving the app. One extra history entry stands for "something is open"; Back removes it and we close one layer.
  const level = intro ? 5 : picker ? 4 : searchOpen ? 3 : mode === 'directions' ? 2 : place ? 1 : 0;
  const backAction = useRef<() => void>(() => {});
  backAction.current = () => {
    if (intro) finishIntro();
    else if (picker) setPicker(null);
    else if (searchOpen) setSearchOpen(false);
    else if (mode === 'directions') backFromDirections();
    else if (place) closeAll();
  };
  const ignorePop = useRef(false);
  useEffect(() => {
    const onPop = () => {
      if (ignorePop.current) {
        ignorePop.current = false;
        try { window.history.replaceState(window.history.state, '', urlRef.current); } catch { /* ignore */ }
        return;
      }
      backAction.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    const marked = (window.history.state as { upt?: number } | null)?.upt === 1;
    if (level > 0 && !marked) window.history.pushState({ upt: 1 }, '', urlRef.current);
    else if (level === 0 && marked) { ignorePop.current = true; window.history.back(); } // closed in the app: drop the entry
  }, [level]);

  const recenter = () => (trip ? refocus() : setResetKey((k) => k + 1));
  const toggleView = () => {
    // stacked floors only work in 3D: "2D" there means going back to your floor as a flat map
    if (floorView === 'all') { changeFloorView(lastFloor); return; }
    setView((v) => (v === '3d' ? 'top' : '3d'));
    setFollow(false);
    setResetKey((k) => k + 1);
  };
  const changeFloorView = (to: FloorId | 'all') => {
    const v = to === 'all' && floorView === 'all' ? lastFloor : to; // the layers button toggles back to your floor
    setFloorView(v);
    collapseSheet();
    if (trip) refocus();
    else { setFollow(false); setResetKey((k) => k + 1); }
  };

  const pickOptions = (which: 'from' | 'to'): PickOption[] => {
    const other = which === 'from' ? placeId : originId;
    // floor of the other end first: that is usually where you are going / coming from
    const otherFloor = (which === 'from' ? place?.floor : origin?.floor) ?? activeFloor;
    const floors = [...FLOORS].sort((a, b) => (a.id === otherFloor ? -1 : b.id === otherFloor ? 1 : 0));
    const favs: PickOption[] = favorites
      .map((id) => places.find((p) => p.id === id)!)
      .map((p) => ({ id: p.id, name: p.name, subtitle: p.subtitle, cat: p.cat, section: `★ ${t.favorites}`, disabled: p.id === other, note: p.id === other ? (which === 'from' ? t.noteDestination : t.noteStart) : undefined }));
    return [...favs, ...floors.flatMap((f) => {
      const rooms = places.filter((p) => p.floor === f.id).map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        cat: p.cat,
        section: `${f.name} · ${p.cat === 'lab' ? t.sectionLabs : t.sectionFacilities}`,
        disabled: p.id === other,
        note: p.id === other ? (which === 'from' ? t.noteDestination : t.noteStart) : undefined,
      }));
      if (which === 'to') return rooms;
      const entries = ENTRIES.map((e) => ({
        id: gid(f.id, e.id),
        name: e.name,
        subtitle: t.arrivingOnShort(f.name),
        cat: e.kind,
        section: `${f.name} · ${t.sectionEntries}`,
      }));
      return [...entries, ...rooms];
    })];
  };
  const onPick = (id: string) => {
    if (picker === 'from') setOriginId(id);
    else {
      setPlaceId(id);
      // no start yet: begin at the closest stairs / lift on the destination floor (can be changed)
      const p = PLACES.find((x) => x.id === id);
      if (!originId && p) {
        const best = ENTRIES.map((e) => ({ e, r: findRoute(GRID, e.pos, doorGoal(p.door)) })).filter((x) => x.r).sort((a, b) => a.r!.meters - b.r!.meters)[0];
        if (best) setOriginId(gid(p.floor, best.e.id));
      }
    }
    setPicker(null);
    refocus();
  };

  return (
    <div
      className="map-backdrop relative h-full w-full select-none"
      onPointerDown={(e) => { tapStart.current = onMapSurface(e.target) ? { x: e.clientX, y: e.clientY } : null; }}
      onPointerUp={(e) => {
        const t = tapStart.current;
        tapStart.current = null;
        if (t && onMapSurface(e.target) && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 8) setMapTap((n) => n + 1);
      }}
    >
      {!WEBGL && <MapUnavailable lang={lang} />}
      {colors && WEBGL && (
        <MapErrorBoundary lang={lang}>
        <Scene
          colors={colors}
          view={view}
          floorView={floorView}
          activeFloor={activeFloor}
          resetKey={resetKey}
          dark={theme === 'dark'}
          trip={trip}
          walker={walker}
          focus={focus}
          destinationId={placeId}
          originId={mode === 'directions' ? originId : null}
          cameraApi={cameraApi}
          hud={hud}
          onSelectDoor={selectPlace}
          onSelectEntry={chooseOrigin}
          onSelectFloor={changeFloorView}
        />
        </MapErrorBoundary>
      )}

      {/* always on screen (also during directions): searching there picks a new destination */}
      <SearchBar places={places} favorites={favorites} recent={recent} selected={place} open={searchOpen} onOpenChange={setSearchOpen} onSelect={(p) => selectPlace(p.id)} onClear={closeAll} />

      <MapButtons
        view={view}
        dark={theme === 'dark'}
        floors={FLOORS.map((f) => ({ id: f.id, name: f.name }))}
        floorView={floorView}
        activeFloor={activeFloor}
        onFloorView={changeFloorView}
        compact={false}
        compassRef={compassRef}
        onToggleView={toggleView}
        walker={trip ? walker : null}
        onToggleWalker={() => setWalker((w) => !w)}
        onRecenter={recenter}
        onToggleTheme={toggleTheme}
        onHelp={() => { closeAll(); setIntro(true); }}
        lang={lang}
        onToggleLang={() => setLang(lang === 'en' ? 'ro' : 'en')}
        onZoom={(f) => cameraApi.current?.zoom(f)}
        onResetHeading={() => cameraApi.current?.resetHeading()}
      />

      <ScaleBar barRef={scaleBarRef} textRef={scaleTextRef} />

      <FloorBanner floorView={floorView} via={trip?.transfer && floorView === trip.transfer.to ? trip.transfer.entry.name : undefined} />

      {mode === 'place' && !place && (
        <ExploreCard
          places={places}
          collapseSignal={mapTap}
          entryCount={ENTRIES.length}
          onDirections={() => { setMode('directions'); setPicker('to'); }}
          onRecenter={recenter}
        />
      )}

      {mode === 'place' && place && (
        <PlaceSheet
          key={place.id}
          place={place}
          floorName={`${floorById(place.floor).name} · ${BUILDING_NAME}`}
          nearby={nearby}
          favorite={place.cat === 'lab' ? favorites.includes(place.id) : null}
          onShare={share}
          onToggleFavorite={() => toggleFavorite(place.id)}
          collapseSignal={mapTap}
          onDirections={startDirections}
          onStartHere={startHere}
          onRecenter={recenter}
          onClose={closeAll}
        />
      )}

      {mode === 'directions' && (
        <DirectionsSheet
          origin={origin}
          originLabel={origin ? withFloor(origin.name, origin.floor) : undefined}
          place={place}
          placeLabel={place ? withFloor(place.name, place.floor) : undefined}
          entries={ENTRIES}
          entryRoutes={entryRoutes}
          trip={trip}
          trips={trips}
          onPickRoute={pickRoute}
          steps={steps}
          isFastest={!!place && !!origin && fastestIdx >= 0 && origin.id === gid(place.floor, ENTRIES[fastestIdx].id)}
          floorView={floorView}
          onFloorView={changeFloorView}
          onPickFrom={() => setPicker('from')}
          onPickTo={() => setPicker('to')}
          onSwap={origin && place && origin.door ? swap : undefined}
          onChooseEntry={(id) => place && chooseOrigin(gid(place.floor, id))}
          onShowRoute={refocus}
          onBack={backFromDirections}
          collapseSignal={mapTap}
          navStarted={navStarted}
          onStart={startNavigation}
          onChangeRoute={changeRoute}
          onClose={closeAll}
        />
      )}

      {intro && <Intro onDone={finishIntro} />}

      {toast && (
        <div key={toast.n} role="status" className="toast pointer-events-none absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+7.25rem)] left-1/2 z-[65] max-w-[calc(100%-2rem)] -translate-x-1/2 truncate rounded-full bg-text px-4 py-2 text-sm font-medium text-bg shadow-lg sm:top-6">
          {toast.text}
        </div>
      )}

      {picker && (
        <PlacePicker
          title={picker === 'from' ? t.pickStartTitle : t.pickDestinationTitle}
          placeholder={picker === 'from' ? t.pickStartPlaceholder : t.pickDestinationPlaceholder}
          options={pickOptions(picker)}
          onPick={onPick}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
