# Construiește aplicația web Roomly (interfața studentului)

Ești în repo-ul `ConcursTOP`. E o echipă de concurs la UPT AI Prototyping Bootcamp; finala e duminică, 22 nov 2026, la 15:00, cu un demo de 60–90 s pe telefon.

Construiești **toată interfața studentului** în `web/`:
- Acasă, Orar, Hartă (2D în SVG + 3D), Pagina sălii, Căutare, Onboarding, Profil;
- cele 6 animații și cele 4 fundaluri alese la design.

**Nu** faci admin-ul și **nu** faci importul de orar. Orarul e un mockup.

## 0. Înainte de orice
1. Rulează `git pull --rebase`. Lucrezi pe ramura `stefanita/web-app` și faci merge în `main` la finalul fiecărei faze. Nu folosi niciodată `--force`.
2. Citește, în ordinea asta:
   - `CLAUDE.md`: regulile echipei (jurnal, română în interfață, engleză în cod);
   - `docs/design/HANDOFF-design.md`: tema, animațiile, fundalurile, coordonatele;
   - `CONTEXT.md` §5 (funcționalități), §6.5–6.6 (traseu, logica de timp) și §10 (UX pe telefon, prioritate maximă);
   - `web-3d/CLAUDE.md` și codul din `web-3d/src/` (harta lui Paul);
   - `docs/design/roomly-tema.html` și `docs/design/roomly-fundaluri.html`. **Codul animațiilor și al fundalurilor din ele se portează în React, nu se reinventează.** Păstrează duratele, curbele și valorile.
3. Ce există deja în `web/` (nu rescrie nimic, doar extinde):
   - `vite.config.ts`: aliasul `@floor` → `../web-3d/src/map/floor.json`. Nu copia `floor.json`, îl generează scripturile lui Paul.
   - `src/index.css`: tokenii Plăcuța (luminos și întunecat, prin `data-theme`), `@theme inline` și clasa `.plate`.
   - `src/components/backgrounds/plan.ts`: geometria SVG din `floor.json` (`floorPath`, `wallPaths`, `doors`, `PLAN_VIEWBOX`).
   - `src/components/backgrounds/PlanDefs.tsx` și `useBackgroundMotion.ts` (`running | paused | still`, `canvasDpr`, `CANVAS_MAX_FPS`).
4. **Nu modifica nimic în `web-3d/`.** Codul lui Paul se copiază în `web/`, iar fiecare fișier copiat începe cu comentariul `// Portat din web-3d/src/...; sursa rămâne acolo.`

## 1. Decizii fixe (nu le rediscuta)
| Subiect | Decizie |
|---|---|
| Stack | Vite + React 18 + TS + Tailwind v4 (deja în `web/`). **Adaugi:** `react-router-dom`, `vite-plugin-pwa`, `vaul` (panoul de jos), `lucide-react`. **Pentru 3D:** `three`, `@react-three/fiber`, `@react-three/drei`, cu aceleași versiuni ca în `web-3d/package.json`. **Animațiile:** CSS + Web Animations API, portate din HTML-urile de design. `motion` doar dacă chiar e nevoie. Orice bibliotecă nouă se trece în `docs/LOG.md`, la Decizii. |
| Date | **Mockup local**, fără Supabase și fără import Excel. Totul trece printr-un strat `src/data/` cu funcții sincrone simple. Mai târziu se poate înlocui cu Supabase + TanStack Query fără să se schimbe ecranele. |
| Săli | Numele vin din `floor.json`, care le ia din `web-3d/scripts/door-labels.json`: **B625** (D12, real), **Lab 1–7** (provizorii), plus WC, Lift și uși „other” (neutre, fără pin). Codurile reale vin mai târziu de la D. Tot ce depinde de ele se citește din același loc. |
| Harta 2D | **SVG** desenat din `floor.json`, cu `plan.ts` refolosit. Scara: 1 m = 10 unități, `u = (x − minX)·10`, `v = (z − minZ)·10`. |
| Harta 3D | Scena lui Paul (`web-3d/src/three/*`), încărcată **lazy** (`React.lazy`, într-un chunk separat) doar când se apasă butonul „3D”. Același traseu ca în 2D. |
| Traseu | A* din `web-3d/src/nav/navigation.ts` (`buildGrid`, `findRoute`, `entryPoints`, `doorGoal`), portat în `web/src/features/routing/`. Grila se construiește o singură dată pe etaj (memoizată). |
| Start traseu | Alegerea **Scări 1 / Scări 2 / Lift** (din `entryPoints()`), plus ruta **`/q/:anchorId`** (`/q/scari-1`, `/q/scari-2`, `/q/lift`). Ruta deschide harta cu „Ești aici” în punctul ancorei, orientat după `facing`. Deocamdată fără scanner în aplicație. |
| Etaje | **Etajul 6 e real.** **Etajul 5 e MOCKUP:** aceeași geometrie, săli cu nume `B5xx · mockup`, fără traseu între etaje. E marcat peste tot ca de înlocuit (§7). |
| Ceas | **Mod demo:** `?demo=1` sau comutatorul din Profil fixează ziua și ora (marți, săptămâna 7, impară, 09:50). Fără el, aplicația folosește ora reală. Toată aplicația citește ora dintr-un singur `useNow()`. |
| Onboarding | 3 pași, fără cont: An (An 1) → Serie (Seria 1 (C), Seria 2 (D)) → Semigrupă (1.1, 1.2, 2.1, 2.2). Se salvează în `localStorage` (în `try/catch`) și se poate schimba din Profil. |
| Limbă | Tot textul din interfață e în română, cu diacritice. Identificatorii din cod sunt în engleză. |
| Telefon | Ținta e 390×844 și 360×780. Safe areas (`env(safe-area-inset-*)`), zone de atingere de cel puțin 48 px, butoanele importante în jumătatea de jos. Fără zoom accidental (`touch-action`) și fără scroll orizontal. |

