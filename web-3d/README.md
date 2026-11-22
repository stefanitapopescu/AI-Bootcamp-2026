# web-3d: harta etajelor, 2D / 3D, cu navigare (prototip web)

Prototip web care transformă scanarea 3D a etajului (`../2_11_2025.glb`, etajul 6, corpul B) într-o hartă 3D minimalistă. Pe hartă sunt laboratoarele, toaleta, lifturile și scările, iar navigarea arată traseul de la scări sau lift până la ușa laboratorului ales. Rulează în browser, inclusiv pe telefon.

## Pornire

```bash
cd web-3d
npm install
npm run dev              # http://localhost:5173
npm run dev -- --host    # accesibil și de pe telefon, în aceeași rețea
```

## Ce face

- **Holuri:** `scripts/extract-floor.mjs` găsește podeaua, conturul zonei de mers, îl aliniază și îl îndreaptă, apoi construiește pereții pe contur.
- **Uși:** `scripts/detect-doors.mjs` caută tiparul unei uși pe pereții „desfășurați” din scanare (20 de uși detectate). Clasificarea din `scripts/door-labels.json` este verificată manual:
  - **8 laboratoare** (chihlimbariu, cu nume): ușile de pe cele două holuri lungi care au hârtii pe ele sau sunt duble. Doar **B625** e citit din scanare; Lab 1–7 sunt nume provizorii.
  - **1 toaletă** (teal, WC) și **2 lifturi** (ardezie, Lift).
  - **Celelalte uși** sunt desenate în gri-bej, discret.
- **Scări:** `scripts/detect-stairs.mjs` găsește cele două case de scări din înălțimile scanării. Sunt desenate ca o zonă verde cu trepte, cu deschidere în perete.
- **Etaje:** Etaj 6 (scanat) și Etaj 7 (**copie** a geometriei etajului 6, până e scanat; laboratoarele continuă cu Lab 8–14, B725). Un etaj se deschide în 2D, „Toate etajele” în 3D.
- **Navigare:** alegi plecarea (o sală, scările sau liftul) și destinația, compari variantele (cea mai rapidă prima), apeși Pornește și primești pașii pe fiecare etaj. Traseul e calculat cu A*, pe mijlocul holurilor.
- **Telefon întâi:** panou tras de jos, gesturi pe hartă, căutare fără diacritice, favorite, linkuri de trimis (`?to=`, `&from=`), tur la prima deschidere, română / engleză, temă după dispozitiv.
- **Estimare:** conturul clădirii din jurul holurilor e aproximativ; doar holurile sunt scanate.
- **Hosting:** Vercel, publicat din folderul local al lui Paul cu `vercel --prod` (un push pe GitHub nu actualizează site-ul): https://ai-prototype-ashy.vercel.app. Antetele de securitate sunt în `vercel.json`.

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run extract` | regenerează holurile, ușile și scările din `../2_11_2025.glb` |
| `npm run doors` / `npm run stairs` | regenerează doar ușile / scările |
| `npm run inspect` | imagini de depanare în `inspect-out/` (vedere de sus, uși, plăcuțe) |
| `npm run build` | build de producție în `dist/` |

## Structură

```text
web-3d/
├── scripts/
│   ├── extract-floor.mjs     scanare → floor.json (contur + pereți)
│   ├── detect-doors.mjs      uși din scanare + clasificarea din door-labels.json
│   ├── detect-stairs.mjs     case de scări din înălțimile scanării
│   ├── door-labels.json      tipurile ușilor și numele laboratoarelor (manual)
│   ├── inspect-scan.mjs      imagini de depanare
│   └── lib/                  raycasting (BVH), texturi, PNG
├── src/
│   ├── map/                  floor.json (generat), etaje, tipuri, deschideri în pereți
│   ├── nav/                  grilă + A* (navigation), trasee între etaje (trip), pași (directions)
│   ├── three/                scena, etajele, etichetele, traseul, camera
│   ├── ui/                   căutare, panouri, butoane, tur
│   ├── i18n.ts               textele în română și engleză
│   └── App.tsx               starea aplicației
├── public/                   iconițe, manifest, boot.js (reîncearcă dacă descărcarea eșuează)
├── CLAUDE.md                 reguli pentru Claude în acest folder
└── log.md                    jurnalul modificărilor prototipului
```

**Stack:** Vite, React 18, TypeScript, Tailwind v4, three.js, @react-three/fiber, @react-three/drei, lucide-react, Inter (găzduit local, @fontsource-variable). Scripturile Node folosesc `@gltf-transform/core`, `three-mesh-bvh` și `jpeg-js`.
