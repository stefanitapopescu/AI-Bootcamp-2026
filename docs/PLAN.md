# PLAN: cine ce face până la demo

> Echipa: **4 oameni, posibil 5**, dar doar **3 laptopuri**. Fiecare are contul lui de Claude.
> Situația la 2026-11-21 09:45 (ziua 2 din 3): documentele și uneltele sunt gata, **codul nu e scris încă**.
> Planul înlocuiește, pentru concurs, tabelul de roluri din `CONTEXT.md` §11 (5 roluri pe 5 calculatoare).
> Persoanele sunt notate cu literele **A–E**, fără nume. Fiecare știe ce literă are, iar toate rolurile cântăresc la fel în notă (juriul punctează prototipul, testele și pitch-ul). Ținem fișierul la zi la fiecare ședință.

## 1. Cine pe ce stă

| Cine | Unealtă | Rol | Răspunde de |
|---|---|---|---|
| **A** | laptop 1 + telefon | **Aplicația web** (rolurile 1 + 4 din §11, partea de cod) | `web/` schelet (Vite + React + TS, Tailwind, shadcn/ui, PWA), temă, date (seed → Supabase + cache), Acasă, Orar, Pagina sălii, Căutare, rutele. **Singurul care face merge la scheletul aplicației.** |
| **B** | laptop 2 + telefon | **Hartă, traseu, QR** (rolul 2 + harta din rolul 1) | Harta 2D în SVG, pin-uri, etaje, A*, pașii traseului, pagina `/q/<id>` → „Ești aici”, testele în clădire. Apoi 3D, dacă e timp. |
| **C** | laptop 3 | **Backend + admin** (rolul 3) | Supabase (schema §8 + RLS), importul Excel cu Claude, admin-ul minimal în `web/` pe `/admin` (login, import + verificare, plasarea pin-urilor/nodurilor/QR pe plan, folosind harta lui B). |
| **D** | telefon + laptop prin rotație (vezi §4) | **Teren + design + teste** (rolurile 4 + 5) | Datele din clădire (codul fiecărei uși, ancorele QR), direcția vizuală în Claude Design, afișele QR, testele cu studenții. |
| **E** | telefon + laptop prin rotație (vezi §4) | **Pitch + validare** (rolul 5) | Prezentarea, scenariul de demo, foaia de metrici, video-ul de rezervă, repetițiile. Dacă echipa rămâne de 4, D și C își împart și această parte. |

**Toată lumea lucrează cu Claude și în git, de pe laptop sau de pe telefon:** aplicația Claude pe telefon (claude.ai), iar pentru fișierele din repo, Claude Code pe web (claude.ai/code), conectat la repo-ul de pe GitHub. Așa ajunge munca fiecăruia în `data/`, `pitch/` și `docs/LOG.md`, nu în chat-uri private.

## 2. Granițele în cod (ca să nu avem conflicte)

| Cine | Scrie în | NU scrie în |
|---|---|---|
| A | `web/` schelet și configurare, `web/src/app/` (rute, layout, taburi), `web/src/components/`, `web/src/features/{home,timetable,room,search}/`, `web/src/lib/` (Supabase, cache) | `features/{map,routing,qr,admin}/` |
| B | `web/src/features/map/`, `features/routing/`, `features/qr/`, (mai târziu) `features/scene3d/` | `app/`: îi cere lui A ruta nouă |
| C | `backend/`, `web/src/features/admin/`, migrațiile Supabase | restul din `web/` |
| D, E | `data/rooms-etaj6B.md`, `data/qr/`, `pitch/` | cod |
| **Toată echipa** | `data/contract.md` și `data/seed.json`: se schimbă doar cu acordul tuturor | — |

- Ramuri scurte, `<nume>/<subiect>`, cu merge în `main` cel puțin la fiecare ședință.
- B și C nu încep în `web/` până nu e scheletul lui A pe `main` (~30–45 min). Până atunci, B scrie A* și citirea lui `plan_2d.json` ca **TypeScript pur** (fără React), cu teste Vitest. Se mută în proiect fără conflicte.

## 3. Calendarul

Demo-ul e duminică, 22 nov (ora exactă: _de completat_). **Înghețăm funcțiile cu 4 h înainte de demo.**

### Sâmbătă 21 nov

