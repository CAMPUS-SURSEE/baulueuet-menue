# Hinweise zum Quellcode

**Stand:** 28.08.2026

Der Ordner `frontend` enthält **genau das, was auf Netlify ausgeliefert wird**. Es gibt keinen Bauprozess, keine Abhängigkeiten zum Installieren und keinen Zwischenschritt: Was hier liegt, ist die laufende Webseite.

---

## Dateien

| Datei | Aufgabe |
|---|---|
| `frontend\index.html` | Gästeseite, Menüwahl. Ohne Anmeldung |
| `frontend\admin.html` | Verwaltung der Klassen. Ersetzt die frühere Power-Apps-App |
| `frontend\kursblatt.html` | Aushang mit QR-Code, Aufruf mit `?klasse=CODE` |
| `frontend\menueblatt.html` | Bestellübersicht für die Küche, Aufruf mit `?klasse=CODE` |
| `frontend\konfig.js` | alle Kennungen und Adressen an einer Stelle. **Hier zuerst schauen** |
| `frontend\auth.js` | Anmeldung an Entra ID, dünner Aufsatz auf MSAL |
| `frontend\graph.js` | Zugriff auf die SharePoint-Listen, dazu Datums- und Codehilfen |
| `frontend\_headers` | Sicherheitsheader und Content Security Policy für Netlify |
| `code\serve.ps1` | kleiner Server zum lokalen Testen |

Jede Seite trägt ihr HTML, CSS und JavaScript in einer einzigen Datei. Geteilt werden nur die drei `.js`-Module.

---

## Lokal anschauen

```
powershell -ExecutionPolicy Bypass -File code\serve.ps1
```

Danach im Browser öffnen:

- `http://localhost:8123/index.html?mock=1`
- `http://localhost:8123/admin.html?mock=1`
- `http://localhost:8123/kursblatt.html?mock=1`
- `http://localhost:8123/menueblatt.html?mock=1`

`?mock=1` arbeitet mit erfundenen Daten, ohne Anmeldung und ohne Netzwerk. In der Verwaltung funktionieren dabei auch Anlegen, Bearbeiten und Löschen, allerdings nur im Arbeitsspeicher.

---

## Bevor du etwas änderst

- **`frontend\_headers` mitdenken.** Ruft die Seite neu eine fremde Adresse auf, muss sie dort freigegeben werden. Sonst blockiert der Browser den Aufruf stillschweigend und die Seite bleibt ohne erkennbare Ursache leer.
- **Die Datumsfalle in `graph.js` nicht vereinfachen.** In SharePoint stehen zwei verschiedene Schreibweisen für denselben Kurstag. Die Umrechnung läuft deshalb über die lokale Zeitzone und nicht über die ersten zehn Zeichen der Zeichenkette.
- **Beim QR-Code zählt `margin` in SVG-Einheiten, nicht in Modulen.** Bei `cellSize: 2` sind vier Module Ruhezone `margin: 8`. Ohne Ruhezone verweigern Scanner den Code.
- **Bibliotheksversionen und `integrity`-Prüfsummen gehören zusammen.** Wird eine Version angehoben, ohne die Prüfsumme mitzuziehen, lädt der Browser die Datei nicht mehr.

Ausführlich steht das in `03_Technische_Dokumentation.md`, Abschnitt 10.

---

## Verhältnis zum laufenden Betrieb

Dieses Repository ist der **massgebende Stand**, nicht eine Kopie davon. Netlify hängt daran und liefert nach jedem Push auf `main` aus, was in `frontend` liegt. Es gibt kein zweites Arbeitsverzeichnis, aus dem nachträglich zurückgespielt werden müsste; das frühere `C:\Claude\menuwahl-bauluut\` ist damit gegenstandslos.

Gesteuert wird die Auslieferung durch `netlify.toml` im Wurzelverzeichnis. Der Ablauf Schritt für Schritt steht in `04_Einrichtung_und_Deployment.md`, Abschnitt 4.