## 2. Structura de foldere
```
web/src/
  main.tsx, App.tsx               router + layout
  app/
    routes.tsx                    /, /orar, /harta, /sala/:roomId, /cauta, /q/:anchorId, /start (onboarding), /profil
    Shell.tsx                     bara de sus („Corp Electro ▾” + avatar Profil) + taburi jos (Acasă · Orar · Hartă)
    theme.ts                      luminos/întunecat/sistem, scrie data-theme pe <html>
  data/
    floors.ts                     etajele: 6 (real, din @floor), 5 (MOCKUP)
    rooms.ts                      sălile derivate din ușile cu name (+ tip, etaj, corp, doorId)
    timetable.mock.ts             orarul mockup (vezi §3)
    groups.mock.ts                ani/serii/semigrupe mockup
    time.ts                       useNow(), modul demo, săptămâna didactică + paritate, acum/urmează/trecut
    search.ts                     căutare în săli, materii, profesori, grupe (fără diacritice, fără majuscule)
  features/
    home/  timetable/  room/  search/  onboarding/  profile/
    map/                          FloorMap (SVG), RoomPin, FloorChips, YouAreHere, EntryPicker, MapHeader
    routing/                      navigation.ts (portat), instructions.ts (pașii din unghiuri, CONTEXT §6.5)
    scene3d/                      scena lui Paul, portată, lazy
  components/
    ui/                           Plate, Button, Card, Chip, BottomSheet (vaul), EmptyState
    motion/                       cele 6 animații (§5)
    backgrounds/                  cele 4 fundaluri (§6) + ce există deja
```

## 3. Orarul mockup
- **Grupe:** An 1, Seria 1 (C) și Seria 2 (D), semigrupele 1.1, 1.2, 2.1, 2.2. Ore de luni până vineri, între 08 și 20.
- **Săli:** majoritatea orelor sunt în sălile de pe harta noastră: B625 și Lab 1 … Lab 7 (etajul 6). Încă 2–3 ore sunt pe etajul 5, cel de mockup.
- **Excepții**, ca să se vadă și celelalte stări:
  - o oră în **A117** (Electro, corpul A, fără hartă de interior) → cardul „Sala e în alt corp, fără hartă încă”;
  - o oră în **SPM 202** → cardul „Altă clădire”, cu butonul **Navighează** (Google Maps, adresa din `CONTEXT.md` §7.4).
- **Conținut:**
  - tipuri C/S/L;
  - profesori inventați, dar plauzibili;
  - abrevieri reale din `CONTEXT.md` §7.2 (`LSD`, `PC`, `ET`);
  - câteva `week_rule` (`[1..10]`, `[3,5,7,9]`, `[2,4,6,8,10]`).