| Interval | A (laptop 1) | B (laptop 2) | C (laptop 3) | D (+E) |
|---|---|---|---|---|
| **10:00–11:00: Faza 0, toată echipa** | Schelet `web/`: Vite + React + TS, Tailwind + shadcn/ui, React Router, `vite-plugin-pwa`, cele 3 taburi, deploy pe Vercel, push pe `main` | Scrie cu C `data/contract.md` (formatele din §8 ca JSON) | Scrie `data/seed.json`: etajul 6B, ~10 săli din plan, ~30 de ore din `An 1` (inclusiv B623) | **Pleacă în clădire, la etajul 6B**, cu `plan_2d.png` pe telefon (sau printat): vezi §5 |
| **11:00–14:00** | `seed.json` inclus în aplicație + TanStack Query; Acasă: `NextClassCard` + programul de azi | Harta în SVG din `plan_2d.json`: zoom, pan, pereți, scări | Proiect Supabase, schema + RLS, încărcarea lui `seed.json`; parserul `openpyxl` pe foaia `An 1` | Termină lista ușilor; caută data de început a semestrului; recrutează ≥ 5 studenți de anul I pentru duminică dimineață |
| **14:00: ședință 10 min** | merge pe `main` | merge | merge | D aduce lista ușilor → C o pune în seed |
| **14:00–18:00** | Orar (zi/săptămână, săptămâna pară/impară); tap pe curs → Hartă | Pin-uri pe uși, `FloorChips`, tap pe pin → `RoomSheet`; legătura Orar → Hartă cu A | Normalizarea cu Claude (`claude-opus-5-5`, structured outputs) + validări; `/admin`: login + tabelul de verificare | Pe laptopul lui B, când B testează în clădire: direcția vizuală în Claude Design pentru Acasă, Hartă, `RoomSheet` (§4) |
| **18:00: ședință + primul test QR în clădire** | — | **Test QR V1 în clădire** (2 afișe printate) | — | Afișele QR, printate |
| **18:00–23:00** | Pagina sălii, Căutarea, stările goale și offline; citire din Supabase + cache (IndexedDB) | A* + `RouteSteps` + „Du-mă acolo”; `/q/<id>` (camera telefonului) + scanner în aplicație → „Ești aici” | Plasarea pin-urilor/nodurilor/ancorelor QR pe planul SVG (click → x, z); import complet + publicare | Scenariul testelor + pragurile (§12, scrise **înainte** de teste); foaia de metrici; schița pitch-ului |
| **23:00** | **Ținta zilei: demo-ul de la pașii 2–5 (§12) merge cap-coadă pe telefon (aplicația instalată pe ecranul principal), cu datele din seed.** | | | |

### Duminică 22 nov

| Interval | Ce se întâmplă |
|---|---|
| Dimineața, primele 2–3 h | **Teste cu ≥ 5 studenți de anul I** (D, E). A și B repară pe loc ce iese la teste. C: pasul 1 din demo (importul) să meargă sigur. |
| Până la înghețare | Polish UX (`CONTEXT.md` §10), mod întunecat, font mărit, test pe un Android și pe un iPhone. 3D doar dacă tot ce e P0 e gata. |
| **Înghețare (demo − 4 h)** | Nicio funcție nouă. Doar bug-uri. Deploy-ul final pe Vercel, aplicația instalată pe ecranul principal pe 2 telefoane și deschisă o dată cu net (ca să intre în cache). |
| După înghețare | **Video-ul de rezervă** (D/E), rezultatele testelor în slide-uri, 2–3 repetiții cronometrate ale demo-ului (3 min). |

## 4. Rotația laptopurilor

3 laptopuri, 4–5 oameni. Laptopul merge la sarcina care are nevoie de el în acel moment:
- **B** testează în clădire (cu aplicația deschisă de pe Vercel pe telefon) → laptopul 2 îl ia **D** pentru Claude Design.
- Duminică, după ce importul merge, **laptopul 3** trece la pitch (E sau D). **C** pregătește pasul 1 din demo și răspunsurile tehnice pentru interviul cu juriul.
- Fiecare intră pe laptopul altuia cu **contul lui de Claude**, într-un folder clonat separat, și termină cu `/finish`. Așa nu se amestecă sesiunile și jurnalul.

## 5. Sarcina lui D în clădire (blochează harta, deci prima)

Scanarea nu are numerele sălilor (`CONTEXT.md` §5.11). Fără lista asta, harta nu are pin-uri.
1. Pe `plan_2d.png`, notează la fiecare ușă de pe etajul 6B codul de pe plăcuță (B623 …). Fă poze la plăcuțe și la planul de evacuare.
2. Verifică semnalul (date mobile + eduroam) pe holuri și la scări: se încarcă o pagină? Notează unde nu.
3. Marchează 2 locuri pentru afișele QR: ieșirea de pe scară și holul central. Notează pe ce perete și în ce direcție privește afișul.
4. Măsoară cu pași sau cu ruleta 2 distanțe (ex. lungimea coridorului de nord), ca să verificăm scara planului.
5. Scrie totul în `data/rooms-etaj6B.md` (prin Claude Code pe web sau trimite-i lui C).

## 6. Ce tăiem acum (ca să ajungem la P0)

| Tăiat sau amânat | De ce | În loc |
|---|---|---|
| Wi-Fi fingerprinting | Nu se poate pe web | QR V1 |
| AR (ARCore) | Nu se poate pe web | 3D doar dacă rămâne timp |
| Domeniu propriu | Nu e nevoie pentru concurs | `*.vercel.app`. Codul QR conține `https://<domeniu>/q/<id>`: camera telefonului deschide direct pagina. Afișele se printează **după** ce e fixat domeniul. |
| Editorul de calendar în admin | Prea mult pentru demo | Data de început a semestrului + vacanțele scrise direct în `seed.json` / în tabela `terms` |
| Notificări, puncte utile, săli libere | P1 / P2 (notificările cer Web Push de pe server) | — |

Siguranța demo-ului: `seed.json` e inclus în aplicație, iar Supabase doar aduce versiunea nouă. Service worker-ul ține aplicația și planurile în cache. Dacă pică internetul la demo, aplicația merge oricum, cu condiția să fi fost deschisă o dată cu net pe telefonul de demo.

## 7. Ședințele (10 min, la 14:00, 18:00, 23:00 și duminică dimineață)

Fiecare spune: ce a terminat, ce îl blochează, ce face până la următoarea ședință. Înainte de ședință, toți fac merge pe `main`. După, cineva actualizează tabelul de aici dacă s-a schimbat ceva.
