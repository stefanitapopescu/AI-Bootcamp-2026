# ARCHITECTURE: harta codului

Unde stă fiecare lucru, cum circulă datele și cine răspunde de fiecare zonă. Dacă ai intrat mai târziu în proiect, începe de aici. **Se actualizează de fiecare dată când apare un modul sau un folder nou.**

> Stare la 2026-11-21: codul nu e încă scris. Structura de mai jos e cea DECISĂ în `CONTEXT.md` §9. Folderele se creează pe măsură ce încep rolurile.

## Structura repo-ului (monorepo)

```text
ConcursTOP/
├── CLAUDE.md                 regulile proiectului, citite de Claude la fiecare sesiune
├── CONTEXT.md                produsul: decizii, model de date, stack, roluri
├── docs/
│   ├── LOG.md                jurnalul echipei (ora · autor · ce s-a făcut · ce a rămas)
│   ├── ARCHITECTURE.md       acest fișier
│   ├── PLAN.md               cine ce face și când (oameni, laptopuri, calendar până la demo)
│   └── LEGENDA.md            ce face fiecare hook și skill (GENERAT automat, nu se editează)
├── .claude/
│   ├── settings.json         hook-uri comune (în git)
│   ├── settings.local.json   setările TALE, ex. LOG_AUTHOR (NU intră în git)
│   ├── hooks/                session-start.sh, stop-log-check.sh, guard-secrets.sh, kotlin-ui-check.sh, legend-update.sh
│   ├── scripts/              whoami.sh, log-header.sh, worktree-hash.sh, gen-legend.sh
│   └── skills/               /start, /log, /finish, coridor-ui + skill-uri Android verificate (THIRD_PARTY.md; rămase de dinainte de trecerea pe web)
│
├── web/            (planificat) PWA: Vite + React + TS, Tailwind + shadcn/ui, TanStack Query, vite-plugin-pwa
│   └── src/
│       ├── app/          rute, layout, cele 3 taburi                  (A)
│       ├── components/   componente comune + ui/ (shadcn)             (A)
│       ├── features/     home, timetable, room, search                (A)
│       │                 map, routing, qr, scene3d                    (B)
│       │                 admin (rutele /admin/*, login)               (C)
│       └── lib/          client Supabase, cache (IndexedDB), tipuri   (A)
├── backend/        (planificat) FastAPI: importul orarului (openpyxl + Claude), procesarea scanărilor
├── data/           (planificat) contract.md, seed.json, scanări GLB, planuri 2D
├── pitch/          (planificat) prezentare, video de rezervă, rezultatele testelor
└── web-3d/         prototip web: hartă 3D minimalistă din scanarea GLB + uși detectate (React + react-three-fiber), vezi web-3d/README.md
```

Fișiere existente acum în rădăcină (vezi `CONTEXT.md` §17): `2_11_2025.glb`, `glb_to_plan2d.py`, `plan_2d.json/.svg/.png`, `Orar_Cro_TI_Cen_sem1_2026-2027_public.xlsx`, `prompt-research.md`.

## Cum circulă datele

```text
Excel orar ──► backend/ (openpyxl + Claude) ──► verificare admin (web/ /admin) ──► Supabase (Postgres)
                                                                                       │
Scanare GLB ──► glb_to_plan2d.py ──► plan_2d.json ──► Supabase Storage ───────────────┤
                                                                                       ▼
                 web/: Supabase → TanStack Query (+ cache IndexedDB / service worker) ──► Orar · Hartă 2D · Traseu A* · QR · 3D
```

- **Contractul de date** (formatele JSON, tabelele din `CONTEXT.md` §8) stă în `data/contract.md`. Toată lumea lucrează pe `data/seed.json` până când backend-ul e gata.
- Coordonatele: vezi `CONTEXT.md` §6.1.

## Cine răspunde de ce

| Zonă | Rol (`CONTEXT.md` §11) |
|---|---|
| `web/` (schelet, date, cache, orar, căutare) | 1. Aplicația web |
| `web/src/features/{map,routing,qr,scene3d}` | 2. Hartă, traseu, localizare, 3D |
| `backend/`, `web/src/features/admin`, Supabase | 3. Backend + admin |
| Tema Tailwind și componentele din `web/src/components/` | 4. Design UX/UI |
| `data/`, `pitch/` | 5. Date, teste, pitch |

Pentru concurs, repartizarea pe oameni (4–5 oameni, 3 laptopuri) și granițele exacte pe foldere sunt în `docs/PLAN.md`.

## Primii pași pentru un coleg nou

1. `git clone <url-repo>` și deschide folderul în Claude Code.
2. Creează `.claude/settings.local.json` (nu intră în git), cu numele tău pentru jurnal:
   ```json
   { "env": { "LOG_AUTHOR": "NumeleTău" } }
   ```
   Fără el, autorul se ia din `git config user.name`.
3. Pe Windows ai nevoie de Git for Windows (hook-urile sunt scripturi bash).
4. Scrie `/start`: Claude aduce ultimele schimbări și îți spune ce s-a făcut și ce a rămas.
5. La final, `/finish`.
