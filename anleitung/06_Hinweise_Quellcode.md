# Hinweise zum Quellcode

**Stand:** 04.09.2026

Der Ordner `frontend` enthält **genau das, was bei Cloudflare Pages ausgeliefert wird**. Es gibt keinen Bauprozess, keine Abhängigkeiten zum Installieren und keinen Zwischenschritt: Was hier liegt, ist die laufende Webseite.

---

## Dateien

| Datei | Aufgabe |
|---|---|
| `frontend\index.html` | Gästeseite, Menüwahl. Ohne Anmeldung |
| `frontend\admin.html` | Verwaltung der Termine, links nach Kurstag gruppiert. Ersetzt die frühere Power-Apps-App |
| `frontend\kursblatt.html` | Aushang mit QR-Code, Aufruf mit `?klasse=CODE`. **Ohne Anmeldung**, lädt über Flow B |
| `frontend\menueblatt.html` | Bestellübersicht für die Küche, Aufruf mit `?klasse=CODE` |
| `frontend\konfig.js` | alle Kennungen und Adressen an einer Stelle. **Hier zuerst schauen** |
| `frontend\auth.js` | Anmeldung an Entra ID, dünner Aufsatz auf MSAL |
| `frontend\graph.js` | Zugriff auf die SharePoint-Listen, dazu Datums- und Codehilfen |
| `frontend\_headers` | Sicherheitsheader und Content Security Policy für Cloudflare Pages |
| `code\serve.ps1` | kleiner Server zum lokalen Testen |

Jede Seite trägt ihr HTML, CSS und JavaScript in einer einzigen Datei. Geteilt werden nur die drei `.js`-Module.

---

## Lokal anschauen

```
powershell -ExecutionPolicy Bypass -File code\serve.ps1
```

Danach im Browser öffnen:

- `http://localhost:8123/index.html?mock=1`
- `http://localhost:8123/index.html?mock=1&spaet=1` (nach dem Annahmeschluss)
- `http://localhost:8123/admin.html?mock=1`
- `http://localhost:8123/kursblatt.html?mock=1`
- `http://localhost:8123/menueblatt.html?mock=1`

`?mock=1` arbeitet mit erfundenen Daten, ohne Anmeldung und ohne Netzwerk. In der Verwaltung funktionieren dabei auch Anlegen, Bearbeiten und Löschen, für Termine wie für Bestellungen, allerdings nur im Arbeitsspeicher. Wer `Daten.bestellungAnlegen`, `bestellungAendern` oder `bestellungLoeschen` ändert, muss die Attrappe in `mockBauen()` mitziehen; sonst läuft der Mock-Modus auseinander mit dem, was gegen SharePoint passiert.

---

## Bevor du etwas änderst

