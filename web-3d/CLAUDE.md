# web-3d: reguli pentru acest folder

Prototip web: hartă 2D / 3D a etajelor 6 și 7 din corpul B (ACS; etajul 7 e o copie a etajului 6), generată din scanarea `../2_11_2025.glb`, cu uși de laborator, scări, lifturi și navigare între săli, scări și lift, inclusiv între etaje. Regulile echipei (jurnal `docs/LOG.md`, ramuri, fără `--force`, documentație în română) sunt în `CLAUDE.md` din rădăcină și au prioritate.

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
- Etichetele de pe hartă sunt în română (Scări, Lift, WC, Etaj 6). Interfața e RO + EN: orice text nou intră în ambele dicționare din `src/i18n.ts`.
- Telefonul e prioritar. Layoutul îl decide dispozitivul (`src/device.ts`): în JS folosește `phoneLayout()`, nu lățimea ferestrei.
- Un etaj se deschide în 2D (se rotește, nu se înclină), „Toate etajele” în 3D. Gesturile: 2D un deget mută; 3D un deget rotește; două degete zoom + răsucire.
- Destinația este eticheta ușii, nu o sală inventată: vârful pinului stă pe etichetă. Pinul, plecarea și eticheta au `key` diferite în `Markers.tsx`.
- Containerele invizibile de peste hartă au `pointer-events: none`. Zonele de atingere ale etichetelor se suprapun, deci câștigă cea mai apropiată (`nearestLabel`).
- Butoanele de pe hartă au `touch-action: none`, altfel browserul anulează gesturile care pornesc pe ele.
- Butonul Înapoi închide pe rând: tur → selector → căutare → traseu → sală.
- Fără timetable / ocuparea sălilor în prototipul acesta: doar navigare.
- CSP strict în `vercel.json`: un host extern nou trebuie adăugat acolo. `public/boot.js` rămâne fișier separat, înaintea scriptului aplicației.
- `web/` importă `src/map/floor.json` din acest folder: anunță echipa dacă îi schimbi formatul.

## Verificare
- După orice modificare vizuală, fă capturi headless și uită-te la ele înainte de raport: 3D, Top, temă întunecată, lățime de telefon (390×844). Playwright nu e dependență a proiectului: instalează-l separat (`npm i playwright && npx playwright install chromium`) și pornește Chromium cu `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, ca WebGL să meargă headless.
- Dacă browserul sau telefonul arată cod vechi, watcher-ul Vite a ratat o modificare: repornește serverul.
- Spune clar ce e presupunere (de ex. clasificarea laboratoarelor după plăcuțe neclare) și ce e sigur.

## Jurnale
- `docs/LOG.md` (rădăcină): o intrare pe sesiune, după regulile echipei.
- `web-3d/log.md`: istoricul detaliat al acestui prototip (în engleză, de la început). Adaugă o intrare la fiecare modificare.