- **Scenariul de demo garantat** (marți, 09:50, semigrupa 1.2):
  - curs live: `LSD (l)` în **Lab 3** (08–10);
  - cursul următor: `PC (l)` în **B625** (10–12);
  - după-amiază: o oră pe etajul 5 mockup și ora din A117.
- **Formatul unei intrări** e cel din `timetable_entries` (`CONTEXT.md` §8): `room_code`, `day_of_week`, `start_time`, `end_time`, `week_rule`, `group_ids`, `type`, `teacher`, `course`. Așa se potrivește mai târziu cu Supabase.

## 4. Ecranele
**Acasă** (fundal: Planul-fantomă)
- Căutarea e primul element de pe ecran. La atingere se deschide `/cauta`, cu rezultatele grupate pe Săli · Materii · Profesori · Grupe.
- Cardul **„Următorul curs”**:
  - materia și tipul;
  - plăcuța sălii, cu „Corp B · etajul 6 · Lab 3” afișat cu animația *Codul decriptat*;
  - „începe în 12 min” și butonul **Du-mă acolo**.
  - Pe 360×780 se vede fără scroll. Atingerea cardului pornește animația *Cardul devine hartă*.
- **Programul de azi:** ✓ orele trecute, ● ora de acum (în `--live`), ○ orele viitoare.
- **Stări goale:** „Nicio oră acum · următoarea la 14:00”, „Azi nu ai ore”.

**Orar** (fundal: Grila care curge)
- Vizualizare pe zi și pe săptămână, cu indicatorul „Săpt. 7 · impară” și alegerea zilei.
- Filtru: grupa mea / altă grupă / o sală / un profesor.
- Tap pe un curs:
  - dacă sala e pe hartă → tabul Hartă, pe etajul corect, cu sala evidențiată;
  - altfel → cardul de altă clădire sau alt corp.

**Hartă** (fundal: Etajul uriaș, static, în antetul etajului)
- **Planul:** SVG din `floor.json`, cu podea, pereți (1,7), uși chihlimbarii cu covoraș, scări, lift și WC.
  - Mutare și zoom cu degetele (pointer events proprii sau `react-zoom-pan-pinch`);
  - dublu tap = zoom;
  - butonul „recentrează”.
- **Pin-uri:** doar pe sălile cu nume, colorate după stare (liberă / ocupată / începe în mai puțin de 15 min). Pin-ul cursului live are animația *Pulsul*.
- **Etaje:** `FloorChips` vertical, în dreapta, cu 6 și 5 (5 are eticheta „mockup”). Butonul **Etaje 3D** pornește animația *Etajele în felii*.
- **Traseul:** `EntryPicker` cu Scări 1 / Scări 2 / Lift. Când sunt alese startul și sala:
  - traseul A* se desenează cu animația *Traseul se desenează*;
  - jos apare un pill cu metrii și minutele;
  - `RouteSteps` dă pașii (înainte / stânga / dreapta), calculați din unghiuri (`CONTEXT.md` §6.5).
- **3D:** butonul **3D** încarcă scena lui Paul (lazy), cu același traseu și aceeași sală selectată.
  - Culorile 3D vin din tokenii `--scene-*`.
  - Completează în `web/src/index.css` toți tokenii citiți de `web-3d/src/three/theme.ts`, cu culorile Plăcuța.
- **Sosirea:** la butonul „Am ajuns” sau la finalul animației traseului pornește animația *Ușa se deschide*.

**Pagina sălii** (`/sala/:roomId`)
- Apare și ca panou de jos `vaul`, cu 3 niveluri: rândul de status → ziua → complet.
- Conținut:
  - plăcuța, tipul, corpul, etajul;
  - starea de acum (ocupată / liberă / începe curând);
  - programul zilei, cu butonul **Altă zi**;
  - butoanele **Arată pe hartă** și **Du-mă acolo**.
- Pagina e aceeași, fie că vii din căutare, din orar sau de la pin.

**`/q/:anchorId`**
- Deschide harta pe etajul 6, cu „Ești aici” (punct + con de orientare) în punctul ancorei.
- Dă o vibrație scurtă (`navigator.vibrate`, dacă există).
- Apoi deschide panoul „Unde mergi?”, cu următorul curs propus.

