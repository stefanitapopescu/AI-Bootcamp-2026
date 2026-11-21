# CONTEXT.md — **Roomly**: hartă de interior + orar pentru studenți

> **Pentru cine e documentul:** în primul rând pentru agenții AI (Claude Code) care generează planul de implementare, `CLAUDE.md` și codul. Secundar, pentru echipă.
> **Cum se citește:** fiecare decizie are o stare: **DECIS** (nu se rediscută fără motiv), **DE VALIDAT** (ipoteză de testat cu utilizatori sau în clădire), **DESCHIS** (nu s-a decis încă).
> **Limba:** textul e în română. Identificatorii din cod (tabele, câmpuri, module, clase) sunt în **engleză**.
> **Ultima actualizare:** 2026-11-21.

---

## 1. Rezumat

- **Ce este:** o aplicație web pentru telefon (PWA, instalabilă pe ecranul principal) care îi arată studentului **orarul lui** și, cu un tap pe un curs, **harta 2D a etajului cu sala evidențiată și drumul până la ea**.
- **Pentru cine:** în primul rând studenții din **anul I** de la Facultatea de Automatică și Calculatoare (AC), UPT Timișoara, cu ore în clădirea **Electro**. Pe termen lung: orice student dintr-o clădire cu multe etaje, corpuri și uși.
- **Problema:** orarul e un Excel greu de citit pe telefon, codurile sălilor sunt criptice (`B528b`, `SPM202`, `M304 - MEC`), cursurile sunt împărțite între mai multe corpuri și clădiri, iar studenții noi nu cunosc clădirea.
- **Soluția:** orarul oficial e importat automat (cu AI + verificare umană). Hărțile de interior sunt generate din scanări 3D făcute cu telefonul. Localizarea se face prin coduri QR lipite pe holuri (afișezi „Ești aici” și traseul), cu săgeți AR în camera live ca extensie.
- **Nume:** **Roomly** (DECIS). În engleză, ca să meargă și în afara României. Ideea de la care pornește: *„Where's my room? Roomly knows.”* Domeniul aplicației: DESCHIS (pentru concurs ajunge un `*.vercel.app`).

---

## 2. Contextul concursului

