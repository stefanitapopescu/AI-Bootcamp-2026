# Predare: designul aplicației Roomly (21 nov 2026)

Context pentru un chat nou. Aici e ce s-a decis la design și ce urmează de construit.

## Proiectul pe scurt
- **Roomly:** orarul studentului + harta etajului cu sala și drumul până la ea. Clădirea Electro (AC, UPT), etajul 6, corpul B. Concurs: UPT AI Prototyping Bootcamp. Finala e duminică, 22 nov, la 15:00, cu pitch de 3 min, din care demo-ul are ~60–90 s.
- **Platforma:** aplicație web pentru telefon (PWA), cu **Vite + React + TypeScript + Tailwind v4**, instalată pe ecranul principal. Folderul `web/` nu există încă.
- **Ce există deja:** `web-3d/`, prototipul unui coleg cu harta 3D (react-three-fiber).
  - Datele etajului sunt în `web-3d/src/map/floor.json`: conturul holurilor, pereții și **20 de uși detectate** din scanare (`id`, `center`, `width`, `tangent`, `normal`, `kind`). Coordonatele sunt în metri.
  - Culorile sunt variabile CSS în `web-3d/src/index.css` (`--bg`, `--surface`, `--text`, `--accent`, `--scene-*`). Le citește `readSceneColors()` din `web-3d/src/three/theme.ts`.
- **Numele e Roomly** (`CONTEXT.md` §1, DECIS). `CLAUDE.md` mai spune „Coridor” în titlu; trebuie aliniat.

## Tema aleasă: Plăcuța
Pornește de la plăcuțele de pe uși și indicatoarele din aeroport: contrast mare, cod de sală mare, galben de semnalizare.

| Token | Luminos | Întunecat |
|---|---|---|
| `--bg` | `#F4F6F7` | `#0B121A` |
| `--surface-solid` | `#FFFFFF` | `#142030` |
| `--text` | `#0D1B2A` | `#EAF0F5` |
| `--text-muted` | `#5A6878` | `#93A3B4` |
| `--accent` (butoane, plăcuțe) | `#0D1B2A` | `#F5B700` |
| `--on-accent` | `#F5B700` | `#0D1B2A` |
| `--route` (traseu) | `#F5B700` | `#F5B700` |
| `--live` (curs acum, alertă) | `#E4572E` | `#FF7A52` |
| `--scene-floor` (podeaua holului) | `#E2E7EB` | `#1A2736` |
| `--scene-wall-top` (pereți pe hartă) | `#0D1B2A` | `#8FA3B8` |
| `--scene-door` | `#D9A066` | `#C48A55` |
| `--scene-door-mat` | amestec 60% între ușă și podea | idem |

**Fonturi și formă:**
- **Fonturi:** titluri **Overpass 900**, text **Inter 15px**, coduri de sală (B623, B528b) **Overpass bold**. Se iau din Google Fonts; verifică diacriticele ș ț ă î â.
- **Formă:** colțuri 8px pe carduri (jumătate pe plăcuțe), umbre discrete.

**Harta 2D:**
- Pereți de 1,7 (scara 1 m = 10 unități SVG).
- Uși chihlimbarii, cu covoraș pe hol.
- Traseu galben gros de 4,4, cu contur bleumarin, pentru că galbenul singur pe podea are contrast de doar 1,4:1.

**Plăcuța de sală:** fundal `--accent`, text `--on-accent`, font Overpass 900.

## Animațiile alese (6)
1. **Traseul se desenează:** linia crește de la tine spre sală, cu un punct care o urmează. Pill-ul de jos numără metrii, iar până la B623 sunt ~29 m, adică ~25 s de mers. Se face cu SVG `stroke-dashoffset` + `getPointAtLength`.
2. **Codul decriptat:** pe cardul „Următorul curs”, `B623` rămâne pe plăcuță. Lângă ea, „Corp B · etajul 6 · sala 23” apare literă cu literă, cu un efect scramble de ~1,3 s.
3. **Pulsul cursului live:** 3 inele care cresc din pin-ul sălii în care e curs acum, în culoarea `--live`, la 2,4 s, decalate.
4. **Cardul devine hartă:** atingi cardul și el se deschide în ecranul hărții. În aplicația reală se face cu `clip-path` de la dreptunghiul cardului la tot ecranul (sau View Transitions API), 520 ms la deschidere și 380 ms la închidere.
5. **Ușa se deschide:** la sosire, o ușă cu plăcuța B623 se rotește (`rotateY` până la -104°, cu un mic arc). În spate apare „Ai ajuns” cu o bifă desenată. Dedesubt urcă panoul sălii cu orarul de azi.
6. **Etajele în felii:** etajele 5, 6 și 7, suprapuse în CSS 3D (`rotateX(57deg) rotateZ(-36deg)`). **Cerința lui Stefanita: la click pe un etaj intri în harta lui.**
   - Celelalte felii dispar.
   - Felia aleasă se aplatizează (rotația merge la 0 și scara crește până umple ecranul).
   - Felia devine harta 2D a etajului.
   - Harta face zoom pe zona sălii.
   - Butonul „Etaje 3D” face drumul invers.