**Onboarding** (`/start`, la prima deschidere; fundal: Clădirea care se rotește)
**Profil:** grupa, tema (luminos / întunecat / sistem) și modul demo.

**Pornirea aplicației și încărcarea hărții 3D:** fundalul *Clădirea care se rotește*.

## 5. Animațiile (componente în `components/motion/`)
Se portează din `docs/design/roomly-tema.html`, unde sunt cele 3 telefoane cu demo-uri live. Toate respectă `prefers-reduced-motion`, adică sar direct la starea finală.

1. **`RouteDraw`**
   - Linia crește de la start spre sală (`stroke-dashoffset`), iar un punct o urmează (`getPointAtLength`).
   - Pill-ul numără metrii.
   - Traseul e galben, gros de 4,4, cu contur bleumarin, pentru că galbenul singur pe podea are contrast de doar 1,4:1.
2. **`ScrambleText`**: „Corp B · etajul 6 · Lab 3” apare literă cu literă, în ~1,3 s. Plăcuța rămâne fixă.
3. **`LivePulse`**: 3 inele care cresc din pin, în `--live`, la 2,4 s, decalate.
4. **`CardToMap`**: cardul se deschide în ecranul hărții.
   - Se face cu View Transitions API, unde există. Altfel, cu `clip-path` de la dreptunghiul cardului la tot ecranul.
   - Durate: 520 ms la deschidere, 380 ms la închidere.
5. **`DoorOpen`**
   - Ușa cu plăcuța sălii se rotește (`rotateY` până la −104°, cu un mic arc).
   - În spate apare „Ai ajuns”, cu o bifă desenată.
   - Dedesubt urcă panoul sălii, cu orarul de azi.
6. **`FloorSlices`**: etajele 5 (mockup) și 6, suprapuse în CSS 3D (`rotateX(57deg) rotateZ(-36deg)`). La tap pe un etaj:
   - celelalte felii dispar;
   - felia aleasă se aplatizează (rotația merge la 0, scara crește până umple ecranul);
   - felia devine harta 2D a etajului și face zoom pe zona sălii.
   - Butonul „Etaje 3D” face drumul invers.

## 6. Fundalurile (componente în `components/backgrounds/`, fiecare cu prop `active`)
Se portează din `docs/design/roomly-fundaluri.html`. Folosesc `useBackgroundMotion` (scris deja) și `PlanDefs`.

1. **`GhostPlan`** (Acasă, Căutare)
   - `<use href="#plan">`, scalat ~1,9×, cu pereții la 16% opacitate;
   - `translate` pe 46 s, alternate;
   - traseul galben cu `stroke-dashoffset`, la fiecare 7 s.
2. **`FlowingGrid`** (Orar, fundal general): gradiente de grilă de 12 px + 60 px, `background-position` animat în 24 s, liniar.
3. **`SpinningBuilding`** (pornire, onboarding, încărcarea 3D)
   - felii SVG ale planului în CSS 3D (`rotateX(60deg)`, `rotateZ` pe 26 s);
   - etajul utilizatorului e galben;
   - feliile sunt etajele 5 (mockup) și 6.
4. **`GiantFloorNumber`** (Hartă, static)
   - numărul etajului în Overpass 900, la ~78% din înălțimea ecranului;
   - doar contur (`-webkit-text-stroke`), la 12%;
   - o dungă galbenă de 6 px în stânga.

**Reguli pentru toate fundalurile:**
- un singur fundal animat pe ecran, sub conținut, cu contrastul textului de cel puțin 4,5:1;
- culorile vin doar din tokeni;
- cu `prefers-reduced-motion` rămân pe primul cadru;
- se opresc când `document.hidden` e adevărat și când ies din viewport;
- canvas-urile, dacă apar, merg la cel mult 30 fps, cu DPR de cel mult 2.

## 7. Datele mockup, marcate „DE ADĂUGAT PE BUNE”
Creează `web/MOCKS.md`, cu tot ce e fals și cu sursa variantei reale:
- **Etajul 5:** geometria e copiată de la 6, iar sălile sunt inventate. **DE ADĂUGAT PE BUNE:** scanarea etajului și un `floor.json` propriu.
- **Numele Lab 1–7:** sunt provizorii. **DE ADĂUGAT PE BUNE:** codurile de pe plăcuțe (de la D, în `data/rooms-etaj6B.md`) trecute în `web-3d/scripts/door-labels.json`, apoi regenerat `floor.json`.
- **Orarul:** e mockup. **DE ADĂUGAT PE BUNE:** importul real (C, backend).
- **Ancorele QR:** sunt punctele de intrare ale lui Paul, nu pozițiile reale ale afișelor.

