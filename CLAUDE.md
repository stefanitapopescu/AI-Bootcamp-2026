# CLAUDE.md: regulile proiectului (Coridor)

Aplicație web pentru telefon (PWA, Vite + React): orarul studentului + harta 2D a etajului cu sala și drumul până la ea, pentru clădirea Electro (AC, UPT). Echipă de 4–5 oameni, fiecare cu **contul lui de Claude**, în UPT AI Prototyping Bootcamp (20–22 nov 2026).

## Ce citești, în ordinea asta

1. **Mesajul de la SessionStart** (vine automat): cine lucrează, dacă ești în urmă față de GitHub, ultimele 3 intrări din jurnal.
2. **`docs/LOG.md`**: ce s-a făcut, ce s-a decis, ce a rămas. Dacă ai nevoie de mai mult decât cele 3 intrări, citește mai departe.
3. **`CONTEXT.md`**: produsul, deciziile (DECIS / DE VALIDAT / DESCHIS), modelul de date, stack-ul, rolurile. Sursa de adevăr pentru „ce construim”.
4. **`docs/ARCHITECTURE.md`**: harta codului, adică unde stă fiecare lucru și cine răspunde de el.

Nu rediscuta o decizie marcată DECIS fără un motiv nou. Dacă utilizatorul o schimbă, actualizează `CONTEXT.md` și notează schimbarea în jurnal.

## Lucrul în echipă din conturi diferite

Conturile de Claude **nu își văd conversațiile**. Singura memorie comună este **repo-ul git** (CLAUDE.md, docs/, codul). Deci:

- **La început:** `git pull --rebase` (sau `/start`). Dacă SessionStart spune că ești în urmă, propune pull-ul înainte de orice modificare.
- **La final:** intrare în `docs/LOG.md`, apoi commit + push (sau `/finish`). Ce nu e în git nu există pentru colegi.
- **Ramuri:** scurte, `<nume>/<subiect>` (ex. `stefanita/harta-2d`), cu merge des în `main`. Documentele (`docs/`, `CONTEXT.md`) se pot face direct pe `main`.
- **Nu atinge zona altui rol** (vezi `docs/ARCHITECTURE.md`) fără să notezi în jurnal de ce. Contractul de date (`data/contract.md`) se schimbă doar cu acordul echipei.
- Nu forța push-ul (`--force`) niciodată. Nu rezolva conflicte pe ghicite: explică-le utilizatorului.

## Jurnal (`docs/LOG.md`)

- **O intrare pe sesiune**, cele mai noi primele, sub linia marcaj. Dacă sesiunea are deja o intrare, o actualizezi, nu adaugi alta.
- Titlul îl generează scriptul (ora + autorul), nu-l scrii de mână:
  `bash .claude/scripts/log-header.sh <id-sesiune>` → `## 2026-11-21 09:27 · Stefanita · sesiune 1a2b3c4d`
- Autorul vine din `LOG_AUTHOR` (în `.claude/settings.local.json`) sau din `git config user.name`.
- Șablon:

  ```markdown
  ## 2026-11-21 09:27 · Nume · sesiune 1a2b3c4d
  **Rol:** Aplicația web / Hartă+traseu+QR / Backend+admin / Design / Date+pitch
  **Ce am făcut:**
  - …
  **Decizii:**
  - … (sau „—”)
  **Ce a rămas:**
  - [ ] … (destul de concret ca altcineva să poată continua)
  **Fișiere:** `cale/fișier.kt`, …
  ```

- Hook-ul Stop îți cere intrarea dacă ai modificat fișiere și jurnalul nu, o dată pe sesiune.
- Fără chei API, parole sau date personale în jurnal.

## Convenții de cod

- Textul pentru utilizator și documentația: **română**. Identificatorii din cod (tabele, câmpuri, clase, funcții): **engleză**.
- Stack-ul e DECIS în `CONTEXT.md` §9. Nu adăuga biblioteci noi fără să le notezi în jurnal, la Decizii.
- Cheia Anthropic stă doar în backend (`.env`, niciodată în git sau în `web/`: tot ce e în `web/` ajunge public în browser, inclusiv variabilele `VITE_*`).
- UX-ul pe telefon are prioritate maximă (`CONTEXT.md` §10).

## Skill-uri și hook-uri

Lista completă, cu ce face fiecare, e în **`docs/LEGENDA.md`**. Fișierul e generat automat, nu-l edita de mână. Cele mai folosite:

- `/start`: pull + rezumatul a ce au făcut colegii și ce a rămas.
- `/log`: scrie sau actualizează intrarea sesiunii în jurnal.
- `/finish`: jurnal + commit + pull --rebase + push.

Când adaugi sau modifici un hook sau un skill:
- **Hook:** scriptul stă în `.claude/hooks/` și începe cu un comentariu `# <Eveniment> (<matcher>): ce face`, apoi detaliile pe rândurile următoare. Se înregistrează în `.claude/settings.json`.
- **Skill:** `description` din `SKILL.md` spune clar ce face și când se folosește. Un skill extern se trece în `.claude/skills/THIRD_PARTY.md`.
- Legenda se reface singură (hook-ul `legend-update.sh`). Manual: `bash .claude/scripts/gen-legend.sh`.
