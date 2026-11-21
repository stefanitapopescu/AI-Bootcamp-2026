# web-3d: harta 3D minimalistă cu navigare (prototip web)

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
- **Navigare:** alegi de unde vii (Scări 1, Scări 2, Lift) și laboratorul (din listă sau atingând eticheta pe hartă). Traseul e calculat cu A* pe o grilă a holurilor, la 40 cm de pereți, apoi netezit. E desenat albastru, animat spre ușă, iar porțiunile ascunse de pereți apar estompate. Camera se așază în spatele punctului de intrare, cu fața în direcția în care pornești, și încadrează tot traseul. Panoul arată distanța și timpul de mers.
- Vedere 3D sau de sus, temă luminoasă/întunecată, merge pe telefon.

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
│   ├── map/                  floor.json (generat), tipuri, deschideri în pereți
│   ├── nav/navigation.ts     puncte de intrare, grilă, A*, netezire
│   ├── three/                Scene, Floor, Walls, Doors, Stairs, Markers, RoutePath, CameraRig
│   └── App.tsx               interfața (panou de navigare, controale)
├── CLAUDE.md                 reguli pentru Claude în acest folder
└── log.md                    jurnalul modificărilor prototipului
```

**Stack:** Vite, React 18, TypeScript, Tailwind v4, three.js, @react-three/fiber, @react-three/drei. Scripturile Node folosesc `@gltf-transform/core`, `three-mesh-bvh` și `jpeg-js`.
