# LOG: jurnalul echipei

Ce s-a făcut, ce s-a decis, ce a rămas. Fiecare sesiune de lucru (din orice cont de Claude) adaugă **o intrare**, cu ora și autorul. Formatul e în `CLAUDE.md`, secțiunea Jurnal.

- Cele mai noi intrări sunt **primele**, imediat sub linia marcaj.
- Titlul se generează cu `bash .claude/scripts/log-header.sh`.
- La merge, git combină automat intrările tuturor (`merge=union` în `.gitattributes`). Nu șterge intrările altora.

<!-- INTRĂRI NOI AICI: cele mai noi primele -->

## 2026-11-21 12:32 · Stefanita · sesiune 82dc84da
**Rol:** organizare echipă (acces GitHub)
**Ce am făcut:**
- Diagnostic pentru „permission denied” la push-ul colegilor. Repo-ul e **public**, pe cont personal. `main` nu e protejat, nu are rulesets și nu există git hook-uri locale, deci nu de acolo vine blocarea.
- Cauze rămase: invitația de colaborator neacceptată (expiră în 7 zile) sau git logat cu alt cont GitHub în Windows Credential Manager (`git credential-manager github logout <cont>`). La `Permission denied (publickey)` se trece pe remote HTTPS.

**Decizii:**
- —

**Ce a rămas:**
- [ ] Fiecare coleg: acceptat invitația de la github.com/stefanitapopescu/AI-Bootcamp-2026/invitations. Dacă tot nu merge, trimis mesajul exact al erorii (cu „denied to …”).
- [ ] Repo-ul e încă public, deși conține scanarea clădirii (`CONTEXT.md` §13). De făcut privat după ce colegii acceptă invitațiile.
- [ ] `kotlin-ui-check.sh` nu mai are rost după trecerea la web. De scos, dacă echipa e de acord.

**Fișiere:** `docs/LOG.md`

## 2026-11-21 12:32 · Stefanita · sesiune 5740d766
**Rol:** organizare echipă (schimbare de stack)
**Ce am făcut:**
- Trecerea de la aplicația Android nativă la o **aplicație web pentru telefon (PWA)**, instalabilă pe ecranul principal. Actualizate:
  - `CONTEXT.md`: §1, §5.6, §5.8 (QR, Wi-Fi, AR), §5.10 (notificări → P2), §8 (cache), §9 (stack nou + motivele schimbării), §10 (UX pe telefon), §11–§15;
  - `docs/PLAN.md`: rolurile A/B/C, granițele pe foldere în `web/`, calendarul, ce tăiem; D verifică și semnalul în clădire;
  - `docs/ARCHITECTURE.md`: structura `web/src/...` pe roluri, fluxul de date;
  - `CLAUDE.md`: descrierea și convențiile.
- `guard-secrets.sh`: verifică acum `web/`, **inclusiv `.env`-urile de acolo** (Vite pune `VITE_*` în codul trimis browserului). Testat pe 6 cazuri.

**Decizii:**
- Stack: **Vite + React + TS + React Router, Tailwind + shadcn/ui, motion, vaul, supabase-js + TanStack Query, vite-plugin-pwa + Dexie, hartă în SVG, three.js (r3f) pentru 3D, găzduire pe Vercel.** Next.js a fost luat în calcul și respins (aplicația rulează aproape tot în browser, SSR nu ajută pe semnal slab, PWA offline e mai greu).
- **Întâi pe date, cache ca rezervă** (în loc de offline-first cu Room).
- Admin-ul e **în aceeași aplicație**, pe `/admin`, și folosește componenta de hartă a lui B. Folderele `android/` și `admin-web/` dispar, apare `web/`.
- Tăiate de platformă: AR (ARCore), Wi-Fi fingerprinting, notificările locale. App Links nu mai e nevoie: camera telefonului deschide direct `/q/<id>`.
- **De confirmat cu echipa** la următoarea ședință (stack-ul era DECIS).

**Ce a rămas:**
- [ ] Confirmarea echipei pentru trecerea pe web.
- [ ] Skill-urile Android din `.claude/skills/` (9 externe + `coridor-ui`) și hook-ul `kotlin-ui-check.sh` nu mai sunt relevante. De șters sau de înlocuit cu `coridor-ui` pentru web (Tailwind + shadcn, lista de verificare din `CONTEXT.md` §10). Skill-urile `frontend-design`, `vercel:shadcn`, `vercel:react-best-practices` sunt deja disponibile ca plugin-uri.
- [ ] A: schelet `web/` + deploy pe Vercel (vezi `PLAN.md` §3). Fixat domeniul **înainte** de printarea afișelor QR.
- [ ] D: test de semnal pe etajul 6B (date mobile + eduroam, holuri + scări).
- `.gitignore`: `dev-dist/` (service worker în dev) și `.vercel/`. `.env*`, `node_modules/` și `dist/` erau deja ignorate global.

