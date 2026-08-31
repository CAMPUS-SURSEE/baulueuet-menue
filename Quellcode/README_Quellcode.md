# Quellcode

**Stand:** 28.08.2026

Der Ordner `site` enthält **genau das, was auf Netlify ausgeliefert wird**. Es gibt keinen Bauprozess, keine Abhängigkeiten zum Installieren und keinen Zwischenschritt: Was hier liegt, ist die laufende Webseite.

---

## Dateien

| Datei | Aufgabe |
|---|---|
| `site\index.html` | Gästeseite, Menüwahl. Ohne Anmeldung |
| `site\admin.html` | Verwaltung der Klassen. Ersetzt die frühere Power-Apps-App |
| `site\kursblatt.html` | Aushang mit QR-Code, Aufruf mit `?klasse=CODE` |
| `site\menueblatt.html` | Bestellübersicht für die Küche, Aufruf mit `?klasse=CODE` |
| `site\konfig.js` | alle Kennungen und Adressen an einer Stelle. **Hier zuerst schauen** |
| `site\auth.js` | Anmeldung an Entra ID, dünner Aufsatz auf MSAL |
| `site\graph.js` | Zugriff auf die SharePoint-Listen, dazu Datums- und Codehilfen |
| `site\_headers` | Sicherheitsheader und Content Security Policy für Netlify |
| `serve.ps1` | kleiner Server zum lokalen Testen |

Jede Seite trägt ihr HTML, CSS und JavaScript in einer einzigen Datei. Geteilt werden nur die drei `.js`-Module.

---

## Lokal anschauen

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Danach im Browser öffnen:

- `http://localhost:8123/index.html?mock=1`
- `http://localhost:8123/admin.html?mock=1`
- `http://localhost:8123/kursblatt.html?mock=1`
- `http://localhost:8123/menueblatt.html?mock=1`

`?mock=1` arbeitet mit erfundenen Daten, ohne Anmeldung und ohne Netzwerk. In der Verwaltung funktionieren dabei auch Anlegen, Bearbeiten und Löschen, allerdings nur im Arbeitsspeicher.

---

## Bevor du etwas änderst

- **`site\_headers` mitdenken.** Ruft die Seite neu eine fremde Adresse auf, muss sie dort freigegeben werden. Sonst blockiert der Browser den Aufruf stillschweigend und die Seite bleibt ohne erkennbare Ursache leer.
- **Die Datumsfalle in `graph.js` nicht vereinfachen.** In SharePoint stehen zwei verschiedene Schreibweisen für denselben Kurstag. Die Umrechnung läuft deshalb über die lokale Zeitzone und nicht über die ersten zehn Zeichen der Zeichenkette.
- **Beim QR-Code zählt `margin` in SVG-Einheiten, nicht in Modulen.** Bei `cellSize: 2` sind vier Module Ruhezone `margin: 8`. Ohne Ruhezone verweigern Scanner den Code.
- **Bibliotheksversionen und `integrity`-Prüfsummen gehören zusammen.** Wird eine Version angehoben, ohne die Prüfsumme mitzuziehen, lädt der Browser die Datei nicht mehr.

Ausführlich steht das in `..\03_Technische_Dokumentation.md`, Abschnitt 10.

---

## Verhältnis zum Arbeitsverzeichnis

Dieser Ordner ist eine **Momentaufnahme** vom 28.08.2026. Gearbeitet wurde in `C:\Claude\menuwahl-bauluut\`. Wer dort etwas ändert und veröffentlicht, sollte die geänderten Dateien anschliessend hierher zurückspielen, damit Dokumentation und Wirklichkeit nicht auseinanderlaufen.

Veröffentlicht wird von Hand: Ordner `site` bei Netlify per Drag & Drop ablegen. Siehe `..\04_Einrichtung_und_Deployment.md`, Abschnitt 4.