Toate animațiile respectă `prefers-reduced-motion`: sar direct la starea finală.

## Fundalurile care i-au plăcut
Alese de Stefanita din galerie (4):
1. **Planul-fantomă** (animat), pe Acasă și în Căutare. SVG cu `<use href="#plan">` din `floor.json`, scalat ~1,9×, cu pereții la 16% opacitate. Se mișcă cu `transform: translate` pe 46 s, alternate. Traseul galben se desenează cu `stroke-dashoffset`, la fiecare 7 s.
2. **Grila care curge** (animat), pe Orar și ca fundal general. Gradiente de grilă de 12 px + 60 px, cu `background-position` animat în 24 s, liniar.
3. **Clădirea care se rotește** (animat), pe ecranul de pornire și la încărcarea hărții. 3 felii SVG ale planului în CSS 3D (`rotateX(60deg)`, `rotateZ` pe 26 s), cu etajul utilizatorului colorat galben.
4. **Etajul uriaș** (static), pe Hartă, în antetul etajului. Numărul etajului în Overpass 900, la ~78% din înălțimea ecranului, doar contur (`-webkit-text-stroke`) la 12%, cu o dungă galbenă de 6 px în stânga.

Pe Acasă apare **Planul-fantomă**, iar Grila care curge rămâne pentru Orar și restul ecranelor. Fiecare fundal e o componentă React separată în `web/src/components/backgrounds/`, cu prop `active`. Planul vine din același `floor.json` ca harta.

Promptul de implementare pentru aplicație: `docs/prompts/web-app.md`.

Galeria are 13 fundaluri:
- harta timpului de mers;
- panoul de plecări;
- mergi pe hol;
- planul-fantomă;
- unda „Ești aici”;
- norul din scanare;
- clădirea care se rotește;
- bandă „Pleacă acum”;
- ora din zi;
- grila care curge;
- etajul uriaș;
- planșa tehnică;
- simplu.

Reguli comune pentru oricare fundal:
- un singur fundal animat pe ecran, sub conținut, fără să scadă contrastul textului sub 4,5:1;
- culorile doar din tokeni;
- oprire cu `prefers-reduced-motion`, când `document.hidden` e adevărat sau când fundalul iese din ecran;
- canvas-urile la maximum 30 fps, cu DPR limitat la 2.

## Date de exemplu folosite în desene
- **Coordonate:** în SVG, `u = (x + 9.31) * 10`, `v = (z + 19.22) * 10`, din `bounds` din `floor.json`. ViewBox-ul pentru tot etajul e `-6 -6 193 396`.
- **B623** e pusă pe ușa **D20** (`[7.13, -18.82]`, în SVG `164.4, 4`), ca exemplu: ușile nu au încă numere.
- **„Ești aici”** e în holul central, la `[-1.5, 0.4]` (în SVG `78.1, 196.2`).
- **Traseul demo:** `M78.1 196.2 H166.6 V170.2 L172.6 164.2 V4 H166.6`.
- Pin-urile de pe etajele 5 și 7 sunt exemple: D12 pentru B528b, D07 pentru B712.

## Artefactele (private: colegii pot intra doar după ce Stefanita le dă acces din Share)
- Propuneri de animații: https://claude.ai/artifact/WZ3etCLxjLEB9ejDr3QPum (`docs/design/roomly-miscare.html`)
- Exploratorul de temă: https://claude.ai/artifact/5ndncBVm3F8ioTxnJ4y1nr (`docs/design/roomly-tema.html`). Are presetul Plăcuța, 3 telefoane live cu cele 6 animații și generează tokenii CSS.
- Galeria de fundaluri: https://claude.ai/artifact/Um1z8ejxDGNMjTc58NCffY (`docs/design/roomly-fundaluri.html`)

Codul demo-urilor din aceste fișiere HTML (vanilla JS) se poate porta direct în componente React.

## Ce urmează
- [ ] Creat `web/` (Vite + React + TS + Tailwind v4) cu tokenii Plăcuța în `web/src/index.css`. Se leagă în `@theme inline`, ca în `web-3d`.
- [ ] Ecranele: Acasă (căutare, cardul „Următorul curs”, programul de azi), Orar, Hartă (2D din `floor.json`, etaje, traseu, pin-uri), pagina sălii.
- [ ] Cele 6 animații de mai sus, ca componente separate.
- [ ] Fundalurile alese (după ce se completează secțiunea de mai sus).
- [ ] Aliniat numele „Roomly” în `CLAUDE.md`.
- [ ] Commit: fișierele din `docs/design/` și `docs/LOG.md` nu sunt încă puse în git.
