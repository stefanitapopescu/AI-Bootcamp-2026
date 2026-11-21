# web-3d: reguli pentru acest folder

Prototip web: hartă 3D minimalistă a etajului 6 din corpul B (ACS), generată din scanarea `../2_11_2025.glb`, cu uși de laborator, scări, lifturi și navigare de la scări/lift la un laborator. Regulile echipei (jurnal `docs/LOG.md`, ramuri, fără `--force`, documentație în română) sunt în `CLAUDE.md` din rădăcină și au prioritate.

## Comenzi (din `web-3d/`)
- `npm run dev -- --host 0.0.0.0`: server de dezvoltare accesibil și de pe telefon (aceeași rețea).
- `npm run build`: verificare tipuri + build. Trebuie să treacă înainte de a spune că o modificare e gata.
- `npm run extract`: regenerează `src/map/floor.json` din scanare (holuri → uși → scări).
- `npm run doors` / `npm run stairs`: regenerează doar partea respectivă.
- `npm run inspect`: imagini de depanare (vedere de sus, close-up-uri cu ușile și plăcuțele) în `inspect-out/` (ignorat de git).

## Datele hărții
- Scanarea sursă este `../2_11_2025.glb` (8,5 MB), comună cu restul echipei. Nu o duplica. Dacă se mută în `data/`, actualizează căile din `package.json`.
- `src/map/floor.json` este GENERAT. Nu-l edita de mână: modifici scripturile sau `scripts/door-labels.json`, apoi regenerezi.
- Tipurile ușilor (`lab`, `toilet`, `elevator`, `other`) și numele laboratoarelor vin din `scripts/door-labels.json` (verificare vizuală manuală, potrivire după poziție).
  - Regula utilizatorului: laboratoare = ușile de pe cele două holuri lungi care au hârtii pe ele sau sunt duble.
  - În afară de **B625**, numele (Lab 1–7) sunt provizorii, până primim codurile reale ale sălilor.
- Nu ascunde nicio ușă. Toate ușile detectate rămân vizibile; cele care nu sunt laboratoare au stil neutru.
- Coordonate: metri, podeaua la y = 0, puncte `[x, z]`. Transformarea scanare → aplicație = `offset` + `rotationY` din floor.json.
- visit360.upt.ro nu are planuri de etaj sau date 3D (doar legături între panorame), deci nu poate genera alte etaje.

## Cod
- React + react-three-fiber + drei, Tailwind v4, TypeScript. Navigarea (A* pe grilă, netezire) e în `src/nav/navigation.ts`.
- Culorile sunt tokenuri CSS în `src/index.css` (temă luminoasă + întunecată), citite de `src/three/theme.ts`. Fără culori scrise direct în scenă.
- Aspect minimalist. Semnificația culorilor: chihlimbariu = laborator, teal = toaletă, ardezie = lift, verde = scări, gri-bej = alte uși, albastru = doar traseul.
- Etichetele de pe hartă sunt în română (Scări, Lift, WC).

## Verificare
- După orice modificare vizuală, fă capturi headless și uită-te la ele înainte de raport: 3D, Top, temă întunecată, lățime de telefon (390×844). Playwright nu e dependență a proiectului: instalează-l separat (`npm i playwright && npx playwright install chromium`) și pornește Chromium cu `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, ca WebGL să meargă headless.
- Dacă browserul sau telefonul arată cod vechi, watcher-ul Vite a ratat o modificare: repornește serverul.
- Spune clar ce e presupunere (de ex. clasificarea laboratoarelor după plăcuțe neclare) și ce e sigur.

## Jurnale
- `docs/LOG.md` (rădăcină): o intrare pe sesiune, după regulile echipei.
- `web-3d/log.md`: istoricul detaliat al acestui prototip (în engleză, de la început). Adaugă o intrare la fiecare modificare.
