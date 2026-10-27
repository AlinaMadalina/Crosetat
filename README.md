# Schema mea de croșetat

Aplicație web instalabilă (PWA) pentru scris, calculat și bifat rândurile schemelor de croșetat,
cu sincronizare automată între telefon și laptop.

**Link:** https://alinamadalina.github.io/Crosetat/

## Instalare pe telefon

1. Deschide linkul de mai sus în **Chrome** (Android) sau **Safari** (iPhone).
2. Android: meniul `⋮` → *Instalează aplicația* / *Adaugă la ecranul principal*.
   iPhone: butonul *Share* → *Add to Home Screen*.
3. Aplicația pornește pe tot ecranul, fără bara browserului, și merge și fără internet.

## Sincronizare

Cardul **Sincronizare telefon ↔ laptop** din aplicație. Te conectezi cu același cont pe ambele
dispozitive și proiectele trec dintr-o parte în alta singure, în 1–2 secunde.

Cum funcționează:

- toată starea stă într-un singur document Firestore, `users/<uid>/state/current`,
  serializată ca text în câmpul `json` — Firestore nu acceptă liste în liste, iar starea
  are rânduri în părți în proiecte;
- salvările locale se grupează la 1,5 s, ca să nu scrie la fiecare bifă;
- `onSnapshot` aduce imediat ce s-a schimbat pe celălalt dispozitiv, fără refresh;
- cache-ul persistent Firestore face ca totul să meargă offline: scrierile stau în coadă
  și pleacă singure când revine internetul;
- la prima conectare pe un dispozitiv nou se compară ce e local cu ce e în cloud
  și se păstrează versiunea mai nouă.

Proiectul Firebase: `crosetat-270da`. Regulile sunt în [`firestore.rules`](firestore.rules) —
fiecare cont vede doar ce e sub propriul `uid`. Valorile din
[`firebase-config.js`](firebase-config.js) nu sunt secrete: la Firebase `apiKey` e publică
prin design, iar datele sunt protejate de reguli și de parola contului.

Dacă `window.CROSET_FIREBASE` e `null`, aplicația merge strict local, ca înainte.

## Modele gata făcute

Cardul **Modele gata făcute**, sub bara de proiecte. Alegi unul și se adaugă ca proiect
nou, cu rândurile deja scrise; proiectele de acum rămân neatinse și poți modifica orice
după aceea.

| Model | Formă | Ce iese |
|---|---|---|
| Cerc plat | cerc | 6 ture, 6 → 36 ochiuri |
| Bilă mică | cerc | 9 ture, crește și se închide la loc |
| Pătrat granny | pătrat | 4 ture, colțuri din lanțuri |
| Hexagon granny | hexagon | 3 ture |
| Dreptunghi | plat | lanț de 20 și rânduri dus-întors |
| Stea | pentagon + laturi | vârful scris o dată, lucrat pe fiecare latură |
| Cardigan | plat + 2 cercuri | raglan de sus în jos, cu desenul pieselor; mânecile sunt două părți separate |


Modelele stau în `MODELE`, lângă restul datelor din `index.html` — ca să adaugi unul,
scrii un obiect cu `name`, `hint` și `parts` (fiecare cu `shape`, opțional `attach`, și
`rows`). Rândurile trebuie scrise în sintaxa parserului; toate cele de acum au fost
verificate să iasă fără erori și cu numărătorile corecte.

Un model poate avea și `svg` — un desen al pieselor, arătat sub buton —, `note`, un
rând de lămurire sub desen, iar o parte poate avea `notes`, care ajunge în „Detalii parte”.

### Măsurile mele

Cardul **Măsurile mele** apare la proiectele făcute dintr-un model care are desen. Arată
același desen, dar fără etichetele cu numărul de ochiuri (ascunse din CSS), și pune peste
el căsuțe de scris, așezate procentual: gât, braț sus, piept, mânecă, manșetă, lungime.

Ce scrii se ține pe proiect, în `p.dims`, deci merge și prin sincronizare. Căsuțele nu
declanșează o re-randare completă, ca să nu-ți sară cursorul din ele cât scrii.

Punctele de măsură se dau în model, în `dims`: `{k, label, x, y}`, unde `x` și `y` sunt
procente din lățimea și înălțimea desenului.

## Mărime