| Element | Detalii |
|---|---|
| Eveniment | UPT **AI Prototyping Bootcamp**, 20–22 noiembrie 2026, Biblioteca UPT (Bd. Vasile Pârvan 2, etajul 4). Ghidul oficial: [Notion](https://app.notion.com/p/AI-Prototyping-Bootcamp-ghidul-participantului-41a5521e5f34812687f6db7262c4f0b0) · [pagina UPT](https://www.upt.ro/evenimente/ai-prototyping-bootcamp). Noutățile apar în grupul de WhatsApp al participanților. |
| Program (din ghid) | **Vineri 20:** 16:00–20:00 (tema, echipele, ideea pe un slide, discovery). **Sâmbătă 21:** 10:00–19:15. 10:00 intro „Building Prototypes For Learning, not Looks”, lucru în echipă, **16:00–18:00 mentorat**, 18:30 intro „Preparing Your Presentation”. Prânz 13:00, cină 18:00. **Duminică 22:** 10:00 lucru în echipă, **12:00 repetiții**, prânz 13:00. |
| Finala | **Duminică 15:00.** Etapa 1 (15:00–15:55): **pitch de 3 minute**. Etapa 2 (15:55–16:55): **interviu 1-la-1 cu juriul, 4 minute pe echipă**. 17:10: câștigătorii. |
| Ce punctează juriul | **Prototipul + rezultatele testelor cu potențiali utilizatori + pașii următori**. Premii: 3.000 EUR în total. |
| Unelte | Claude Code + Claude Design. Ghidul recomandă un tool desktop/CLI în locul variantei din browser. Pe Windows, modul Code din Claude are nevoie de **Git**. Recomandă și GitHub (codul echipei), Google Drive (fișierele echipei), Wispr Flow (dictare). |
| Abonament | Claude Pro pe o lună (20 USD + TVA), cumpărat din contul propriu. **Păstrați factura** și trimiteți-o după eveniment organizatorilor (adresa e în ghid). Suma se returnează ca bursă. |
| După concurs | Pre-Accelerator UPT, din martie 2027 |
| Echipă | 4 oameni, posibil 5, cu **3 laptopuri** (vezi §11 și `docs/PLAN.md`) |
| Risc de regulament | Organizatorii anunță o temă. Confirmați că ideea se încadrează în ea. **DE VALIDAT** |

Consecință pentru prioritizare: **validarea cu studenți reali cântărește cât construcția**. Fiecare funcționalitate P0 trebuie să poată fi testată de un student din anul I în mai puțin de 2 minute.

---

## 3. Problema

### Fapte constatate în orarul real (`Orar_Cro_TI_Cen_sem1_2026-2027_public.xlsx`)
- Codurile de sală sunt criptice și au mai multe convenții: `B528b`, `B418a`, `A117`, `C217`, `D1`, `ASPC`, `SPM202`, `M304 - MEC`, `A2 - Chimie`, `304CP`, `Orol 114`.
- Cursurile anului I se țin în **cel puțin 8 clădiri** (Electro corpurile A/B/C/D, ASPC, SPM, Mecanică, Chimie). Orarul vine cu o foaie separată, „Legenda sali”, ca să poată fi descifrat.
- Orarul e un **grid Excel** cu celule combinate, abrevieri (`LSD`, `PC`, `ET`) și reguli de săptămâni („săptămânile 1-10”, „săptămânile 3, 5, 7, 9”, „2, 4, 6, 8, 10”). Pe telefon e foarte greu de citit.
- Unele ore apar ca text liber, nu în grid (ex. „PC (l) - grupe suplimentare · Luni 16-18 B528b · Marți 16-18 B418a, Joi 14-16 B528a”).

### Ipoteze (DE VALIDAT cu studenți)
- Studenții din anul I pierd timp și întârzie în primele săptămâni pentru că nu găsesc sălile.
- Studenții deschid rar Excel-ul. Se bazează pe poze cu orarul și pe întrebări în grupurile de WhatsApp.
- Un student ar folosi zilnic o aplicație care îi spune „unde am ora următoare și cum ajung”.

---

## 4. Utilizatori

| Tip | Descriere | Stare |
|---|---|---|
| **Principal** | Student în anul I la AC UPT (CTI română / engleză), cu ore în Electro | DECIS |
| Secundar | Orice student AC (anii II–IV, master), studenți din alte facultăți cu ore în Electro | DECIS |
| Admin | **Echipa noastră**, cu **cont de admin** (login). Importă orarul și plasează pin-urile sălilor, nodurile și codurile QR | DECIS (pentru MVP) |
| Viziune | **Universitățile din România**: fiecare își scanează clădirile și își încarcă orarele | DECIS |
| Cont de student | **Fără cont.** Grupa se alege la prima deschidere și se salvează local. Nu colectăm date personale. | DECIS |

### Persona
1. **Andrei, anul I, CTI, Seria 1, semigrupa 1.2.** Prima săptămână. Are laborator de PC în `B418a` și nu știe ce înseamnă „B”. Vrea să deschidă aplicația și să vadă „Următorul curs: PC (l) · B418a · etaj 4 · Du-mă acolo”.
2. **Maria, anul I, CTI în engleză.** Are un laborator în `B623`. E la parter și nu știe dacă B623 e în aceeași clădire. Vrea să caute „B623” și să vadă etajul și drumul.
3. **Echipa (admin), înainte de semestru.** Primește Excel-ul nou, îl încarcă, verifică tabelul extras de AI, corectează 3–4 celule și publică.

---

## 5. Funcționalități

Priorități: **P0** = obligatoriu în demo, **P1** = dacă rămâne timp în concurs, **P2** = după concurs.

### 5.1 Onboarding (P0, DECIS)
- La prima deschidere, fără cont, studentul alege pe rând:
  1. **Anul + programul** (= o foaie din Excel: `An 1`, `An 2`, …, `An 1 Eng`, `An 1 ML` …);
  2. **Seria / specializarea** (rândul 3 din foaie: `Seria 1 (C)`, `Seria 2 (D)`, `CALCULATOARE`, `TEHNOLOGIA INFORMATIEI` …);
  3. **Semigrupa** (rândul 4: `1.1`, `1.2`, `2.1` …).
- Alegerea se salvează local și se poate schimba din Profil.
- Notificările (P1) se cer abia după ce studentul a văzut valoarea aplicației, nu la prima deschidere.

### 5.2 Navigare (P0, DECIS)
- **3 taburi jos:** **Acasă · Orar · Hartă**.
- **Bara de sus:** selectorul de clădire (**„Corp Electro ▾”**) + avatarul de Profil (grupa, notificări, temă).
- În MVP lista de clădiri are o singură intrare, „Electro”, dar selectorul există din prima versiune, pentru viziunea multi-clădire.

### 5.3 Acasă (P0)
- **Căutare globală**, primul element de pe ecran. Rezultatele sunt grupate pe **Săli · Materii · Profesori · Grupe**. Acceptă coduri (`B623`), abrevieri (`LSD`), nume de profesori și nume de materii.
- **Cardul „Următorul curs”:** materie, tip (C/S/L), sală, etaj, cât mai e până începe, buton **„Du-mă acolo”**.
- **Programul de azi** pentru grupa mea: ore trecute (✓), ora curentă (●), ore viitoare (○).
- Acțiuni rapide: **Scanează QR**, **Săli libere acum** (P2).

### 5.4 Orar (P0)
- **Orarul meu** (filtrat după semigrupă), vizualizare pe **zi** și pe **săptămână**, alegere din calendar.
- Indicator **„Săpt. 7 · impară”**, calculat din calendarul academic.
- Filtru: **grupa mea / altă grupă / o sală / un profesor**.
- **Tap pe un curs → tabul Hartă, pe etajul corect, cu sala evidențiată** (cerință explicită a utilizatorului, DECIS). Dacă sala e în altă clădire, se deschide cardul cu Google Maps (§5.7).

### 5.5 Pagina sălii (P0)
Destinație comună pentru căutare, orar și pin-ul de pe hartă. Conține:
- codul sălii, tipul, corpul, etajul;
- starea acum (🔴 ocupată / 🟢 liberă / 🟠 începe în < 15 min);
- programul zilei; buton **Altă zi**;
- butoanele **Arată pe hartă** și **Du-mă acolo**.

### 5.6 Hartă 2D (P0)
- Planul etajului e generat din scanare (§6.2). Se poate mări și muta.
- Comutator de etaje (chip-uri verticale în dreapta).
- **Pin-uri pe ușile sălilor**, colorate după stare (liberă / ocupată / începe curând). Pin-ul pentru cursul în desfășurare pulsează discret.
- **Puncte utile (P1, DECIS):** toalete, decanat, secretariat, lift, scări, automate, ieșiri.
- Traseul: linie animată, instrucțiuni pas cu pas, distanță în metri și timp estimat.
- **„Ești aici”**: punct + con de orientare, după scanarea unui cod QR (§5.8).
- Comutator **2D / 3D** (3D e P1; AR doar în roadmap, §9).

### 5.7 Săli din alte clădiri (P0, DECIS)
Card cu codul sălii, numele clădirii, descrierea și adresa din „Legenda sali” (ex. „SPM 202 · clădirea SPM, vizavi de căminul 2MV”) și un buton **„Navighează”** care deschide Google Maps spre clădire. Pentru aceste clădiri nu există hartă de interior.

### 5.8 Localizare în clădire
| Variantă | Descriere | Prioritate | Stare |
|---|---|---|---|
| **QR Varianta 1** | Codul QR conține un link (`https://<domeniu>/q/<anchor_id>`) și se poate scana cu camera telefonului (deschide direct aplicația web pe pagina `/q/<anchor_id>`) sau din aplicație (§9). Harta afișează „Ești aici” în poziția codului, rotită cu fața spre cod. Apoi traseul pas cu pas. Punctul **nu se mișcă** după scanare; la fiecare palier sau intersecție importantă există un alt cod. | **P0** | DECIS, **testat primul în clădire** |
| **Wi-Fi fingerprinting** | Hartă radio (BSSID + RSSI la fiecare ~2–3 m), comparată la rulare cu ce vede telefonul (kNN). Precizie de 3–5 m, detectează bine etajul, nu dă direcția. Rol: **rezervă** dacă QR V1 nu convinge la teste, sau **bonus** pentru detectarea automată a etajului. | P2 | **Nu se poate pe web** (browserul nu scanează rețelele). Doar într-o aplicație nativă, după concurs. |
| **QR Varianta 2 = AR** | Aplicația AR recunoaște afișul (ARCore Augmented Images), calculează poziția completă a telefonului, apoi îl urmărește în timp ce merge. Săgeți 3D pe podeaua reală, indicații de viraj la noduri, mini-hartă 2D în colț. | P2 | Direcție pentru roadmap. **Nu se poate pe web** (§9), cere o aplicație nativă după concurs. |
| VPS fără marcaje (Immersal, MultiSet) | Localizare vizuală fără coduri | P2 | Roadmap |

### 5.9 Plimbare virtuală 3D (P1)
Mers la persoana întâi prin GLB-ul etajului: joystick + tragere cu degetul, coliziuni cu pereții, cameră la 1,6 m. Pin-urile sunt vizibile și se pot apăsa. Opțional, „plimbare ghidată” pe traseu până la sală, ca studentul să vadă drumul de acasă.

### 5.10 Notificări (P2)
„SO (L) începe în 15 min în B520 · Du-mă acolo”. Pe web nu se pot programa notificări locale de încredere, deci ar fi Web Push trimis de pe server (Supabase, la ora calculată din orar). Pe iOS merge doar cu aplicația instalată pe ecranul principal. Tăiate pentru concurs.

### 5.11 Admin (P0, interfață minimală, DECIS)
Folosit doar de echipă. Designul nu contează, doar să funcționeze.

**Cont de admin (P0, DECIS):**
- Panoul admin cere **autentificare**: Supabase Auth, cu e-mail + parolă. Conturile sunt create manual pentru membrii echipei, fără înregistrare publică.
- Rolul `admin` e salvat în tabela `admins(user_id)` (sau ca app_metadata `role=admin`) și verificat în politicile RLS. Doar adminii pot scrie.
- Studenții **nu au cont**. Aplicația citește anonim.
- Pe viitor, pentru alte universități: roluri pe universitate (`university_admins(user_id, university_id)`). P2.

**Numele sălilor nu vin din scanare (DECIS).** Scanarea conține doar holurile și ușile, fără plăcuțe. **Adminul pune manual fiecare pin** pe ușa sălii și îi scrie codul (ex. `B623`). Sursele pentru a ști ce sală e în spatele fiecărei uși: plăcuțele de pe uși (poze făcute la scanare) și planul de evacuare de pe etaj. Lista codurilor din orar (§7.4) e folosită ca listă de selecție, ca să nu se scrie greșit.

1. **Import orar:** încarci `.xlsx`, parsezi, normalizezi cu AI (§7.4), vezi un **tabel de verificare** cu rândurile suspecte evidențiate, corectezi, publici.
2. **Editor de hartă** pe planul SVG al etajului: plasezi **pin-urile sălilor** (click pe perete = ușa), **nodurile de traseu** și muchiile dintre ele, **ancorele QR** (poziție + orientare) și **punctele utile**.
3. **Calendar academic:** începutul și sfârșitul semestrului, vacanțele, numerotarea săptămânilor.
- Până există editorul, datele se pot edita direct în interfața Supabase.

---

## 6. Cum funcționează

### 6.1 Sistemul de coordonate (DECIS)
- Fiecare etaj are **sistemul de coordonate al scanării lui** (GLB): **x, z orizontal, în metri; y în sus**.
- Planul 2D folosește coordonatele (x, z) ale GLB-ului, la scara 1:1. **Pe hartă, −Z e „sus”**, convenție din `glb_to_plan2d.py`.
- Câmpul `floors.floor_y` = înălțimea podelei în GLB. Polycam pune originea (y = 0) cam la înălțimea la care era ținut telefonul când a pornit scanarea, deci podeaua iese la o valoare negativă.
- Măsurătoarea pentru `2_11_2025.glb`: mediana podelei e **`-1.55`**, dar scanarea e **ușor înclinată**: coridorul de nord la `-1.48`, coridorul de sud la `-1.64`, adică ~16 cm pe ~35 m (~0,3°). E deriva obișnuită a scanării. Scriptul folosește `-1.71`, cu o toleranță de ±0,25 m, deci planul 2D iese corect oricum.
- **DECIS:** `floor_y = -1.55` până la nivelare. **P1:** nivelarea modelului (se potrivește un plan pe fețele de podea și se rotește GLB-ul să fie orizontal) înainte de 3D/AR.
- Orice obiect (pin, nod, ancoră QR, punct util) se stochează cu `floor_id + x + z` (+ `y` acolo unde contează înălțimea, la ancorele QR). Același obiect apare identic în 2D, în 3D și în AR.
- Etajele **nu se aliniază** într-un singur model 3D. Se leagă prin nodurile de scară și de lift din graful de traseu.

### 6.2 De la scanare la hartă
1. **Scanare** cu iPhone (LiDAR) în Polycam, doar holurile, fără sălile de curs (DECIS). Un fișier pe etaj, exportat ca `.glb`.
2. **Plan 2D:** `glb_to_plan2d.py <in.glb> <out>` taie modelul la 0,9 / 1,2 / 1,5 m deasupra podelei și scrie `<out>.json` + `.svg` + `.png`.
   - Formatul JSON: `{"units":"m","axes":"x,z of GLB (y up)","floor_y":-1.71,"floor":[poligoane],"walls":[poligoane],"stairs":[poligoane]}`.
   - Dependențe: `trimesh`, `shapely`, `matplotlib`, `numpy`.
3. **Curățare** (opțional): petele mici se elimină, liniile se îndreaptă la 90°.
4. **GLB comprimat** pentru 3D (`gltf-transform`, Draco + texturi 2K). De verificat că three.js (react-three-fiber) îl încarcă repede pe telefon.
5. Adminul plasează pin-urile, nodurile și ancorele QR pe planul SVG (§5.11).

### 6.3 Ce știm despre scanarea existentă
- `2_11_2025.glb` = **etajul 6 din corpul B al clădirii Electro** (sălile B6xx). DECIS.
- 8,5 MB, 4 mesh-uri, ~154k triunghiuri, 4 texturi JPEG de 4K, scară metrică.
- Suprafața acoperită: ~22 × 38 m. Hol central de ~8×8 m, două coridoare de ~16 m (nord și sud), o aripă laterală, o încăpere în nord-est, **două case de scări** (una urcă, una coboară). Tavanul e la ~3,5 m. Ușile se văd pe pereți.
- Defecte: pete în est (ferestre sau oameni), margini „topite” la stâlpii din holul central.
- Sala de demo propusă: **B623**, care apare de 15 ori în orar (ex. `An 2 Eng`: „DB (l) / room B623”; `An 1 ML`: „FCV (l) B623”; `An 3`: „APD (l)… sala B623 Miercuri 12-14, 14-16”).

### 6.4 Localizarea cu QR, pe scurt
- O **ancoră QR** = `{id, floor_id, x, y, z, yaw}`, unde `yaw` = direcția în care privește fața codului (normala peretelui). Adminul o creează cu click pe perete în editor.
- **V1:** după scanare, poziția studentului ≈ ancora mutată ~1 m în fața codului. Orientarea ≈ opusul normalei (studentul privește spre cod). Harta se rotește în funcție de această orientare.
- **V2 (AR):**
  - ARCore detectează afișul (imagine de referință cu dimensiunea fizică cunoscută) și dă poziția afișului în spațiul AR.
  - `T_model←AR = T_model←afiș × (T_AR←afiș)⁻¹`.
  - Nodurile traseului se transformă în spațiul AR, iar săgețile se pun pe planul podelei detectat.
  - VIO urmărește mișcarea, cu o eroare de ~1–2% din distanță. Poziția se recalibrează la următorul afiș.
- ⚠️ Un QR simplu are puține detalii vizuale distincte pentru ARCore. **Fiecare afiș are o grafică unică în jurul codului** și trebuie să obțină un scor ≥ 75 cu `arcoreimg`.

### 6.5 Traseul
- Graful conține `nav_nodes` (tipuri: `corridor`, `junction`, `door`, `stairs`, `elevator`, `qr`, `entrance`) și `nav_edges` (lungime în metri, tip `walk` / `stairs` / `elevator`).
- **A\*** pe graf, cu distanța euclidiană ca euristică pe același etaj. Între etaje: cost fix pe palier.
- Instrucțiunile se generează din unghiul dintre muchiile consecutive: |Δ| < 30° = înainte, 30–150° = stânga/dreapta, > 150° = întoarce-te. Schimbarea etajului produce „Urcă pe scara N până la etajul 6”.
- Ușa sălii = un nod `door` legat de pin-ul sălii.

### 6.6 Logica de timp
- O intrare din orar are: ziua săptămânii, ora de început și de sfârșit, `week_rule`.
- `week_rule` = **lista explicită a săptămânilor** în care se ține ora (ex. `[3,5,7,9]`). `null` = toate săptămânile semestrului.
- Calendarul academic (`academic_calendar`): data de început a semestrului, numărul de săptămâni didactice, vacanțele. Date concrete: **DESCHIS**.
- Din data curentă → săptămâna didactică N → paritatea (N impar = „impară”).
- „Ce se ține acum în sala X” = intrările cu `room_code = X`, ziua de azi, ora curentă în interval, iar N inclus în `week_rule`.

---

## 7. Formatul orarului sursă (Excel)

Fișierul de referință: `Orar_Cro_TI_Cen_sem1_2026-2027_public.xlsx`.

**Sursa oficială** (publicată de facultate pe SharePoint / OneDrive UPT): https://uptro29158-my.sharepoint.com/:x:/g/personal/ana_dan_upt_ro/IQBQiCeZJLmORpDqUwVcEezeAYs_VnIocbTpbZoN0j9BctM?rtime=nxAPRp5H30g
- MVP: adminul descarcă `.xlsx` de acolo și îl încarcă în panoul de import. DECIS
- Mai târziu: sincronizare automată prin Microsoft Graph API, dacă linkul permite acces fără autentificare. Detectează când facultatea modifică orarul și pornește un re-import cu verificare. P2, DESCHIS

### 7.1 Foile
`An 1`, `An 2`, `An 3`, `An 4`, `An 1 Eng`, `An 2 Eng`, `An 3 Eng`, `An 4 Eng`, `An 1 CCIT`, `An 1 DW`, `An 1 ML`, `An 1 QC`, `An 1 SE`, `An 2 CCIT`, `An 2 DW`, `An 2 ML`, `An 2 QC`, `An 2 SE`, `Legenda sali`.
Fiecare foaie (în afară de legendă) = un **program** (an + specializare / limbă / master).

### 7.2 Structura gridului (foile `An 1`–`An 4`)
- `C1` = titlul („ANUL I - SEM. I  2026/2027”).
- **Rândul 3** = seriile sau specializările. `An 1`: `Seria 1 (C)` (col. C), `Seria 2 (D)` (col. K). `An 2`–`An 4`: `CALCULATOARE` / `TEHNOLOGIA INFORMATIEI`, plus `Laboratoare [optionale]` la anii 3–4.
- **Rândul 4** = semigrupele: `1.1`, `1.2`, `2.1`, `2.2`, `3.1`, `3.2`, plus coloane speciale („Grupa online / seria 1”, „Ore comune pentru seria 1 si seria 2”).
- **Coloana A** = ziua, scrisă vertical câte o literă pe rând (L-U-N-I, M-A-R-T-I, M-I-E-R-C-U-R-I, J-O-I, V-I-N-E-R-I).
- **Coloana B** = intervalul orar `08-09` … `20-21` (13 rânduri pe zi, cu un rând gol între zile). Exemplu în `An 1`: luni = rândurile 5–17, marți = 19–31, miercuri = 33–45, joi = 47–59, vineri = 61–73.
- **Celulele combinate** (mergeCells) = un curs care acoperă mai multe semigrupe (pe orizontală) și/sau mai multe ore (pe verticală). Ex. `H33:H34` = „PC (l) | B418a”, adică **miercuri 08–10, Seria 1, semigrupa 3.2**.
- Textul unei ore apare în **două forme**:
  - pe un rând: `"PC (l)  | B418a"`, `"Fizica (l) C217"`;
  - pe două rânduri, unul sub altul: `"Algebra si geometrie (c)  A. Eckstein"` + pe rândul următor `"saptamanile 1-10, sala M304 - MEC"`.
- Tipul orei: `(c)` curs, `(s)` seminar, `(l)` laborator; uneori `(c.f.)`, `(seminar)`.
- Regula de săptămâni apare în text: `saptamanile 1-10`, `sapt 1-10`, `(saptamanile 3, 5, 7, 9)`, `(saptamanile 2, 4, 6, 8, 10)`.
- Abrevieri pentru laboratoare și seminarii. Din aceeași foaie se deduce: `LSD` = Logica si structuri discrete, `PC` = Programarea calculatoarelor, `ET` = Electrotehnica. Corespondențele trebuie construite per foaie.
- Cazuri speciale:
  - text liber cu zi și oră în interiorul celulei (ex. coloana Q „Ore comune”: „Luni 16-18 B528b”; `An 3` P51: „APD (l) [C+TI] / sala S4 Luni 16-18, 18-20 / sala B623 Miercuri 12-14, 14-16”);
  - „ora de TUTORIERE”;
  - `*** SPORT`;
  - note de subsol sub grid (cursuri de pregătire, explicații despre sport).

### 7.3 Variații între foi
- `An 1 Eng`–`An 4 Eng`: titlul în `C1`/`C2`, semigrupele **pe rândul 3**, gridul începe la **rândul 4** (`B4 = 08-09`). Textul e în engleză („room B623”).
- Foile de master (`CCIT`, `DW`, `ML`, `QC`, `SE`): fără rând de grupe, gridul începe la **rândul 3**. Au coloane de curs + laborator cu zi și oră în text (ex. „BDA (l) A315 / Monday 10-12”).
- **Parserul nu presupune poziții fixe.** Detectează rândul cu `08-09` și rândul sau rândurile de antet de deasupra lui.

### 7.4 Legenda sălilor (foaia `Legenda sali`) și regulile pentru codurile de sală
| Cod / tipar | Semnificație (din legendă) |
|---|---|
| `D1` | Electro, corpul din spate cu un singur etaj (corpul D) |
| `Axyz` | Electro, **corpul A** (unde e decanatul), etajul x |
| `Bxyz` | Electro, **corpul B (7 etaje)**, etajul x |
| `Cxyz` | Electro, **corpul C**, etajul x |
| `ASPC` | Sală de curs la parter, clădirea ASPC (str. Ioan Curea nr. 1) |
| `S4`, `P14`, `P17` | Laboratoare la parter, clădirea ASPC |
| `MP - Cadastru` | Clădirea dintre ASPC și Facultatea de Construcții, str. Ioan Curea |
| `M304 - MEC` | Facultatea de Mecanică (Bv. Mihai Viteazu) |
| `Orol 114` | Orologerie, Departamentul de Mecanică și Rezistența Materialelor (Bv. Mihai Viteazu nr. 1) |
| `SPM 202`, `SPM 205` | Clădirea SPM (vizavi de căminul 2MV) |
| `CIDUCOS` | Clădirea SPM, parter, lângă portar |
| `A2 - Chimie`, `A3 - Chimie` | Facultatea de Chimie Industrială și Ingineria Mediului (Bd. Vasile Pârvan nr. 6), clădirea veche |
| `PN` | Departamentul de Hidrotehnică (str. George Enescu 1/A) |
| `303CP`, `304CP` | Chimie Parc (Bd. Vasile Pârvan nr. 6, corpul nou) |
| `M102 - MPT` | Facultatea de Management în Producție și Transporturi (str. Remus nr. 14) |
| `Amfiteatru Nicolae Maior` | Facultatea de Construcții (Traian Lalescu nr. 2) |

**Reguli de rezolvare, în ordine:**
1. Potrivire exactă (fără spații, fără diferență de majuscule) cu un alias din legendă (`room_aliases`). Așa `A2 - Chimie` nu e confundat cu corpul A.
2. Tiparul `^([ABC])(\d)(\d{2})([a-z]?)$` → corpul = grupa 1, **etajul = grupa 2**, numărul = grupele 3+4. Ex. `B528b` → corp B, etaj 5. `B018` → corp B, parter (0). `C217` → corp C, etaj 2.
3. Dacă niciuna nu se potrivește, rândul e marcat „necunoscut” pentru verificarea manuală.

**Săli Electro întâlnite des în orar** (număr de apariții): B413 (28), B426 (27), B528a (22), A117 (21), B414 (20), A305 (20), B425 (19), A110 (17), B521 (17), B513 (16), A204 (16), B419 (16), B528b (15), **B623 (15)**, B418a (14), B418b (13), B520 (13), C217 (12), C302 (12).

### 7.5 Strategia de import (DECIS)
1. **Parser determinist** (Python, în `backend/`): citește `.xlsx` cu `openpyxl` (de instalat; acum nu e prezent), aplică celulele combinate și produce **celule brute** de forma `{sheet, cell_range, day, start_hour, end_hour, columns_covered → groups[], raw_text, raw_text_below}`.
2. **Normalizare cu Claude:**
   - model **`claude-opus-5-5`**, SDK-ul oficial Python `anthropic`, **structured outputs** cu o schemă JSON;
   - transformă `raw_text` în `{course_name, course_abbrev, type, teacher, room_code, week_rule, extra_slots[]}`. `extra_slots` acoperă orele scrise în text liber („Luni 16-18 B528b”);
   - primește ca context lista de abrevieri din foaie și legenda sălilor;
   - **rulează doar pe server. Cheia API nu ajunge niciodată în codul aplicației web.**
3. **Validare automată:** codul de sală se rezolvă (§7.4), orele sunt în intervalul 08–21, ziua e validă, grupele există, nu există suprapuneri pentru aceeași semigrupă.
4. **Verificare umană** în admin: tabel cu rândurile suspecte evidențiate. Abia apoi publicare.
5. Re-importul unui an sau semestru nou înlocuiește intrările acelui `term`, fără duplicate.

---

## 8. Modelul de date (Supabase / Postgres)

```text
universities(id, name)                                   -- viziune multi-universitate
buildings(id, university_id, code, name, address, lat, lng, has_indoor_map bool)
floors(id, building_id, corp, level int, name, plan_json_url, plan_svg_url, glb_url, floor_y float)
rooms(id, building_id, floor_id nullable, code, corp, level, type, x, z, door_yaw, description)
room_aliases(alias, room_id)                             -- "SPM 202", "SPM202", "B623"
pois(id, floor_id, type, name, x, z)                     -- toilet, dean_office, secretariat, elevator, stairs, vending, exit
qr_anchors(id, floor_id, x, y, z, yaw, poster_image_url, label)
nav_nodes(id, floor_id, type, x, z, room_id nullable, anchor_id nullable)
nav_edges(id, node_a, node_b, length_m, kind)            -- walk | stairs | elevator
terms(id, university_id, name, start_date, weeks int, holidays jsonb)   -- = academic_calendar
programs(id, term_id, sheet_name, year int, name, language)             -- o foaie Excel
groups(id, program_id, series, subgroup)                 -- "Seria 1 (C)", "1.2"
courses(id, program_id, name, abbrev)
timetable_entries(id, term_id, course_id, type, teacher, room_code, room_id nullable,
                  day_of_week int, start_time, end_time, week_rule int[] nullable,
                  group_ids int[], source_sheet, source_range, notes)
```

Exemplu de intrare reală (`An 1`, celula combinată `H33:H34`):
```json
{
  "course": {"name": "Programarea calculatoarelor", "abbrev": "PC"},
  "type": "L",
  "teacher": null,
  "room_code": "B418a",
  "room": {"building": "Electro", "corp": "B", "level": 4},
  "day_of_week": 3,
  "start_time": "08:00",
  "end_time": "10:00",
  "week_rule": null,
  "groups": [{"program": "An 1", "series": "Seria 1 (C)", "subgroup": "3.2"}],
  "source": {"sheet": "An 1", "range": "H33:H34", "raw": "PC (l)  | B418a"}
}
```

**Conturi:** `admins(user_id → auth.users, created_at)`: lista conturilor de admin (echipa). Studenții nu au conturi.

**Acces (RLS):** citire publică (anonimă) pentru toate tabelele de conținut; scriere (insert / update / delete) doar dacă `auth.uid()` există în `admins`. Fișierele din Storage urmează aceleași reguli.
**Întâi pe date, cache ca rezervă (DECIS):** aplicația citește din Supabase. Ultimele date descărcate (programul grupei, sălile, etajele, traseele clădirii selectate) rămân în IndexedDB, iar planurile și aplicația în cache-ul service worker-ului. Fără semnal, merge pe ce are, cu bannerul „Offline · date din <dată>”. Studentul doar citește, deci nu există sincronizare sau conflicte.

---

## 9. Stack tehnic (DECIS)

> **Schimbat pe 2026-11-21** (Stefanita, de confirmat cu echipa): din aplicație Android nativă (Kotlin + Compose) în **aplicație web instalabilă (PWA)**, pusă pe ecranul principal al telefonului. Motive: merge pe orice telefon, inclusiv pe iPhone-urile juriului (link sau QR, fără APK); iterații mai rapide pe interfață; aceeași bază de cod pentru student și admin; nu trebuie Android Studio pe cele 3 laptopuri. Ce pierdem: AR cu ARCore și Wi-Fi fingerprinting (oricum tăiate pentru concurs), notificările locale programate. Codul Android nu fusese început. **Next.js a fost luat în calcul și respins:** aplicația rulează aproape tot în browser, iar randarea pe server nu ajută; cu semnal slab, fiecare navigare care trece pe la server se simte, iar PWA-ul offline e mai greu de configurat.

| Zonă | Tehnologie |
|---|---|
| Platformă | **Aplicație web (PWA)**, gândită pentru telefon: se instalează cu „Adaugă pe ecranul principal” și se deschide fără bara browserului. Merge pe Android (Chrome) și pe iOS (Safari). |
| Interfață | **React + TypeScript + Vite**, **React Router**, **Tailwind CSS** + **shadcn/ui**, **motion** pentru animații, **vaul** pentru panoul de jos, mod întunecat, safe areas (`env(safe-area-inset-*)`) |
| Date | **supabase-js** + **TanStack Query** (afișează ce are în cache, apoi reîmprospătează în fundal) |
| Rețea și offline | **Întâi pe date, cache ca rezervă (DECIS).** `vite-plugin-pwa` (Workbox): **cache-first** pentru aplicație, plan, SVG și GLB (se schimbă rar); **network-first** pentru orar, cu revenire pe cache. Ultimele date descărcate stau în **IndexedDB** (Dexie). Banner „Offline · date din <dată>”. |
| Hartă 2D | **SVG** desenat de noi din `plan_2d.json` (poligoane), cu zoom și pan prin gesturi (`react-zoom-pan-pinch` sau gesturi proprii) |
| QR | Conținut: `https://<domeniu>/q/<id>`. **Camera telefonului deschide direct linkul** (nu mai e nevoie de App Links). În aplicație: `BarcodeDetector` (Chrome Android), cu biblioteca `qr-scanner` ca rezervă (cere permisiune pentru cameră) |
| 3D | **react-three-fiber** + **drei** pentru GLB, încărcat doar când se deschide modul 3D (P1) |
| AR | Nu se face pe web (WebXR nu are urmărire de imagini stabilă). Doar în roadmap, într-o aplicație nativă (§14) |
| Traseu | A* scris de noi în TypeScript |
| Notificări | Tăiate pentru concurs. P2: Web Push trimis de pe server (pe iOS merge doar cu aplicația instalată pe ecranul principal) |
| Backend | **Supabase** (Postgres, Auth pentru admin, Storage pentru GLB/SVG/JSON/xlsx, RLS) |
| Servicii Python | **FastAPI**: importul de orar (openpyxl + SDK `anthropic`, `claude-opus-5-5`), procesarea scanărilor (`glb_to_plan2d.py`, gltf-transform) |
| Admin | **În aceeași aplicație web**, pe rutele `/admin/*`, **minimal**, fără investiție în design. Login cu Supabase Auth (e-mail + parolă), toate paginile protejate. Folosește aceeași componentă de hartă ca studentul (editorul de pin-uri). |
| Găzduire | **Vercel** (site static, HTTPS, obligatoriu pentru PWA și cameră). Domeniul: DESCHIS (merge și `*.vercel.app` pentru concurs) |
| Structura repo | Monorepo: `/web` (student + admin), `/backend`, `/data` (scanări, planuri, `seed.json`, `contract.md`), `/pitch` |

---

## 10. Principii UX pe telefon (prioritate maximă a utilizatorului)

> „Pe partea de web nu mă interesează așa de tare, dar UX-ul de pe Android să fie top.” — DECIS. De la trecerea pe PWA (§9): **experiența studentului pe telefon** trebuie să fie top. Admin-ul rămâne minimal. Aplicația trebuie să se simtă nativă: fără bara browserului, safe areas, gesturi, tranziții, fără zoom accidental.

1. **Primul ecran răspunde la „unde am ora următoare?”.** Cardul „Următorul curs” + „Du-mă acolo” se văd fără scroll.
2. **Căutarea e primul element** de pe Acasă și înțelege coduri, abrevieri, profesori și materii.
3. **Orice sală e la maximum 2 tap-uri de hartă.** Pagina sălii e aceeași, indiferent de unde ajungi la ea.
4. **Panoul de jos (bottom sheet) are trei niveluri:** închis (status într-un rând) → pe jumătate (ziua) → complet (calendar).
5. **Feedback clar:** vibrație scurtă (`navigator.vibrate`, doar pe Android) + animație spre „Ești aici” la scanarea QR; puls pe pin-ul cursului live; tranziții fluide între ecrane.
6. **Mesaje pentru stările goale și offline:** „Nicio oră acum · următoarea la 14:00”, „Offline · date din 21 nov”, „Sala e în altă clădire → Navighează”.
7. **Accesibilitate:** zone de atingere ≥ 48px, contrast AA, mărirea fontului fără ca layout-ul să se strice, etichete pentru cititoarele de ecran (TalkBack / VoiceOver), butoanele importante în jumătatea de jos a ecranului.
8. **Performanță:** pornire < 2 s după prima vizită (din cache), harta la 60 fps, pachet JS mic (3D încărcat separat), preîncărcare pentru sala următoare și etajul ei. Fără semnal merge pe ultimele date.
9. **Limbaj:** română, etichete scurte. Codurile oficiale (`B528b`) apar mereu împreună cu explicația („Corp B · etaj 5”).
10. Designul se face în **Claude Design**, apoi se transpune în tema Tailwind (tokeni de culoare, fonturi) + o bibliotecă de componente React: `NextClassCard`, `RoomSheet`, `RoomPin`, `FloorChips`, `RouteSteps`, `TimetableDay`, `SearchBar`.

---

## 11. Echipa și fazele

### Roluri (5 roluri)
> Echipa reală are 4–5 oameni și doar 3 laptopuri. Cum se împart rolurile de mai jos pe oameni, pentru concurs: `docs/PLAN.md`.

| # | Rol | Responsabilitate |
|---|---|---|
| 1 | **Aplicația web: partea principală** | Arhitectură, date, cache, orar, căutare, integrare; responsabil de ramura principală a aplicației |
| 2 | **Hartă, traseu, localizare, apoi 3D** | Harta 2D, A*, QR V1 + testul în clădire, apoi plimbarea 3D |
| 3 | **Backend + admin minimal** | Supabase, RLS, import Excel + AI, calendar, editorul de pin-uri / noduri / QR |
| 4 | **Design UX/UI (normă întreagă)** | Machete în Claude Design, sistemul vizual, **implementarea componentelor în React** alături de 1 |
| 5 | **Date, teste, pitch** | Scanări, planuri 2D, `seed.json`, afișe QR, teste cu studenți, pitch, video de rezervă |

### Faze (DECIS)
0. **Prima oră, toată echipa:** `data/contract.md` (formatele din §8), `data/seed.json` (etajul 6 din corpul B, ~10 săli inclusiv B623, câteva noduri, 2 ancore QR, ~30 de ore din orar), scenariul de demo. De aici înainte, toți lucrează pe date de test, fără să se aștepte unii pe alții.
1. **Hartă 2D integrată în aplicație + testul QR V1 în clădire.**
2. **Testul de semnal în clădire** (holuri, scări): decide cât de mult investim în cache (§13). Wi-Fi a ieșit odată cu trecerea pe web (§9).
3. **3D**, ca bonus, sub un feature flag. Apare în demo doar dacă merge sigur.
- Ședințe scurte de 10 minute la fiecare 3–4 ore. **Înghețarea funcțiilor** înainte de ultima rundă de teste și repetiții.

---

## 12. Scenariul de demo și validarea

### Demo (în pitch-ul de 3 minute)
> Formatul finalei (din ghid): **pitch de 3 minute în total**, apoi **interviu de 4 minute** cu juriul. Demo-ul live trebuie să încapă în **~60–90 s** din pitch, alături de problemă, rezultatele testelor și pașii următori. Pentru interviu pregătiți: cifrele din teste, ce ați învățat, riscurile (§13) și roadmap-ul (§14). Aici se poate arăta și restul demo-ului.

Ordinea completă, pentru interviu sau pentru video. În pitch intră doar pașii 2–5, scurtați:
1. Adminul încarcă Excel-ul oficial. AI-ul îl transformă în orar, adminul corectează un rând și publică.
2. Studentul (anul I, Seria 1, 1.2) deschide aplicația și vede „Următorul curs”.
3. Scanează codul QR de la intrarea pe etaj; harta arată „Ești aici”.
4. Caută `B623`, apasă „Du-mă acolo” și vede traseul pas cu pas.
5. Apasă pe pin și vede ce curs e acum și ce urmează azi.
6. *Bonus:* plimbare 3D.
- Juriul poate deschide aplicația pe telefonul lui, dintr-un QR pe slide.
- **Plan de rezervă:** dacă 3D-ul nu e gata, demo-ul se oprește la pasul 5 și rămâne complet. Există și un video înregistrat.

### Validare (DE VALIDAT, praguri stabilite înainte de teste)
- **Cel puțin 5 studenți din anul I**, teste pe sarcini („Găsește unde ai următorul curs și arată-mi drumul”).
- Metrici:
  - timpul până la găsirea sălii: aplicație vs. Excel + întrebări;
  - procentul de scanări QR reușite din prima încercare;
  - numărul de erori de navigare;
  - „ai folosi asta mâine?” (da / nu + motiv).
- Pragurile se scriu înainte de teste (ex. ≥ 80% scanări reușite, timp median < 30 s până vezi sala pe hartă).

---

## 13. Riscuri și constrângeri

| Risc | Măsură de reducere |
|---|---|
| Publicarea interiorului clădirii fără acord | Acordul facultății înainte de publicare. Scanări fără fețe și fără date personale de pe avizier. |
| Scanările se deformează pe coridoare lungi | Scanări pe bucăți, verificate cu distanțe măsurate. Ancorele QR corectează eroarea locală. |
| Formatul Excel se schimbă de la an la an | Parser fără poziții fixe + AI + verificare umană |
| Wi-Fi: browserul nu poate scana rețelele | Wi-Fi scos din concurs; doar într-o aplicație nativă (roadmap) |
| AR: nu se poate pe web; ARCore recunoaște greu un QR simplu | AR doar în roadmap (aplicație nativă), cu afișe cu grafică unică, verificate cu `arcoreimg` |
| Semnal slab pe holuri (**DE VALIDAT** pe etajul 6B: semnal mobil + eduroam pe holuri și la scări) | Pachet mic + cache pentru aplicație și ultimele date (§8, §9) |
| Wi-Fi-ul din sala de concurs cade la demo | Aplicația pornește din cache cu datele din `seed.json`; video de rezervă |
| Aplicația web nu se simte „aplicație” | Instalată pe ecranul principal (fără bara browserului), safe areas, gesturi, tranziții (§10) |
| Tema anunțată de organizatori nu se potrivește | Confirmare la începutul concursului |
| Cheia API expusă | Apelurile AI se fac doar din backend |

---

## 14. Roadmap (după concurs)
1. Toate etajele corpului B, apoi corpurile A, C și D.
2. Aplicație nativă (Android / iOS) doar pentru ce nu se poate pe web: AR, Wi-Fi, notificări locale. Pe aceleași date.
3. Orarul sesiunii de examene; săli libere acum; puncte utile complete.
4. Alte facultăți UPT, apoi alte universități din România (model **B2B2C**: universitatea plătește sau sponsorizează, studenții folosesc gratuit). Un kit de onboarding pentru universități: ghid de scanare + import de orar.
5. Localizare vizuală fără marcaje (VPS: Immersal / MultiSet).
6. Pre-Accelerator UPT (martie 2027).

---

## 15. Întrebări deschise (DESCHIS)
- Etajele de scanat pentru demo și sursa numerelor de sală pentru fiecare ușă (poze cu plăcuțele, planul de evacuare).
- Ce alte etaje se scanează pentru demo (ex. parterul corpului B, ca punct de plecare, + etajul 6).
- Data de început a semestrului I 2026/2027, numărul de săptămâni didactice și vacanțele.
- Domeniul aplicației (și al link-urilor din codurile QR). Pentru concurs ajunge `*.vercel.app`, dar afișele printate rămân legate de el.
- Lista completă de abrevieri per foaie (se generează la import).

---

## 16. Glosar
| Termen | Sens |
|---|---|
| Electro | Clădirea Facultății AC (corpurile A, B, C, D) |
| Corp | Aripă / clădire în Electro: A (decanat), B (7 etaje), C, D (un etaj) |
| Cod de sală | Ex. `B528b` = corp B, etaj 5, sala 28b |
| Program | O foaie din Excel = an + specializare / limbă / master |
| Serie | Grup de grupe (ex. `Seria 1 (C)`), sau specializarea la anii II–IV |
| Semigrupă | Unitatea cea mai mică din orar (ex. `1.2`) |
| C / S / L | Curs / Seminar / Laborator |
| `week_rule` | Lista săptămânilor didactice în care se ține ora |
| Paritate | Săptămână pară / impară, derivată din numărul săptămânii |
| Ancoră QR | Cod QR cu poziție și orientare cunoscute în coordonatele etajului |
| Nod / muchie | Elementele grafului de traseu |
| VIO | Visual-Inertial Odometry: cum urmărește ARCore mișcarea telefonului |
| Fingerprinting Wi-Fi | Localizare prin compararea puterii semnalului rețelelor cu o hartă radio înregistrată |
| GLB | Model 3D (glTF binar) exportat din Polycam |

---

## 17. Fișiere existente în proiect
| Fișier | Ce este |
|---|---|
| `2_11_2025.glb` | Scanarea etajului 6, corpul B (Polycam, iPhone LiDAR) |
| `glb_to_plan2d.py` | Generator de plan 2D din GLB (`python glb_to_plan2d.py <in.glb> <out>`) |
| `plan_2d.json` / `.svg` / `.png` | Planul 2D generat pentru etajul 6 B (2 poligoane de podea, 11 de pereți, 4 de scări) |
| `Orar_Cro_TI_Cen_sem1_2026-2027_public.xlsx` | Orarul oficial AC, semestrul I 2026/2027 (§7) |
| `prompt-research.md` | Istoric: promptul de cercetare pentru alegerea ideii + descrierea inițială a ideii |
