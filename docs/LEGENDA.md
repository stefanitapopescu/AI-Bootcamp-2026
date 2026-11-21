# LEGENDA: hook-uri și skill-uri

> **Generat automat** de `.claude/scripts/gen-legend.sh`. Nu-l edita de mână: se rescrie.
> Ca să schimbi un text de aici, modifică **comentariul de la începutul scriptului** (hook-uri) sau **`description` din SKILL.md** (skill-uri).
> Se reface singur când Claude modifică ceva în `.claude/`, la fiecare pornire de sesiune și la fiecare final de răspuns.

## Hook-uri

Rulează automat, nu le pornește nimeni de mână. Sunt înregistrate în `.claude/settings.json` (comune, în git).

### `session-start.sh`

- **Când:** la pornirea sesiunii (și după /clear, /compact) (`SessionStart`) · **timp maxim:** 20 s

îi spune lui Claude cine lucrează, dacă repo-ul e la zi cu GitHub
și ce au făcut colegii recent (primele intrări din docs/LOG.md).
Tot ce se scrie pe stdout ajunge în contextul lui Claude.

### `legend-update.sh`

- **Când:** la pornirea sesiunii (și după /clear, /compact) (`SessionStart`) · **timp maxim:** 20 s
- **Când:** după ce Claude a folosit un tool (`PostToolUse`) · **pe:** `Write|Edit|MultiEdit` · **timp maxim:** 20 s
- **Când:** când Claude termină de răspuns (`Stop`) · **timp maxim:** 20 s

ține la zi docs/LEGENDA.md.
După o modificare în .claude/skills/, .claude/hooks/, .claude/scripts/ sau .claude/settings.json
rulează .claude/scripts/gen-legend.sh. La pornire și la Stop îl rulează oricum, ca să prindă
și schimbările făcute de mână sau din terminal. Nu afișează nimic și nu blochează nimic.

### `guard-secrets.sh`

- **Când:** înainte ca Claude să folosească un tool (`PreToolUse`) · **pe:** `Write|Edit|MultiEdit` · **timp maxim:** 10 s

blochează scrierea de chei secrete în cod.
- cheia Anthropic (sk-ant-...) nicăieri în afară de fișierele .env din afara web/
- cheia Supabase service_role / sb_secret_ nicăieri în web/ (nici în .env de acolo:
  Vite pune variabilele VITE_* în codul trimis browserului, deci oricine le vede)

### `kotlin-ui-check.sh`

- **Când:** după ce Claude a folosit un tool (`PostToolUse`) · **pe:** `Write|Edit|MultiEdit` · **timp maxim:** 30 s

PostToolUse (Write|Edit|MultiEdit) pe fișiere .kt din android/:
1. dacă ktlint e instalat, formatează fișierul (altfel nu face nimic);
2. semnalează culori și mărimi de font scrise direct în ecrane, în loc de tema
   Material 3 (MaterialTheme.colorScheme / typography), ca UI-ul să rămână unitar.
Nu blochează nimic: îi trimite lui Claude o observație pe care o poate corecta.

### `stop-log-check.sh`

- **Când:** când Claude termină de răspuns (`Stop`) · **timp maxim:** 20 s

dacă în sesiunea asta s-au modificat fișiere, dar docs/LOG.md nu,
îl oprește pe Claude O SINGURĂ DATĂ pe sesiune și îi cere să scrie intrarea în jurnal.

## Skill-uri

Rețete pe care Claude le încarcă singur când se potrivesc cu sarcina, sau pe care le pornești tu cu `/nume`.

