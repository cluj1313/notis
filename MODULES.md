# Notis — module JS (din v189 / 2.20.0)

`index.html` conține doar HTML + CSS și încarcă scripturile clasice în ordinea de mai jos
(ordinea contează: `core.js` definește toate funcțiile comune; modulele de după îl folosesc).
Toate numele de nivel superior sunt globale (fostul IIFE din index.html a fost despachetat).

| Ordine | Fișier | Conține |
|---|---|---|
| 1 | js/core.js | stocare (localStorage), i18n `TR`, notițe/taburi/editor, liste, cumpărături, urgențe, medicamente + alarme, voce, backup (`bkShare0`), lansare din scurtături/widget (`nsLaunch`: `?a=` `?tab=` `?open=` `?tk=`) |
| 2 | js/plati.js | Plăți (tab kind `util`): `UT_DEF`, grupuri, migrări, plăți/alarme |
| 3 | js/crm.js | CRM (tab kind `crm`) |
| 4 | js/parole.js | Parole (seif criptat) |
| 5 | js/tabs.js | constante app (`NOTIS_WEB_REL`), ordinea taburilor, urgențe |
| 6 | js/setari.js | Setări (modal) |
| 7 | js/news.js | Mesaje / noutăți |
| 8 | js/hdr.js | Iconiță antet |
| 9 | js/boot.js | pornire: screensaver, `NOTIS_BOOTED`, backup automat |
| 10 | js/setari-ui.js | Setări: rând iconiță + secțiuni pliabile |
| 11 | js/glicemie.js | Medicamente: categorii + Glicemie |
| 11b | js/taskx.js | v199: tab Sarcini (kind 'task', opt-in din Setări): ns_tk(+_bak), subsarcini, poze cu nume (IndexedDB, prefix 'tk:'), phPickN pentru „Foto cu nume” în notițe |
| 12 | js/stats.js | Contor anonim instalări + coduri „Ai un cod?” + panou admin (zona secretă); Worker `notis-stats.cluj1313.workers.dev` |

## Test per modul
După o modificare într-un modul rulează:
1. testele modulului atins (`/workspace/notis-tools/v*t*.js` care țintesc acel tab);
2. verificarea de pornire `node /tmp/start189.js` (RO + EN, fără erori, `NOTIS_BOOTED`);
3. `node /workspace/notis-tools/v77/chk.js` → `TOTAL 0` (citește index.html + js/*.js).
Suita completă (`notis-tools/v189/suite.sh OUT`) se rulează o dată înainte de release.

## Reguli
- Un fișier JS nou trebuie adăugat: în `index.html` (în ordinea corectă), în `SHELL` din `sw.js`
  (și crescut `VERSION`), apoi `./sync-web.sh` în proiectul Android (assets `www/` sunt în git).
- `NOTIS_WEB_REL` (js/tabs.js) și `VERSION` (sw.js) se schimbă împreună la fiecare release.
- Nu se rulează `src/build.sh`; se editează direct modulele.