Marcajul apare în trei locuri:
- **în cod:** fiecare sursă mockup are `mock: true` și comentariul `// MOCKUP: DE ADĂUGAT PE BUNE (vezi web/MOCKS.md)`;
- **în interfață:** eticheta mică „mockup” pe etajul 5;
- **în jurnal:** fiecare punct apare în `docs/LOG.md`, la „Ce a rămas”.

## 8. Fazele
Se fac în ordine. Fiecare se termină cu verificarea din §9, o intrare în jurnal, commit și merge în `main`.

1. **Fundația**
   - dependențele, routerul, `Shell` cu taburi și safe areas;
   - tema (luminos / întunecat / sistem) și tokenii `--scene-*` completați;
   - PWA: manifest „Roomly”, iconițe, `display: standalone`, service worker cache-first pentru aplicație și `floor.json`;
   - stratul `data/` complet: etaje, săli, orar mockup, `useNow` + modul demo;
   - onboarding-ul și profilul.
2. **Harta 2D + traseul:** `FloorMap` în SVG cu mutare și zoom, pin-uri cu stări, `FloorChips`, `EntryPicker`, A* portat, `RouteSteps`, `/q/:anchorId` cu „Ești aici”.
3. **Ecranele:** Acasă, Orar, Pagina sălii (vaul, 3 niveluri), Căutare, cardurile pentru altă clădire sau alt corp, stările goale.
4. **Animațiile (§5)**, legate în ecrane.
5. **Fundalurile (§6)**, legate în ecrane.
6. **3D:** scena lui Paul portată în `features/scene3d`, lazy, cu comutator 2D/3D și același traseu. Verifică în build că three.js e într-un chunk separat.
7. **Polish:**
   - treci prin `CONTEXT.md` §10, punct cu punct;
   - font mărit la 200%;
   - etichete pentru cititorul de ecran;
   - offline: aplicația pornește fără rețea după prima vizită.

## 9. Verificarea (la fiecare fază; nu spune „gata” fără ea)
- `npm run build` în `web/` trece fără erori de tipuri.
- **Capturi headless** cu Playwright:
  - Playwright se instalează separat, nu ca dependență a proiectului;
  - pentru 3D, Chromium pornește cu `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`;
  - capturile se fac la **390×844**, în modul luminos și în cel întunecat, plus cu `prefers-reduced-motion: reduce`;
  - te uiți la ele înainte de raport.
- **Fluxul de demo, cap-coadă, în modul demo:**
  1. onboarding (An 1 · Seria 1 · 1.2);
  2. Acasă, cu „Următorul curs: PC (l) · B625”;
  3. Du-mă acolo → harta, cu traseul de la Scări 1;
  4. Am ajuns → animația ușii;
  5. pin-ul Lab 3 pulsează;
  6. Etaje 3D → feliile → înapoi pe etajul 6.
  - Separat: `/q/lift`, deschis direct.
- Toate combinațiile start × sală de pe etajul 6 au traseu, cum verificase și Paul (24/24).
- Dacă e un telefon la îndemână: `npm run dev -- --host 0.0.0.0` și test pe telefon, în aceeași rețea.
- Spune clar ce e verificat și ce e presupunere.

## 10. La final
- `docs/LOG.md`: intrarea sesiunii, cu titlul generat de `bash .claude/scripts/log-header.sh <id-sesiune>`. Bibliotecile noi intră la Decizii, iar lista din `web/MOCKS.md` la „Ce a rămas”.
- `docs/ARCHITECTURE.md`: actualizat cu ce e acum în `web/`, cu o notă că `web-3d/` rămâne sursa pentru scripturi și pentru `floor.json`.
- `CLAUDE.md`: titlul „Coridor” devine „Roomly”.
- După ultima fază: commit + push pe `main` (sau `/finish`). Fără `--force`. Conflictele se explică, nu se rezolvă pe ghicite.

