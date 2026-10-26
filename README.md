# Schema mea de croșetat

Aplicație web instalabilă (PWA) pentru scris, calculat și bifat rândurile schemelor de croșetat.

**Link:** https://alinamadalina.github.io/Crosetat/

## Instalare pe telefon

1. Deschide linkul de mai sus în **Chrome** (Android) sau **Safari** (iPhone).
2. Android: meniul `⋮` → *Instalează aplicația* / *Adaugă la ecranul principal*.
   iPhone: butonul *Share* → *Add to Home Screen*.
3. Aplicația pornește pe tot ecranul, fără bara browserului, și merge și fără internet.

## Cum ajunge pe telefon un update făcut pe laptop

1. Modifici fișierele aici.
2. **Crești `VERSION` în [`sw.js`](sw.js)** (ex. `v17.0.0` → `v17.0.1`). Pasul ăsta e obligatoriu —
   fără el telefonul servește versiunea din cache.
3. `git add -A && git commit -m "..." && git push`
4. GitHub Pages publică în 1–2 minute.
5. La următoarea deschidere a aplicației pe telefon, service worker-ul vede versiunea nouă:
   - dacă nu scrii nimic în acel moment, se actualizează singur și se reîncarcă;
   - dacă ai text nesalvat, apare bara maro „Versiune nouă” și se aplică la apăsare.

## Fișiere

| Fișier | Ce face |
|---|---|
| `index.html` | toată aplicația: parser de rânduri, schema desenată, proiecte, backup |
| `manifest.json` | numele, iconițele și modul `standalone` (instalare) |
| `sw.js` | cache offline + mecanismul de update; `VERSION` se crește la fiecare deploy |
| `icon-*.png` | iconițele de pe ecranul principal |

## Date

Proiectele se țin în `localStorage`, cheia `croset-schema-v1`, pe fiecare dispozitiv separat.
Cardul **Backup** din aplicație exportă/importă tot, ca text.

`index.html` expune `window.CrosetApp` (`getState()`, `setState()`) și apelează
`window.CrosetSync.onLocalSave(st)` la fiecare salvare — punctele prin care se adaugă
sincronizarea automată între telefon și laptop.

## Dezvoltare locală

Service worker-ul are nevoie de `http://localhost`, nu merge cu `file://`.
Fără Node sau Python instalate, serverul static din `scripts/serve.ps1`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\serve.ps1
```

apoi deschizi http://localhost:8765/