**Fișiere:** `CONTEXT.md`, `docs/PLAN.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `.claude/hooks/guard-secrets.sh`, `docs/LOG.md`

## 2026-11-21 09:42 · Stefanita · sesiune 605d566a
**Rol:** organizare echipă (review structură + plan)
**Ce am făcut:**
- Review la structura proiectului (documente, hook-uri, scripturi, skill-uri, date). Structura de lucru în echipă e solidă; problemele găsite sunt la „Ce a rămas”.
- `docs/PLAN.md`: cine ce face pentru 4–5 oameni cu 3 laptopuri (A Android, B hartă+traseu+QR, C backend+admin, D teren+design+teste, E pitch), granițele pe foldere, calendarul până la demo, rotația laptopurilor, ce tăiem.
- `CONTEXT.md` §2 și §11: echipa reală (4–5 oameni, 3 laptopuri), cu trimitere la `PLAN.md`. `ARCHITECTURE.md`: `PLAN.md` în structură.
- `.gitignore`: `*.jks`, `*.keystore`, `.idea/`, `.vscode/`, `android/.kotlin/`.

**Decizii:**
- Propuse în `PLAN.md`, de confirmat la ședința de la 10:00: Wi-Fi și AR tăiate pentru concurs; App Links amânat (QR scanat din aplicație); calendarul academic scris direct în seed; aplicația pornește din `seed.json` din assets.

**Ce a rămas:**
- [ ] **Numele aplicației:** `CLAUDE.md` și skill-ul `coridor-ui` spun „Coridor”, iar `CONTEXT.md` §1 spune „Roomly” (DECIS). De ales unul înainte ca A să creeze pachetul Android.
- [ ] Mutat datele din rădăcină în `data/` (GLB, `plan_2d.*`, xlsx), `glb_to_plan2d.py` în `backend/tools/`, `prompt-research.md` în `docs/`, apoi actualizat `CONTEXT.md` §6.2 și §17. De făcut ACUM, înainte să cloneze colegii.
- [ ] `glb_to_plan2d.py`: `FLOOR = -1.71` și titlul figurii sunt scrise direct în cod; lipsește un `requirements.txt` (trimesh, shapely, matplotlib, numpy).
- [ ] Completate numele A–E în `docs/PLAN.md` §1 și ora demo-ului.
- [ ] Verificat că repo-ul de pe GitHub e **privat** (conține scanarea interiorului clădirii, `CONTEXT.md` §13) și adăugați colegii drept colaboratori.
- [ ] Faza 0: `data/contract.md` + `data/seed.json`.

**Fișiere:** `docs/PLAN.md`, `docs/ARCHITECTURE.md`, `CONTEXT.md`, `.gitignore`, `docs/LOG.md`

## 2026-11-21 09:40–09:47 · Stefanita
**Rol:** organizare echipă (unelte Claude Code + regulile concursului)
**Ce am făcut:**
- `docs/LEGENDA.md`: legenda generată automat cu toate hook-urile (când rulează, pe ce, ce fac), skill-urile (cine le pornește, origine, ce fac), plugin-urile și scripturile ajutătoare.
- Generatorul `.claude/scripts/gen-legend.sh` citește `settings.json`, comentariul de antet al scripturilor și `description` din fiecare `SKILL.md`. Scrie fișierul doar dacă s-a schimbat ceva.
- Hook-ul `legend-update.sh` rulează generatorul în trei momente:
  - la SessionStart;
  - la PostToolUse, doar când se modifică ceva în `.claude/skills|hooks|scripts` sau în `settings.json`;
  - la Stop.
- Legenda e exclusă din amprenta hook-ului de jurnal și are `merge=union` în `.gitattributes`.
- Convenția pentru hook-uri și skill-uri noi e trecută în `CLAUDE.md`. `/finish` regenerează legenda înainte de commit.
- Am citit ghidul oficial al participantului (Notion) și pagina UPT. `CONTEXT.md` §2 are acum:
  - programul pe zile;
  - formatul finalei: duminică la 15:00, pitch de 3 min + interviu 1-la-1 de 4 min cu juriul;
  - uneltele recomandate;
  - returnarea abonamentului Claude Pro.
- `CONTEXT.md` §12: demo-ul trebuie să încapă în pitch-ul de 3 min (~60–90 s). Restul se arată la interviu.
- `docs/PLAN.md`: persoanele apar doar ca A–E, fără nume. Formulările de tipul „cine nu are nevoie de laptop” sau „are cel mai puțin cod” au devenit neutre. Fișierul e încă local, necommis.

**Decizii:**
- Legenda e fișier generat, nu se editează de mână. Textele vin din antetul scripturilor și din `description`.

**Ce a rămas:**
- [ ] **De discutat la ședință** (`docs/PLAN.md` nu l-am modificat): repetițiile oficiale încep duminică la 12:00 și finala e la 15:00. Înghețarea „cu 4 h înainte” cade deci duminică la 11:00. Testele cu studenții, planificate duminică dimineața, se suprapun cu ea. Propunere: testele sâmbătă seara.
- [ ] Sâmbătă programul oficial se termină la 19:15. Stabiliți unde lucrați seara.
- [ ] Fiecare membru: Claude Pro + păstrat factura pentru returnare (detalii în `CONTEXT.md` §2).
- [ ] Tema anunțată vineri nu apare în ghid. De confirmat în `CONTEXT.md` §2 că ideea se încadrează.
- [ ] Opțional: antetul din `kotlin-ui-check.sh` începe cu „PostToolUse (...) pe fișiere .kt” fără „:” după paranteză, așa că prefixul rămâne în legendă. E doar cosmetic.

**Fișiere:** `.claude/scripts/gen-legend.sh`, `.claude/hooks/legend-update.sh`, `.claude/settings.json`, `.claude/scripts/worktree-hash.sh`, `.claude/skills/finish/SKILL.md`, `.gitattributes`, `CLAUDE.md`, `CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/LEGENDA.md`

## 2026-11-21 09:35 · Stefanita · sesiune e0c3248a
**Rol:** organizare echipă (unelte Claude Code)
**Ce am făcut:**
- 9 skill-uri externe pentru Android/Compose, verificate de un agent de securitate (read-only), copiate în `.claude/skills/`: `edge-to-edge`, `jetpack-compose-performance`, `android-intent-security`, `testing-setup` (Google), `compose-animations`, `compose-component-design`, `compose-state-and-effects`, `kotlin-concurrency-and-flow` (Chris Banes), `material-3-expressive`. Sursele, commit-urile și licențele sunt în `.claude/skills/THIRD_PARTY.md`.
- Skill nou al echipei: `coridor-ui` (principiile din `CONTEXT.md` §10 + ce skill folosești pentru ce + lista de verificare pe ecran).
- Hook-uri noi:
  - `guard-secrets.sh` (PreToolUse): blochează cheia Anthropic în afara `.env` și cheia Supabase service_role în `android/` sau `admin-web/`;
  - `kotlin-ui-check.sh` (PostToolUse): rulează ktlint dacă e instalat și semnalează culorile și fonturile scrise direct în locul temei M3.
- Plugin activat pentru proiect: `supabase@claude-plugins-official` (skill-uri Supabase + MCP oficial).
- Repo conectat la GitHub: `origin` = github.com/stefanitapopescu/AI-Bootcamp-2026 (**public**, confirmat de Stefanita), primul commit + push pe `main`.

**Decizii:**
- Skill-urile externe intră în repo doar după audit, cu commit-ul notat. Plugin-ul Supabase MCP se conectează la proiectul de dev.

**Ce a rămas:**
- [ ] Opțional, fiecare pe mașina lui: `kotlin-lsp` / `pyright` + plugin-urile `kotlin-lsp`, `pyright-lsp` (nu sunt activate în proiect, ca să nu dea erori celor fără binar).
- [ ] Când apare `android/`: verificat pe cod real că `kotlin-ui-check` nu dă prea multe alarme false.

**Fișiere:** `.claude/settings.json`, `.claude/hooks/guard-secrets.sh`, `.claude/hooks/kotlin-ui-check.sh`, `.claude/skills/*`, `docs/ARCHITECTURE.md`

## 2026-11-21 09:27 · Stefanita
**Rol:** organizare echipă
**Ce am făcut:**
- Am creat structura de lucru în echipă: `CLAUDE.md`, `docs/LOG.md`, `docs/ARCHITECTURE.md`.
- Hook-uri comune în `.claude/settings.json`:
  - SessionStart: arată autorul, ora, starea față de GitHub și ultimele 3 intrări din jurnal;
  - Stop: cere intrarea în jurnal dacă s-au modificat fișiere, o dată pe sesiune.
- Skill-uri: `/start`, `/log`, `/finish`.
- `.gitattributes` (`docs/LOG.md merge=union`, `*.sh` cu LF) și `.gitignore`.
- `git init` în folderul proiectului.

**Decizii:**
- Memoria comună e repo-ul git: conturile de Claude nu își văd conversațiile.
- O intrare pe sesiune, cele mai noi primele. Autorul vine din `LOG_AUTHOR` sau `git config user.name`.

**Ce a rămas:**
- [ ] Repo pe GitHub (privat) + colegii adăugați drept colaboratori; primul commit + push.
- [ ] Fiecare coleg: `git clone`, apoi `.claude/settings.local.json` cu `LOG_AUTHOR` (vezi `docs/ARCHITECTURE.md`, Primii pași).
- [ ] De confirmat dacă fișierele de date din rădăcină se mută în `data/` (atunci se actualizează `CONTEXT.md` §17).

**Fișiere:** `CLAUDE.md`, `docs/LOG.md`, `docs/ARCHITECTURE.md`, `.claude/settings.json`, `.claude/hooks/*`, `.claude/scripts/*`, `.claude/skills/*`, `.gitattributes`, `.gitignore`