## 11. Review-ul final (obligatoriu, înainte de ultimul commit)
Scopul e să dovedești că aplicația face **exact** ce scrie în promptul ăsta. Nu e suficient să spui că o face. Faci review-ul după faza 7 și, pe scurt, la finalul fiecărei faze, doar pentru punctele fazei respective.

### 11.1 Lista de verificare
Recitește promptul de la §0 la §10 și construiește un tabel cu **fiecare cerință**, câte un rând pe cerință. Nu grupa mai multe cerințe într-un rând.

| # | Cerința (din §…) | Stare | Dovada | Fișierul |
|---|---|---|---|---|
| 1 | §1: 3D încărcat lazy, three.js în chunk separat | ✅ / ⚠️ / ❌ | numele chunk-ului din `npm run build` | `features/scene3d/…` |
| 2 | §5.1: traseul galben 4,4 cu contur bleumarin | … | captura `harta-traseu-light.png` | `components/motion/RouteDraw.tsx` |
| … | … | … | … | … |

- ✅ = făcut și verificat (cu dovadă), ⚠️ = făcut parțial sau neverificat, ❌ = lipsește.
- **Dovada** e concretă: captura de ecran (numele fișierului), ieșirea unei comenzi, linia de cod (`fișier:linie`) sau pasul din flux unde se vede. „Ar trebui să meargă” nu e dovadă.
- Tabelul trebuie să acopere cel puțin:
  - toate ecranele și rutele din §2 și §4;
  - cele 6 animații din §5, cu durate și valori;
  - cele 4 fundaluri din §6, fiecare pe ecranul lui și cu regulile lor;
  - datele mockup din §3, inclusiv scenariul de marți, 09:50;
  - marcajele „DE ADĂUGAT PE BUNE” din §7;
  - deciziile din §1 (stack, limbă, telefon);
  - regula „nimic modificat în `web-3d/`”.

### 11.2 Verificări automate
Rulează-le și pune rezultatul în raport:
- `npm run build`: fără erori. Notează mărimea chunk-ului principal și a celui 3D.
- `git diff --stat main -- web-3d/`: trebuie să fie gol.
- Caută în `web/src` culori scrise direct (`#[0-9a-fA-F]{3,6}` în afara lui `index.css`) și text englezesc rămas în interfață (`Navigate`, `Choose`, `Reset`, `Top`, `Show route`). Fiecare apariție se repară sau se justifică.
- Caută `MOCKUP: DE ADĂUGAT PE BUNE` și verifică dacă toate sursele din `web/MOCKS.md` au marcajul.
- Verifică dacă toate combinațiile start × sală de pe etajul 6 au traseu. Notează câte sunt (ex. 24/24).
- Capturile de ecran de la §9 (390×844, luminos, întunecat, `prefers-reduced-motion`), câte una pe fiecare ecran și pe fiecare stare importantă. Le salvezi într-un folder ignorat de git și te uiți la fiecare.

### 11.3 Review cu ochi proaspeți
- Pornește un subagent de review (de ex. `/code-review` sau agentul `pr-review-toolkit:code-reviewer`) pe diff-ul ramurii față de `main`. Îi dai promptul ăsta drept specificație și îi ceri să caute:
  - cerințe lipsă sau făcute altfel decât scrie aici;
  - bug-uri (stări goale, ore la limită de interval, săptămâni pare/impare, rute fără traseu);
  - probleme de UX pe telefon din `CONTEXT.md` §10: zone de atingere < 48 px, contrast < 4,5:1, scroll orizontal, butoane importante sus.
- Fiecare problemă găsită se repară sau se explică de ce rămâne. Apoi se reface verificarea punctului respectiv.

### 11.4 Raportul pentru Stefanita
La final scrii un raport scurt, în română, cu:
1. tabelul de la 11.1, complet;
2. rezultatele de la 11.2;
3. ce a găsit review-ul de la 11.3 și ce s-a făcut cu fiecare problemă;
4. **abaterile de la prompt**, adică orice ai făcut altfel decât scrie aici, cu motivul. Dacă nu există, scrii explicit „Nicio abatere”;
5. ce a rămas ⚠️ sau ❌, cu pașii concreți pentru a termina.

**Nu declara aplicația gata cât timp un rând e ❌**, decât dacă Stefanita a acceptat explicit asta. Raportul intră și în `docs/LOG.md`, pe scurt, la „Ce am făcut” și „Ce a rămas”.
