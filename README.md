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