| Skill | Cine îl pornește | Origine | Ce face |
|---|---|---|---|
| [`android-intent-security`](../.claude/skills/android-intent-security/SKILL.md) | tu (`/android-intent-security`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Audits, detects, and remediates Android Intent and component security vulnerabilities. Use this skill when auditing component configurations in AndroidManifest.xml (activities, services, receivers) or source code handling incoming Intents (getIntent, getParcelableExtra) to prevent Intent Redirection and unauthorized access. Don't use for network security, TLS configuration, or general runtime permission request flows. |
| [`compose-animations`](../.claude/skills/compose-animations/SKILL.md) | tu (`/compose-animations`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Use when writing or reviewing Jetpack Compose motion: visibility enter/exit, animating one property toward a target, color or size transitions, multiple properties from one state, switching composable content, or choosing between AnimatedVisibility, animate*AsState, updateTransition, rememberTransition, AnimatedContent, and Crossfade. |
| [`compose-component-design`](../.claude/skills/compose-component-design/SKILL.md) | tu (`/compose-component-design`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Use when designing or reviewing reusable Jetpack Compose component APIs with modifier parameters, root layout placement, caller-provided variable content, primitive content parameters, optional content, or boolean shape flags. |
| [`compose-state-and-effects`](../.claude/skills/compose-state-and-effects/SKILL.md) | tu (`/compose-state-and-effects`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Use when writing or reviewing Jetpack Compose state ownership, remember state, state hoisting, screen state holders, LaunchedEffect, DisposableEffect, SideEffect, Flow collection, navigation, snackbar, analytics, or focus requests. |
| [`coridor-ui`](../.claude/skills/coridor-ui/SKILL.md) | tu (`/coridor-ui`) sau Claude, automat | echipă | Regulile de UI/UX ale aplicației Coridor (Android, Compose, Material 3). Folosește-l ÎNAINTE de a crea sau modifica orice ecran sau componentă Compose din android/ (Acasă, Orar, Hartă, RoomSheet, căutare, QR), și când utilizatorul cere „mai frumos”, „polish”, „design” sau un review de UI. |
| [`edge-to-edge`](../.claude/skills/edge-to-edge/SKILL.md) | tu (`/edge-to-edge`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Use this skill to migrate your Jetpack Compose app to add adaptive edge-to-edge support and troubleshoot common issues. Use this skill to fix UI components (like buttons or lists) that are obscured by or overlapping with the navigation bar or status bar, fix IME insets, and fix system bar legibility. |
| [`finish`](../.claude/skills/finish/SKILL.md) | doar tu: `/finish` | echipă | Închide o sesiune de lucru - scrie intrarea în docs/LOG.md, apoi commit, pull --rebase și push, ca munca să ajungă la colegi. |
| [`jetpack-compose-performance`](../.claude/skills/jetpack-compose-performance/SKILL.md) | tu (`/jetpack-compose-performance`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Diagnose and optimize Android Jetpack Compose UI code. Use this skill when analyzing performance bottlenecks of existing code to minimize recomposition overhead and prevent dropped frames and UI lag. |
| [`kotlin-concurrency-and-flow`](../.claude/skills/kotlin-concurrency-and-flow/SKILL.md) | tu (`/kotlin-concurrency-and-flow`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Use when writing or reviewing Kotlin coroutine scope ownership, raw Thread or Executor work, init launches, non-suspending launch APIs, runBlocking, cancellation, StateFlow, SharedFlow, Channel, stateIn, SharingStarted, state updates, or one-shot events. |
| [`log`](../.claude/skills/log/SKILL.md) | tu (`/log`) sau Claude, automat | echipă | Adaugă sau actualizează intrarea sesiunii curente în docs/LOG.md (ora, autorul, ce s-a făcut, decizii, ce a rămas). Folosește-l la finalul fiecărei bucăți de lucru sau când utilizatorul spune „notează în jurnal”. |
| [`material-3-expressive`](../.claude/skills/material-3-expressive/SKILL.md) | tu (`/material-3-expressive`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Android UI/UX design or review with Material 3 Expressive (M3 Expressive / Material You Expressive). Use when selecting expressive component tokens, defining expressive hierarchy, motion, color, shape, typography, or reviewing Android UI against expressive guidance. Not for non-Android platforms, non-UI Android tasks, or implementation-only requests without design decisions. |
| [`start`](../.claude/skills/start/SKILL.md) | tu (`/start`) sau Claude, automat | echipă | Începe o sesiune de lucru în echipă - aduce ultimele schimbări de pe GitHub, citește jurnalul și rezumă ce au făcut colegii și ce a rămas de făcut. Folosește-l la începutul sesiunii sau când utilizatorul întreabă „ce s-a mai făcut?”. |
| [`testing-setup`](../.claude/skills/testing-setup/SKILL.md) | tu (`/testing-setup`) sau Claude, automat | extern ([THIRD_PARTY](../.claude/skills/THIRD_PARTY.md)) | Analyze and create a testing strategy for Android apps - install testing libraries, set up test infrastructure, create harnesses for unit tests, UI tests, screenshot tests, and end-to-end tests. |

## Plugin-uri activate pentru proiect

- `supabase@claude-plugins-official`

## Scripturi ajutătoare (`.claude/scripts/`)

Nu rulează singure: le apelează hook-urile, skill-urile sau Claude.

- `gen-legend.sh`: Regenerează docs/LEGENDA.md din: .claude/settings.json (hook-uri, plugin-uri), comentariul de antet al scripturilor din .claude/hooks/ și .claude/scripts/, și frontmatter-ul (name, description) din .claude/skills/*/SKILL.md. Scrie fișierul doar dacă s-a schimbat ceva. Folosire: bash .claude/scripts/gen-legend.sh
- `log-header.sh`: Afișează titlul unei intrări noi din LOG.md: data, ora, autorul și (opțional) sesiunea. Folosire: bash .claude/scripts/log-header.sh [id-sesiune]
- `whoami.sh`: Afișează numele celui care lucrează, pentru LOG.md. Ordinea: LOG_AUTHOR (din .claude/settings.local.json) > git user.name > utilizatorul OS.
- `worktree-hash.sh`: Amprenta modificărilor necommise, FĂRĂ docs/LOG.md și docs/LEGENDA.md (generată automat). Hook-urile o compară între începutul sesiunii și Stop ca să știe dacă s-a lucrat ceva.

## Hook-uri personale

Hook-urile din `.claude/settings.local.json` sunt ale fiecăruia, nu intră în git și nu apar aici.