- **`frontend\_headers` mitdenken.** Ruft die Seite neu eine fremde Adresse auf, muss sie dort freigegeben werden. Sonst blockiert der Browser den Aufruf stillschweigend und die Seite bleibt ohne erkennbare Ursache leer.
- **Die Datumsfalle in `graph.js` nicht vereinfachen.** In SharePoint stehen zwei verschiedene Schreibweisen für denselben Kurstag. Die Umrechnung läuft deshalb über die lokale Zeitzone und nicht über die ersten zehn Zeichen der Zeichenkette.
- **Beim QR-Code zählt `margin` in SVG-Einheiten, nicht in Modulen.** Bei `cellSize: 2` sind vier Module Ruhezone `margin: 8`. Ohne Ruhezone verweigern Scanner den Code.
- **Bibliotheksversionen und `integrity`-Prüfsummen gehören zusammen.** Wird eine Version angehoben, ohne die Prüfsumme mitzuziehen, lädt der Browser die Datei nicht mehr.
- **Der Annahmeschluss steht an zwei Stellen.** `KONFIG.annahmeschluss` in `konfig.js` und `ANNAHMESCHLUSS` im Kopf von `index.html`. Die Gästeseite lädt `konfig.js` bewusst nicht, weil sie ohne Anmeldung auskommt. Wer die Uhrzeit ändert, muss **beide** anfassen.
- **Eine neue Seite mit Anmeldung braucht einen Eintrag in Entra ID.** Jede Seite meldet sich auf ihrer eigenen Adresse an. Fehlt die Umleitungsadresse, scheitert die Anmeldung mit `AADSTS50011`. Siehe `04_Einrichtung_und_Deployment.md`, Abschnitt 2.2.
- **Rasterspalten brauchen `minmax(0, ...)` und `min-width: 0`.** Ein Feld in einem CSS-Raster wird von sich aus nie schmaler als sein längster nicht umbrechbarer Inhalt, auch dann nicht, wenn die Spalte auf eine feste Breite gesetzt ist. In der Verwaltung hat das eine Klassenzeile mit langem Titel über die Detailspalte hinausgeschoben, sodass sich die beiden Spalten verdeckt haben. Wer in `admin.html` am Raster `.raster` oder an der Liste `.liste` etwas ändert, muss die Null in `minmax(0, ...)` und das `min-width: 0` stehen lassen. Ein Kürzen mit `text-overflow: ellipsis` allein genügt nicht: es greift erst, wenn das Feld überhaupt schmaler werden darf.
- **Eine neue Spalte in `FELDER_KLASSE` muss in SharePoint existieren, bevor die Fassung live geht.** Beim *Lesen* ist das harmlos: Graph beantwortet ein unbekanntes Feld in `$select` mit HTTP 400, und `alleElemente` in `graph.js` wiederholt die Abfrage ohne Feldauswahl. Beim *Schreiben* gibt es diesen Rückfall nicht, das Speichern schlägt fehl. Gilt derzeit für `Teilnehmer` (erwartete Teilnehmeranzahl, Zahl, darf leer sein).
- **In der Terminliste ist der heutige Tag immer sichtbar.** `passtZuZeitraum()` in `admin.html` lässt den heutigen Tag und Termine **ohne** Datum unabhängig vom Filter durch. `nachTagen()` sortiert danach alle Tage in **einer** Richtung, absteigend; eine Sonderbehandlung für den heutigen Tag gab es schon einmal und hat die Liste unlesbar gemacht, siehe `05_Entscheide_und_Verlauf.md`, Abschnitt 5c. Die zweite Ausnahme ist wichtig: Ein Termin ohne Datum liesse sich sonst über keinen Filter mehr finden und wäre für immer verschwunden.
- **Das Bestellformular in `admin.html` kennt bewusst keine Frist.** Die 10-Uhr-Grenze gehört der Gästeseite; die Réception muss jederzeit korrigieren und nacherfassen können, das ist der ganze Sinn der Sache. Wer dort eine Prüfung der Uhrzeit einbaut, nimmt dem Empfang genau den Handgriff weg, für den die Frist ihn vorsieht. Siehe `05_Entscheide_und_Verlauf.md`, Abschnitt 5f.
- **Auswahlwerte aus SharePoint nie ungeprüft in ein `<select>` setzen.** Passt der Wert zu keiner Option, steht das Feld leer da und ein Speichern überschreibt die Angabe stillschweigend. `auswahlSetzen()` in `admin.html` nimmt einen unbekannten Wert deshalb als zusätzliche Option auf.
- **`kursblatt.html` darf nicht von selbst zur Anmeldung umleiten.** Die Seite ist öffentlich, damit ihr Link an die Kursleitung gehen kann. `Auth.anmeldungSicherstellen()` wird dort nur auf Knopfdruck aufgerufen. Wer das ändert, macht den Link für Externe unbrauchbar.

Ausführlich steht das in `03_Technische_Dokumentation.md`, Abschnitt 10.

---

## Verhältnis zum laufenden Betrieb

Dieses Repository ist der **massgebende Stand**, nicht eine Kopie davon. Cloudflare Pages hängt daran und liefert nach jedem Push auf `main` aus, was in `frontend` liegt. Es gibt kein zweites Arbeitsverzeichnis, aus dem nachträglich zurückgespielt werden müsste; das frühere `C:\Claude\menuwahl-bauluut\` ist damit gegenstandslos.

Gesteuert wird die Auslieferung durch `wrangler.toml` im Wurzelverzeichnis. Der Ablauf Schritt für Schritt steht in `04_Einrichtung_und_Deployment.md`, Abschnitt 4.