Cardul **Mărime** de sub schemă. Măsori o singură dată cât e de înalt un rând —
piciorul ochiului, de la rândul de dedesubt până sus — și alegi la ce rând ai măsurat.
De acolo încolo mărimea se reface la fiecare rând nou, pentru că `renderSize` e chemată
din `render()`.

Măsura aia dă scara: `rowH()` spune cât e de înalt rândul în unități de ochi
(sc = 1, dc = 1,8 …), deci centimetrii împărțiți la ea dau cât e o unitate.
**Numărul de ochiuri nu intră în calcul** — un cerc cu 6/12/18 ochiuri și unul cu
20/40/60 ies la fel de mari, fiindcă au același număr de ture. La formele plate
numărul de ochiuri dă doar lățimea, iar aceea se poate măsura separat (câmp opțional).

`geomOf()` calculează geometria în aceleași unități ca desenul (`slotW`, `rowH`), dar
fără spațierea de 0.35 dintre rânduri și fără gaura de 0.7 din centru: alea există
doar ca schema să fie citibilă, nu în lucrul adevărat.

| Forma | Ce iese |
|---|---|
| Rânduri (plat) | lățime × înălțime |
| Cerc | dintr-o parte în alta |
| Colțuri | lățime, colț la colț, o latură |

## Laturi: aceleași rânduri, bife separate

O parte atașată pe mai multe laturi ale bazei (vârfurile unei stele pe laturile unui
pentagon) se scrie **o singură dată**: rândurile aparțin părții, nu laturii. Ce se ține
separat e doar progresul.

Deasupra listei de rânduri apare un selector `L1 … Ln` cu câte `făcute / total` are
fiecare latură. Alegi latura la care lucrezi, iar bifele, schema și numărătorile arată
latura aia. În schemă fiecare latură e desenată cu progresul ei, deci vezi dintr-o
privire ce vârf e gata.

Model de date:

- `r.doneOn[k] = true` — rândul `r` e făcut pe latura `k`; sursa adevărului
- `r.done` — derivat, „făcut pe toate laturile pe care se lucrează partea”.
  Restul aplicației (numărători, rezumate, backup, „proiect terminat”) citește doar
  `r.done`, deci nu a trebuit schimbată.
- `pt.cur` — latura la care se lucrează acum

Părțile fără laturi, sau atașate pe una singură, merg exact ca înainte: selectorul nu
apare și se folosește `r.done`. Datele vechi, cu `r.done` dar fără `r.doneOn`, se
citesc ca „făcut pe toate laturile”.

## Cum ajunge pe telefon un update făcut pe laptop

1. Modifici fișierele aici.
2. **Crești `VERSION` în [`sw.js`](sw.js)** (ex. `v18.1.0` → `v18.1.1`). Pasul ăsta e obligatoriu —
   fără el telefonul servește versiunea din cache.
3. `git add -A && git commit -m "..." && git push`
4. Workflow-ul [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publică automat;
   durează 1–2 minute.
5. La următoarea deschidere a aplicației pe telefon, service worker-ul vede versiunea nouă:
   - dacă nu scrii nimic în acel moment, se actualizează singur și se reîncarcă;
   - dacă ai text nesalvat, apare bara maro „Versiune nouă” și se aplică la apăsare.

## Fișiere

| Fișier | Ce face |
|---|---|
| `index.html` | toată aplicația: parser de rânduri, schema desenată, proiecte, mărime, backup, sincronizare |
| `sync.js` | sincronizarea peste Firestore: trimite, ascultă, împacă prima conectare |
| `firebase-config.js` | configurația proiectului Firebase |
| `firestore.rules` | regulile de securitate, de copiat în consola Firebase |
| `manifest.json` | numele, iconițele și modul `standalone` (instalare) |
| `sw.js` | cache offline + mecanismul de update; `VERSION` se crește la fiecare deploy |
| `icon-*.png` | iconițele de pe ecranul principal |

## Puncte de legătură în cod

`index.html` expune `window.CrosetApp`:

- `getState()` — starea curentă
- `setState(st)` — o înlocuiește, re-randează și salvează, fără să declanșeze un nou push
- `KEY`, `version`

și apelează `window.CrosetSync.onLocalSave(st)` la fiecare salvare locală.
`sync.js` nu atinge nimic altceva din aplicație.

## Dezvoltare locală

Service worker-ul are nevoie de `http://localhost`, nu merge cu `file://`.
Fără Node sau Python instalate, serverul static din `scripts/serve.ps1`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\serve.ps1
```

apoi deschizi http://localhost:8765/
