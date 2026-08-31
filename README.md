# Menüwahl Restaurant BAULÜÜT

Kursteilnehmende am Campus Sursee wählen ihr Mittagsmenü über eine Webseite statt auf einem Papierblatt. Die Réception legt pro Kurs eine Klasse an und gibt den Teilnehmenden einen Link oder ein Blatt mit QR-Code. Die Küche erhält die gesammelten Bestellungen ausgedruckt.

**Stand dieser Ablage:** 28.08.2026

---

## Wo fange ich an

| Ich bin | Ich lese |
|---|---|
| an der Réception und will das System bedienen | [`anleitung/01_Anleitung_Reception.md`](anleitung/01_Anleitung_Reception.md) |
| bei den ICT-Services und habe eine Störung | [`anleitung/02_Betriebshandbuch_Support.md`](anleitung/02_Betriebshandbuch_Support.md) |
| bei den ICT-Services und will verstehen, wie es gebaut ist | [`anleitung/03_Technische_Dokumentation.md`](anleitung/03_Technische_Dokumentation.md) |
| dabei, etwas zu ändern oder zu veröffentlichen | [`anleitung/04_Einrichtung_und_Deployment.md`](anleitung/04_Einrichtung_und_Deployment.md) |
| neu im Projekt und frage mich, warum es so ist | [`anleitung/05_Entscheide_und_Verlauf.md`](anleitung/05_Entscheide_und_Verlauf.md) |
| dabei, den Code zu ändern | [`anleitung/06_Hinweise_Quellcode.md`](anleitung/06_Hinweise_Quellcode.md) |

---

## Was hier liegt

```
baulueuet-menue/
├── README.md                         dieses Dokument
├── frontend/                         die Webseite, genau so wie sie gehostet wird
│   ├── index.html                    Gästeseite, Menüwahl
│   ├── admin.html                    Verwaltung der Klassen
│   ├── kursblatt.html                Aushang mit QR-Code
│   ├── menueblatt.html               Bestellübersicht für die Küche
│   ├── konfig.js                     alle Kennungen und Adressen an einer Stelle
│   ├── auth.js                       Anmeldung an Entra ID
│   ├── graph.js                      Zugriff auf die SharePoint-Listen
│   ├── _headers                      Sicherheitsheader und CSP (Netlify)
│   └── .nojekyll                     damit GitHub Pages `_headers` nicht wegfiltert
├── code/
│   └── serve.ps1                     kleiner Server zum lokalen Testen
├── anleitung/
│   ├── 01_Anleitung_Reception.md     Bedienung, für die Anwender
│   ├── 02_Betriebshandbuch_Support.md  Störungsbehebung, für die ICT
│   ├── 03_Technische_Dokumentation.md  Architektur, Datenmodell, Schnittstellen
│   ├── 04_Einrichtung_und_Deployment.md  Einrichten und veröffentlichen
│   ├── 05_Entscheide_und_Verlauf.md  warum es so gebaut ist, was offen ist
│   └── 06_Hinweise_Quellcode.md      Hinweise für alle, die den Code ändern
└── Vorlagen/
    ├── Menueauswahlblatt_Original_Word.docx   das alte Papierblatt als Referenz
    └── logo-bauluut.svg
```

Alle Pfadangaben in den Dokumenten sind ab diesem Wurzelverzeichnis zu lesen.

---

## Veröffentlichen über GitHub Pages

Der Ordner `frontend` ist so aufgebaut, dass er direkt als Quelle für GitHub Pages
dienen kann: **Settings → Pages → Source: Deploy from a branch → Branch `main`,
Ordner `/frontend`**. Es gibt keinen Bauprozess; was in `frontend` liegt, wird
unverändert ausgeliefert.

Drei Dinge dazu:

- `.nojekyll` muss bleiben. Ohne diese Datei ignoriert GitHub Pages alles, was mit
  einem Unterstrich beginnt, also auch `_headers`.
- `_headers` wirkt nur bei Netlify. GitHub Pages liest die Datei nicht, die
  Sicherheitsheader und die Content Security Policy entfallen dort. Für den
  Produktivbetrieb bleibt Netlify die Referenz, siehe
  [`anleitung/04_Einrichtung_und_Deployment.md`](anleitung/04_Einrichtung_und_Deployment.md).
- Für die Domäne `menue.campus-sursee.ch` bräuchte es zusätzlich eine Datei
  `frontend/CNAME` mit dem Domänennamen und den passenden DNS-Eintrag.

Lokal anschauen ohne Hosting:

```
powershell -ExecutionPolicy Bypass -File code\serve.ps1
```

---

## Die vier Seiten

| Adresse | Wofür | Anmeldung |
|---|---|---|
| `https://menue.campus-sursee.ch/?klasse=CODE` | Gäste wählen ihr Menü | nein |
| `https://menue.campus-sursee.ch/admin.html` | Verwaltung der Klassen | ja |
| `https://menue.campus-sursee.ch/kursblatt.html?klasse=CODE` | Aushang mit QR-Code | ja |
| `https://menue.campus-sursee.ch/menueblatt.html?klasse=CODE` | Bestellübersicht für die Küche | ja |

Jede Seite kennt `?mock=1`. Damit zeigt sie Testdaten ohne Anmeldung, praktisch zum Anschauen und Erklären.

---

## In drei Sätzen, wie es funktioniert

Die Webseite liegt bei Netlify und ist reines HTML, es gibt keinen eigenen Server. Die Daten stehen in zwei SharePoint-Listen auf der Site «Reception»; die Verwaltung greift nach Anmeldung mit dem Microsoft-365-Konto direkt darauf zu, die Gästeseite über zwei Power-Automate-Flows, weil Kursteilnehmende kein Konto haben. Die Tagesmenüs kommen von Lunchgate, abgeholt von einem dieser Flows.

---

## Zuständigkeiten

| Bereich | Konto |
|---|---|
| Power Automate Flows | powerplatform@campus-sursee.ch |
| SharePoint-Site «Reception» | ICT-Services |
| Netlify, Domäne `menue.campus-sursee.ch` | ICT-Services |
| Entra ID App-Registrierung und Benutzerzuweisung | ICT-Services |
| Menüinhalte | Restaurant BAULÜÜT über Lunchgate |

Zugangsdaten stehen bewusst **nicht** in dieser Ablage.
