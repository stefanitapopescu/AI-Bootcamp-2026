# Change Log

A running record of every change made to the UPT Navigator prototype (hackathon, UPT Timișoara).
Newest entries first. Each entry lists what changed, why, and the files touched.

---

## 2026-11-22 — Team repo: web-3d/ brought up to date
- **What:** copied the prototype (project commit `3de5efa`) into the team repo's `web-3d/`, with the scan paths and the
  Romanian CLAUDE.md / README adapted for that repo. `floor.json` (used by the team's `web/`) is unchanged.
- **Why:** user asked to publish the changes to main on GitHub.
- **Files:** team repo `web-3d/**`, `docs/ARCHITECTURE.md`, `docs/LOG.md`.

## 2026-11-22 — Checkup bugs 1, 2, 3, 5, 6, 9, 11 fixed *(1a95973)*
- **Prompt:** "fix 1-3, 5,6,9,11" (numbers from the bug list given after the checkup).
- **1 Wrong lab opened:** the tap pads stay, and a tap goes to the nearest label icon or text.
- **2 Lab 3 ignored taps:** the labels' invisible wrappers let taps through.
- **3 Dead zone by the map buttons:** only the buttons take taps, not their container.
- **5 Back left the app with search open:** the search list is now a Back layer (its state lives in App).
- **6 Same start and destination:** Directions picks the nearest stairs / lift when the kept start is the destination.
- **9 Floor tag on the pin's tip:** the tag steps below or beside the pin.
- **11 English screen-reader labels in Romanian:** use the translations.
- **Tested (1–3):** 426/426 taps opened the right lab. Six phone layouts completed (355); landscape (38 of 43 taps)
  and laptop mouse (33 of 61) were cut short by the test timeout, with no wrong taps in what ran.
- **Not tested:** 5, 6, 9, 11 (build only), and menus, gestures and desktop buttons after these changes. Testing was
  stopped at the user's request; the user found nothing wrong.
- **Still open:** 4 map jumps back on resize, 7 search stays open on a map tap, 8 covered map buttons, 10 "60 sec",
  12 panel width. Also seen while testing: on 360 px screens Lab 5 starts under the top controls (drag the map to reach it).
- **Files:** `src/three/{Markers,FloorLevel}.tsx`, `src/ui/{MapButtons,SearchBar,DirectionsSheet}.tsx`, `src/App.tsx`,
  `CLAUDE.md`.

## 2026-11-22 — Checkup: bugs found, none fixed yet *(eb65ff3)*
- **Prompt:** "It's looking pretty well as it is right now, do some checkups and see if you can spot any bugs."
- **Labs hard to tap, three causes** (20/27 taps right at 390 px, Etaj 6 start view; same before today's pin fix):
  1. The invisible tap pads (`before:-inset-2.5`) overlap: the middle of Lab 6 opens Lab 5, Lab 3 can open Lab 4.
  2. The drei `<Html>` wrapper of a left-side label stays to the right of its icon and swallows taps on Lab 3.
  3. The map buttons' container is an invisible block (about 80 × 250 px, wider in All floors) over Lab 1–3.
  - With all three neutralized by temporary test CSS: 27/27 at 360, 390 and 430 px.
- **Other bugs:**
  1. A viewport resize (Android keyboard) throws away the user's pan and zoom (`CameraRig` effect on size).
  2. Back with the search list open leaves the app (search is not a history layer).
  3. A kept origin can equal the new destination: "Start and destination are the same" (`startDirections`).
  4. A map tap doesn't close the search list.
  5. On a 360 × 740 preview the route sheet covers the lower map buttons.
  6. All floors: the floor tag can sit on the pin's tip.
  7. `etaText` shows "60 sec" (18 of 414 start/destination pairs).
  8. English aria-labels in Romanian ("Back", "Directions").
  9. Desktop cards are 416 px wide, not 380 (the landscape class wins).
- **Correction to the "Pin on the label" entry:** its checks were wrong. The pin was off for left-side labels (its test
  printed 16/16 bad), and the "8/8" tap result had skipped the 8 failing labs.
- **Passed:** 414 route pairs (none leave the floor, no wrong exit/arrival side), 660 random button presses without
  errors, bad links, favorites, refresh + Back, intro on small screens, npm audit (runtime deps), secret scan.
- **Not covered:** real phones, Safari/Firefox, label taps on Etaj 7 and in 3D.
- **Live site:** older deploy, without the recent work and without the CSP / X-Frame-Options headers.
- **Files:** `log.md` only.

## 2026-11-22 — Pin always on its label; blank map on opening fixed *(eb65ff3)*
- **Prompt:** "Whenever you select a lab that is oriented on the left side of the map, the pin is shifted and doesn't
  sit atop the label. Make it so the pins are on top of the label always. The app sometimes loads blank when opening
  and you need to refresh. Don't add or remove anything else."
- **Pin:** React reused the label's button for the pin, so it kept the declutter pass's inline styles: left-side pins
  were 74–97 px off, and pins of hidden labels were invisible. Pin, start and label now have their own keys.
- **Blank on opening, four causes reproduced** (which one happened on the user's phone is unknown):
  1. A 0 × 0 window at launch made the camera NaN for good. `freeWindow` now guards it.
  2. A lost graphics context was never recovered. The map now rebuilds itself when back on screen.
  3. A refused graphics context showed the error at once. Now up to 3 retries a minute, then the message.
  4. A failed script/style download left a white page. `public/boot.js` now reloads, at most twice.
  - Checked: pin 0.0 px off in 90/90 (18 rooms × 5 layouts); all four causes recover, retries stop; all lab names
    visible and preview gestures identical to before (drag, pinch, tap, sheet swipe); no CSP errors.
  - Not run: the last check on the Vite dev server (interrupted by the user); production build only.
- **Files:** `src/three/{Markers,CameraRig}.tsx`, `src/ui/MapFallback.tsx`, `index.html`, `public/boot.js`, `CLAUDE.md`.

## 2026-11-22 — Pin on the label; estimated rooms removed *(eb65ff3)*
- What: removed the estimated room areas (tap zones + highlight, `src/three/Rooms.tsx` deleted). The destination pin
  now stands with its tip exactly on the lab's label (same spot as its icon); the camera focuses on the door.
  Navigation already ended at the door (`doorGoal`, in the hallway in front of it): unchanged.
- Why: user: the app should navigate to the label, not to an imaginary room.
- Files: src/three/Markers.tsx, src/three/Scene.tsx, src/App.tsx, CLAUDE.md (Rooms.tsx removed).
- Checked: 16 labs on both floors, pin in the free map area, labels tap-select on touch (all uncovered ones, 8/8).

## 2026-11-22 — Pin stands on the lab; labs easy and snappy to select *(eb65ff3)*
- **What:**
  - The destination pin was centered on the door together with its "TO" tag, so its tip landed near the wall edge.
    It is now anchored at its tip, standing in the middle of the lab's (estimated) room behind the door, with a short
    drop-in animation. The pin lets taps through, so it no longer blocks the neighbouring rooms.
  - Each lab / WC room area is a tap target (`src/three/Rooms.tsx`); the selected room is highlighted, and the room is
    centered with its pin when chosen. Label icons got a finger-sized invisible tap pad. The camera moves a bit faster.
  - Bug found while testing: on phones, taps on the 3D map never reached three's click events, and Chrome's touch
    adjustment targets the label wrappers rather than the canvas. Room taps now use our own tap detection + raycast,
    and the "tap the map to tuck the sheet away" check accepts the label wrappers too.
  - Checked: all 18 rooms (16 labs + 2 WC) get their pin well inside the visible map; tapping a neighbouring room
    selects it (8/8, touch and mouse); all earlier gesture, layout and CSP checks pass.
- **Files:** `src/three/{Rooms (new),Markers,Scene,CameraRig}.tsx`, `src/App.tsx`, `src/index.css`, `CLAUDE.md`.

## 2026-11-22 — All labs visible; phone controls fixed in the route preview *(eb65ff3)*
- **Prompt (translated from Romanian):** "Lab 11 and Lab 12 are hard to see unless you zoom out a lot. I want all labs
  to be equally visible. When you select a start and destination but haven't pressed Start (preview), the phone
  controls don't work well. Fix it."
- **Labs:** Lab 3/4/5/6 (Etaj 7: Lab 10–13) are four doors within 1.7 × 3.8 m. Every label's text went to the right,
  so Lab 4/5 (Lab 11/12) collided and were hidden as the lowest priority. Door labels now put their text towards their
  room (opposite walls → opposite sides), and lab icons are only hidden when practically on top of another. Checked:
  all labs on both floors show their names, phone and laptop, 2D and 3D.
- **Preview controls, four causes:**
  1. The tall route list pushed the route up while the orbit/zoom pivot stayed behind the sheet, so turning or
     pinching flung the route off-screen. The camera now uses padding (`setViewOffset`): it aims at the content and
     shifts the picture into the free area.
  2. Gestures that started on a map label (buttons: FROM/TO, floor tags) were cancelled by the browser
     (`touch-action: manipulation`); map labels now have `touch-action: none`.
  3. Tapping the map to tuck the sheet away also switched floors in the all-floors view; disabled during a route.
  4. Pinch zoomed towards the middle, not the fingers. Now the floor point under the fingers stays there (twist and
     move too), and the wheel zooms to the pointer.
  - A drag that starts on a label no longer opens it; a safety net resets the camera if it ever becomes invalid.
  - Checked with simulated touch: label drag 1:1, label tap opens, pinch keeps the point (164,546 → 164,545), sheet
    swipe on all phone layouts, 0 CSP violations.
- **Files:** `src/three/{CameraRig,Markers,Scene,FloorLevel}.tsx`, `src/index.css`, `CLAUDE.md`.

## 2026-11-22 — Phones always get the phone layout (landscape, "Desktop site") *(eb65ff3)*
- **What:** the layout used to follow the window width only. A phone in landscape, with Chrome's "Desktop site", or
  a big phone got the laptop layout (floating cards, no swiping, laptop buttons). It now follows the device: a touch
  screen with a phone-sized physical screen always gets the phone layout (`src/device.ts`, `<html data-phone>`, `sm:`
  and `max-sm:` redefined in index.css). In landscape the bottom sheet takes the left 26rem so the map buttons stay
  free. Checked: phone portrait / landscape / "Desktop site" swipe the sheet (66 px), laptop and tablet keep the wide
  layout.
- **Why:** user report: "the phone version now works with the laptop controls, swiping doesn't work".
- **Files:** `src/device.ts` (new), `src/main.tsx`, `src/index.css`, `src/ui/{Sheet,Intro,ExploreCard,PlaceSheet,DirectionsSheet}.tsx`, `CLAUDE.md`.

## 2026-11-22 — QA pass on the live site: fixes, sharing, back button, security, polish *(eb65ff3)*
- **Found on the live site (phone) and fixed:**
  - Search found nothing for "toaleta" (accents) or "wc"/"toilet". It is now accent-insensitive with aliases in both
    languages, and ranks name matches first.
  - Enter in the search did nothing (now opens the best match); Escape didn't close the search list or the picker.
  - The phone Back button left the app; it now closes one layer at a time.
  - The URL never changed, so nothing could be shared. It now mirrors the open room/route (`?to=`, `&from=`), with a
    share button on the room card (share sheet, else copy + "Link copied"). Shared links open straight on the room;
    unknown ids are ignored (tested with script/path-injection links).
  - Selecting a room didn't move the map (it could sit under the buttons); the room is now centered.
  - Directions on phones: the locate button overlapped the walker button (moved to the left).
  - Landscape/desktop: the floor-change banner covered the search bar (moved to the bottom, over the map).
  - The room card subtitle wrapped onto two lines (the share button moved into the action row).
- **Robustness / security:** a message instead of a blank page when WebGL is missing or the map crashes. Security
  headers in `vercel.json` (CSP, no framing/clickjacking, nosniff, referrer and permissions policy, long cache for
  hashed assets), tested locally with 0 CSP violations. Inter is self-hosted (no visitor IPs sent to Google). Cookie
  fallback marked Secure on https. `npm audit`: 0 vulnerabilities.
- **Polish:** app icon (pin over stacked floors) and favicon; home-screen install (`manifest.webmanifest`); link
  preview image and description (WhatsApp etc.); recent searches; press feedback on buttons; keyboard focus rings;
  address-bar colors match the new background.
- **Files:** `src/App.tsx`, `src/ui/{SearchBar,PlacePicker,PlaceSheet,DirectionsSheet,FloorBanner,MapFallback,searchText}.tsx/ts`,
  `src/i18n.ts`, `src/prefs.ts`, `src/main.tsx`, `src/index.css`, `index.html`, `vercel.json`, `public/*`,
  `package.json` (`@fontsource-variable/inter`), `CLAUDE.md`.

## 2026-11-22 — Theme and language follow the device; tour no longer repeats *(commit 0eec8db)*
- **What:**
  - Theme follows the device's light/dark setting live (also when the phone switches at sunset). Before, the first
    load saved the theme forever. The moon/sun button sets a remembered override; choosing the device's setting again
    clears it.
  - Language follows the device's preferred language (Romanian → RO, else EN), with the same override rule.
  - The intro tour counts as seen as soon as it opens, so a refresh or leaving halfway never brings it back
    (? replays it).
  - Preferences are kept in localStorage with a first-party cookie fallback (new `src/prefs.ts`), so browsers that
    wipe localStorage still remember them.
  - Checked 10 scenarios headless (device dark/light/RO/EN, refresh, overrides, wiped localStorage, new visitor).
- **Why:** user request.
- **Files:** `src/prefs.ts` (new), `src/App.tsx`, `src/i18n.ts`, `CLAUDE.md`.

## 2026-11-22 — Chip row scrolls sideways on phones *(commit 0eec8db)*
- **What:** the Favorite / Laboratoare / WC row can now be swiped sideways, so in Romanian the WC chip behind the floor
  menu can be reached. The row had `pointer-events: none` (inherited so the empty search area doesn't block the map),
  which also blocked the swipe; the row itself now takes touches (it is only as wide as its chips) with horizontal
  panning only. Checked with a simulated touch swipe: it scrolls to the end, and WC is visible and tappable.
- **Why:** user report: WC hidden behind the "Etaj" menu and no way to scroll to it.
- **Files:** `src/ui/SearchBar.tsx`.

## 2026-11-21 — English / Romanian language switch *(commit 0eec8db)*
- **What:** the whole UI is available in English and Romanian, switched with an **EN / RO** button in the map controls.
  This covers search, chips, cards, the directions panel, route options, turn-by-turn steps ("Ieși din B625 și virează
  la stânga"), the floor menu, legend, banners, accessibility labels and the intro tour. The choice is remembered per
  browser; a first visit follows the browser language. Map labels stay as the building's Romanian names. In Romanian,
  the chip row (longer words) scrolls sideways with a soft edge fade.
- **Why:** user request.
- **Files:** `src/i18n.ts` (new: dictionaries + `useT`), `src/nav/{directions,trip}.ts` (step phrases), `src/App.tsx`,
  `src/ui/*.tsx`, `src/three/{Scene,Markers}.tsx`, `CLAUDE.md`.

## 2026-11-21 — First-run intro tour *(commit 0eec8db)*
- **What:** a guided tour on first visit. The screen dims and a spotlight moves over the real elements: search bar,
  Favorites/Labs/WC chips, floor menu, map controls (2D/3D, compass, legend, theme, help), Get directions, and the
  bottom sheet (phones only). It then shows how to move the map: animated finger gestures on touch screens (move,
  pinch, twist, 3D look-around), mouse controls on desktop. Skip, back and next buttons; Esc and arrow keys work.
  It is remembered per browser, and a new **?** button in the map controls replays it.
- **Why:** the user asked for onboarding for first-time users, especially on phones.
- **Files:** `src/ui/Intro.tsx` (new), `src/App.tsx`, `src/ui/{MapButtons,SearchBar,ExploreCard}.tsx` (`data-tour`
  markers, ? button), `src/index.css` (gesture animations), `CLAUDE.md`.

## 2026-11-21 — Hosted on Vercel *(commit 700f313)*
- **What:** the app is live at https://ai-prototype-ashy.vercel.app. The user deployed it with the Vercel CLI from the
  local folder (`vercel` → `vercel --prod`), project "ai-prototype", with no GitHub connection. `.vercelignore` (by the
  user) keeps `assets/` out of the upload. Checked: page and assets load without login (200) and the phone layout
  renders. Preview links (with a hash) are behind Vercel login by default.
- **Why:** so people can use the app from any network.
- **Files:** `.vercelignore`, `CLAUDE.md` (hosting notes). The `.vercel/` link folder stays local.

## 2026-11-21 — Search bar always visible, exact minimized strip, one Start button *(commit 700f313)*
- **What:**
  - The search bar stays on screen in every mode; searching during directions picks a new destination.
  - A minimized sheet stops exactly under its header text, and the content below fades out instead of peeking through.
  - Only the big Start button remains in the route preview.
- **Why:** user feedback.
- **Files:** `src/App.tsx`, `src/ui/{Sheet,DirectionsSheet}.tsx`, `src/index.css`, `CLAUDE.md`.

## 2026-11-21 — Route preview + Start, sheet fixes, 2D turning, camera jitter fix *(commit 700f313)*
- **What:**
  - Fixed the camera jitter after choosing a route with the sheet open: the goal is now clamped to the pan and zoom
    limits, which used to pull the camera back every frame so the animation never settled.
  - Directions flow: route preview (every option with time, distance and stairs/lift, fastest first) → Start →
    navigation from the floor you start on (2D, that floor's leg). "Change route" goes back to the preview.
  - Sheets slide down to their title strip after a choice that changes the map (route, floor, start point, Start).
    The strip is measured from the header and cannot be dragged lower. The strip shows the route ("1 min · By lift").
  - 2D can turn: two-finger twist (also in 3D) and right mouse drag; the tilt stays flat.
  - Steps ignore bends under 0.6 m (Douglas–Peucker), so routes that keep off the walls don't produce
    "Bear right" ×3.
  - Tapping the FROM tag no longer makes the start the destination.
- **Why:** user feedback.
- **Files:** `src/three/{CameraRig,Markers}.tsx`, `src/ui/{Sheet,DirectionsSheet}.tsx`, `src/nav/directions.ts`, `src/App.tsx`, `CLAUDE.md`.

## 2026-11-21 — Favorites under the search bar, smoother sheets, fewer labels *(commit 700f313)*
- **What:**
  - Favorites is now a chip under the search bar (next to Labs and WC); "Toilet" is shortened to "WC" so the row fits
    beside the floor menu on a phone.
  - The explore sheet no longer lists rooms, and the favorites tab is gone from it.
  - Pulling a sheet up or down animates its extra content (`SheetMore`: animated grid rows + fade) instead of popping.
  - Labels: during directions only the route's own labels are shown; otherwise overlapping labels hide completely.
  - The one-finger 3D touch is confirmed and kept.
- **Why:** user feedback.
- **Files:** `src/ui/{SearchBar,ExploreCard,PlaceSheet,DirectionsSheet,Sheet}.tsx`, `src/three/{Markers,Scene}.tsx`, `src/App.tsx`, `CLAUDE.md`.

## 2026-11-21 — Draggable sheets, favorites, standard zoom, one-finger 3D turning *(commit 700f313)*
- **What:**
  - Phone bottom sheets can be dragged (they follow the finger and snap min / peek / full), and a tap on the map slides
    them down to their title strip, animated. The directions peek is more compact (the route options show the time).
  - The floor menu sits next to the Labs/Toilet chips, right under the search bar.
  - The map icon is gone from the search bar (only the search icon remains).
  - Favorites: star a lab in its card; a Favorites tab in the explore card and a "★ Favorites" section at the top of the
    destination picker. Stored per browser.
  - The app opens at the standard zoom, not the whole-floor overview. The standard zoom is now 0.75 (was 0.9).
  - Touch in 3D: one finger turns and tilts, two fingers move and zoom (feedback pending).
  - The FROM tag floats above the start point on a stem, so it no longer covers it.
  - The map is centered between the floor menu and the bottom sheet.
  - See-through floors are less transparent (0.26 → 0.42).
  - Trips between floors: the start floor is solid in 3D.
- **Why:** user feedback (phone use).
- **Files:** `src/ui/{Sheet,ExploreCard,PlaceSheet,DirectionsSheet,SearchBar,MapButtons}.tsx`, `src/three/{CameraRig,Markers,Scene,FloorLevel}.tsx`,
  `src/App.tsx`, `CLAUDE.md`.

## 2026-11-21 — Flat 2D, standard camera, routes off the walls, new ground *(commit 700f313)*
- **What:**
  - No shadows in 2D.
  - 2D is locked: no tilting or rotating; only 3D mode can.
  - One standard orientation for every view, the same tilt per mode, and a standard route zoom (`ROUTE_ZOOM` = 0.9 × the
    whole-floor distance), so short routes no longer zoom in.
  - Routes keep away from walls: A* adds a cost near walls, and the straightened path never cuts closer than A* did.
    Over all 132 same-floor pairs the median wall distance went 0.68 → 0.85 m and the 5th percentile 0.44 → 0.58 m;
    the narrow 1.5 m hallways are the limit.
  - Other routes are no longer drawn as gray lines; they are choices in the directions panel only.
  - The site grid is replaced by a plain, soft stone-colored ground under the building that fades into the background.
- **Why:** user feedback.
- **Files:** `src/nav/navigation.ts`, `src/three/{CameraRig,Scene,Site,RoutePath,theme}.tsx/ts`, `src/App.tsx`,
  `src/ui/MapButtons.tsx`, `src/index.css`, `CLAUDE.md`.

## 2026-11-21 — Phone first: route options (stairs/lift), 2D/3D defaults, floor dropdown, building outline *(commit 700f313)*
- **What:**
  - Route options: every stairwell plus the lift for trips between floors (fastest first), chosen in the panel or by
    tapping the gray bubble of another route on the map. Same-floor alternatives are searched too, but the hallways
    leave only one sensible way (0 of 132 pairs).
  - Clear ends: "FROM …" pill at the start, "TO …" pill above the destination pin.
  - Floor dropdown "Etaj 6 ▾" (Etaj 7 / Etaj 6 / All floors), and a text "2D"/"3D" button instead of the duplicate
    layers icon. One floor opens in 2D (route framed north-up), All floors in 3D; "2D" in All floors goes back to the
    last floor (this fixes the camera jumping there).
  - The walking guide is now a smooth figure and optional (button on the right while a route is shown, off by default).
  - Floor change: labels on the new floor show at once, and the animation is shorter.
  - Map context: building outline (hallways grown by ~5 m of rooms, an ESTIMATE) on a fading 2 m / 10 m site grid.
  - `CLAUDE.md`: phone-first rule, view defaults, outline estimate.
- **Why:** user feedback. Focus on phones; the background looked like a void; the walker looked blocky and seemed to slow
  floor switching; floor numbers were unclear; start and end needed to be clearer; lift option and alternative routes
  were requested; two identical icons; the view-mode button misbehaved with all floors.
- **Files:** `src/nav/{navigation,trip}.ts`, `src/App.tsx`, `src/three/{Scene,FloorLevel,Markers,RoutePath,Walker,Site,CameraRig,theme}.tsx/ts`,
  `src/ui/{MapButtons,DirectionsSheet,FloorBanner}.tsx`, `src/index.css`, `CLAUDE.md`.

## 2026-11-21 — Navigation focus: floor 7 lab numbers, walker, floor-change animation, new backdrop *(commit 700f313)*
- **What:** labs on Etaj 7 are Lab 8–14 (B725 stays). The all-floors view remembers the floor you were on (it stays
  solid and is outlined in the floor switcher; the layers button toggles back to it). A little yellow guy walks the route
  in a loop (climbs the dashed link in the stacked view). Changing floor slides the old floor away and fades it out while
  the new one comes in from above/below, plus an "Up to Etaj 7 · via Scări 2" banner. The canvas is now transparent over a
  soft blue gradient (navy in dark mode). Timetable, room status, Schedule/Exams tabs and the demo clock are removed. The
  home card is now "Get directions" plus the rooms of each floor. Picking a destination with no start begins at the
  closest stairs or lift.
- **Why:** user feedback: floor 7 labs were confusing, the background looked blank, focus on navigation, and make the floor
  change easier to follow.
- **Design notes applied:** figure/ground (a light floor on a tinted backdrop), the route as the highest-contrast element,
  the active floor clearly filled in the switcher, consistent category colors.
- **Files:** `src/map/building.ts`, `src/App.tsx`, `src/three/{Scene,FloorLevel,Markers,Walker}.tsx`,
  `src/ui/{ExploreCard,PlaceSheet,MapButtons,FloorBanner}.tsx`, `src/index.css`, `CLAUDE.md`; deleted
  `src/data/demoSchedule.ts`, `src/ui/Status.tsx`.

## 2026-11-21 — Second floor, all-floors view, cross-floor directions, demo timetable *(commit 700f313)*
**What:**
- **Etaj 7:** exact copy of Etaj 6's geometry (`src/map/building.ts`: floor list, floor-qualified ids like `7:D12`,
  room codes follow the floor: B625 → B725; Lab 1–7 placeholders on both floors).
- **Floor switcher** (right, Google-indoor style): 7 / 6 / **All floors**. The all-floors view stacks the floors 8 m
  apart (exploded); floors that aren't active are drawn see-through (same x-ray idea as the route behind walls), with
  only route-relevant labels. Each floor has a tag ("Etaj 7"), anchored at its leftmost on-screen corner; tapping the
  tag or the floor itself opens that floor. Floors glide to their height when switching.
- **Cross-floor directions** (`src/nav/trip.ts`): walk to a stairwell or the lift, change floor (stairs 20 s per floor,
  lift 45 s), walk to the room; the connector with the shortest total time wins. Steps are grouped per floor
  ("Take Scări 2 up to Etaj 7", "Leave Scări 2 on Etaj 7"). A trip over two floors opens in the all-floors view with
  both floors see-through and a dashed vertical link at the stairs; "Both floors / Etaj 6 / Etaj 7" buttons (and the
  floor headings in the steps) show one leg at a time; on the first floor a bouncing **"Continue on Etaj 7"** button sits
  at the stairs. Checked: all 162 cross-floor room pairs route.
- **Against the "empty" feel (demo timetable, `src/data/demoSchedule.ts`, always labelled DEMO):**
  - lab labels get a green/red dot (free / class in progress);
  - place card: "Free until 12:00" / "In use until 14:00 · subject", classes today, **Schedule** tab (day chips, time,
    subject, Lab/Seminar/Course badge, group, "Now" highlight), **Exams** tab with the room's **next free slot** for
    1/2/3 h (the roadmap feature, real algorithm on demo data);
  - **Explore card** when nothing is selected: building at a glance (floors, labs, free now, WC) and the list of labs
    free right now; clock chip toggles live time / demo time (Tue 10:30; default outside class hours, e.g. weekends).
- Fog pushed back so zoomed-out stacked views don't fade out.

**Files:** `src/map/building.ts`, `src/nav/trip.ts`, `src/data/demoSchedule.ts`, `src/three/FloorLevel.tsx`,
`src/ui/ExploreCard.tsx`, `src/ui/Status.tsx` (new); `src/App.tsx`, `src/three/Scene.tsx`, `src/three/Markers.tsx`,
`src/three/CameraRig.tsx`, `src/nav/directions.ts`, `src/ui/PlaceSheet.tsx`, `src/ui/DirectionsSheet.tsx`,
`src/ui/MapButtons.tsx`, `src/ui/SearchBar.tsx`, `CLAUDE.md`.

## 2026-11-21 — Phone layout and mobile web fixes *(commit 700f313)*
**What:** The app didn't fit well on phones.
- **Map buttons:** grouped into compact pills (floor badge; view / compass / legend / theme), 40 px on phones. Zoom
  and recenter are desktop-only in the column; phones get a floating **locate button** bottom-right that sits just
  above whatever sheet is open (hidden while a sheet is expanded).
- **Bottom sheets (phones):** open as a **peek** and expand by tapping or swiping the handle. Place card peek = name +
  Directions / Start here (tabs on expand). Directions peek = From / To + time + Show route, with a "N steps · other
  starts" link (entry choices + steps on expand). Max 75% of the screen, inner scroll.
- **Camera framing:** the free screen area is now measured from the DOM (panels marked `data-overlay`; each counts as
  a bar on the side where it hides the least map), so routes and the overview land in the visible part on phones,
  desktop and landscape phones. More padding so pins and labels aren't cut; pan margin 4 m so a route near the
  building's end can slide out from under a panel.
- **Mobile web:** `100dvh` (address bar), no page bounce / pull-to-refresh / double-tap zoom on the map, inputs at 16 px
  (no iOS auto-zoom on focus), `maximum-scale=1`, theme-color follows the app theme, home-screen web-app meta tags,
  pickers don't pop the keyboard on touch devices, `100vh` → `100dvh` in panel heights.

**Files:** `src/ui/Sheet.tsx` (new: handle + locate button), `src/ui/MapButtons.tsx`, `src/ui/PlaceSheet.tsx`,
`src/ui/DirectionsSheet.tsx`, `src/ui/SearchBar.tsx`, `src/ui/PlacePicker.tsx`, `src/App.tsx`,
`src/three/CameraRig.tsx`, `src/index.css`, `index.html`.

## 2026-11-21 — Start from any room, turn-by-turn steps, more map controls, zoom-in limit *(commit 700f313)*
**What:**
- **Choose the starting point:** a route can start from any room (labs, WC), not only stairs/lift. New Google-Maps-style
  **directions panel** with **From / To** fields (each opens a searchable picker: entry points, laboratories, facilities),
  a **swap** button (room ↔ room), quick "start from Scări 1 / Scări 2 / Lift" choices with walking times, ETA + distance.
  Place card got a **Start here** button (sets that room as the start and asks for the destination).
- **Turn-by-turn steps** (`src/nav/directions.ts`): "Exit B625 and turn left → Go straight for 15 m → Bear left →
  Arrive at Lab 3, the door is on your right" (turns ≥ 25°, "bear" under 60°, side of the destination door from its
  normal). Collapsible list (open on desktop, closed on phones). Checked on all 99 start/destination pairs: all routed.
- **Place card:** Overview / Schedule / Exams tabs (Schedule and Exams show an honest "not imported yet" state until the
  Excel import exists), nearest way out (stairs/lift) and nearest toilet with walking time.
- **Map controls:** floor badge with "FLOOR" label, **compass** (needle shows rotation from the default heading; tap to
  turn back), **zoom +/−** (desktop), **legend** popover (category colors, other doors, route, start, destination),
  **scale bar** bottom-left (1/2/5/10/20/50 m, updated every frame).
- **Zoom-in limit:** the narrower screen side always shows at least 14 m of floor (was 3 m camera distance).
- **Route framing fix:** the route is fitted into a window of the free screen area's size and then the view slides so it
  sits in that area (phones: above the bottom sheet). Before, long routes on phones zoomed far out.

**Files:** `src/App.tsx`, `src/nav/navigation.ts` (`Origin`, `routeHeading`), `src/nav/directions.ts` (new),
`src/ui/DirectionsSheet.tsx` (new), `src/ui/PlacePicker.tsx` (new), `src/ui/PlaceSheet.tsx` (rewritten),
`src/ui/MapButtons.tsx` (+ `ScaleBar`), `src/three/CameraRig.tsx` (camera API, HUD, limits, framing),
`src/three/Scene.tsx`, `src/three/Markers.tsx` (start highlight works for rooms too).

## 2026-11-21 — Limit zoom-out and panning *(commit 700f313)*
**What:** The map could be zoomed out and dragged endlessly into empty space.
- **Zoom-out limit:** max distance = 1.25 × the distance that shows the whole floor (3D or top, whichever is larger),
  recomputed on resize; never below the current camera goal. Min distance 3 m.
- **Pan limit:** the view center (controls target) is clamped every frame to the floor bounds (margin 0); target and
  camera shift together so the viewing angle doesn't change. The building always stays on screen.
- Shadow-catching ground plane cropped to 1.4× the building size (was 3×).
- UI made non-selectable so dragging the map across the search bar no longer selects text.

**Files:** `src/three/CameraRig.tsx`, `src/three/Floor.tsx`, `src/App.tsx`.

## 2026-11-21 — Lab labels at their doors + decluttering *(commit 700f313)*
**What:**
- Lab and WC labels are anchored right at their door (15 cm into the hallway, just above the door panel) instead of
  0.9 m into the corridor, where labels of facing doors met in the middle. The icon marks the exact spot; text extends
  to the right.
- Maps-style decluttering (`src/three/Markers.tsx`, ~15 Hz): labels are projected to the screen in priority order
  (destination, chosen entry, entries, WC, labs); a label whose text would overlap one already placed collapses to its
  icon, and the text returns when you zoom in. Destination and chosen entry always keep their text.

**Files:** `src/three/Markers.tsx`.

## 2026-11-21 — Maps-style interface (Google/Apple Maps look) + readable dark mode *(commit 700f313)*
**What:** Interface redesign only; map logic unchanged.
- **Search bar** (top-left, full width on phones): "Search for a lab", suggestions with category icons, filter; quick
  category chips **Labs** / **Toilet** under it. The toilet is now a destination too.
- **Floating round map buttons** (right): indoor floor badge "6", 3D/Top toggle, recenter, theme.
- **Place card** after picking a lab (name, "Laboratory · Etaj 6 · Corp B", **Directions** button), then a
  **directions card**: entry options (Scări 1 / Scări 2 / Lift) each with its walking time, the **fastest is picked
  automatically**, big ETA ("15 sec", seconds under a minute) + distance, **Show route**. Bottom sheet on phones,
  floating card under the search bar on desktop. Route fit area adapted to the new layout.
- **Map labels:** round colored category icons + haloed text (like map labels); the destination is a red teardrop pin;
  the chosen entry is highlighted.
- **Colors:** maps-like palette (Google blue accent, lighter gray background). **Dark mode:** neutral darker surfaces,
  brighter text (#f1f3f4 / #b4bac2), lighter floor (#31363e), bright wall outlines (#d2d7de), brighter doors and route.

**Files:** `src/ui/SearchBar.tsx`, `src/ui/MapButtons.tsx`, `src/ui/PlaceSheet.tsx` (new), `src/App.tsx` (rewritten),
`src/three/Markers.tsx` (rewritten), `src/three/Scene.tsx`, `src/three/CameraRig.tsx`, `src/index.css`.

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
