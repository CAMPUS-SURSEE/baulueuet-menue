# Hinweise zum Quellcode

Für alle, die den Code ändern: wie man arbeitet und welche Stellen man nicht
kaputt machen darf.

**Stand:** 28.09.2026

---

## So arbeitet man

- **`frontend/` ist die laufende Webseite.** Es gibt keinen Bauprozess und
  nichts zu installieren. Ein Push auf `main` geht automatisch live
  ([Veröffentlichen](04_Einrichtung_und_Deployment.md#4-eine-änderung-veröffentlichen)).
- **Jede Seite ist eine einzige Datei** mit HTML, CSS und JavaScript. Geteilt
  werden nur `konfig.js`, `auth.js` und `graph.js`, und die lädt die Gästeseite nicht.
- **Kennungen und Adressen** stehen in [`konfig.js`](../frontend/konfig.js).
- **Testen** lokal mit `?mock=1`, ohne Anmeldung und ohne echte Daten
  ([Lokal testen](03_Technische_Dokumentation.md#9-lokal-testen)).
- **Der Code ist ausführlich kommentiert.** Die Kommentare erklären das Warum
  an Ort und Stelle.

**Mock-Modus pflegen:** In `admin.html` baut `mockBauen()` eine Attrappe aller
Datenfunktionen (Termine, Bestellungen, Firmen). Wer eine Datenfunktion ändert,
muss die Attrappe mitziehen. Mit dem Schalter `firmenListeDa` lässt sich dort
der Fall «Liste «Firmen» fehlt» nachstellen.

---

## Die Fallen im Code

### Was an zwei Stellen steht

Die Gästeseite lädt `konfig.js` und `graph.js` bewusst nicht. Deshalb steht
einiges doppelt. **Wer es ändert, ändert beide Stellen.**

| Was | Stelle 1 | Stelle 2 |
|---|---|---|
| Annahmeschluss (10 Uhr) | `annahmeschluss` in `konfig.js` | `ANNAHMESCHLUSS` in `index.html` |
| Bildung des Firmencodes | `Hilfe.firmenCode()` in `graph.js` | `firmenCode()` in `index.html` |
| Prüfung des Firmenschlüssels | `Hilfe.firmaNormieren()` in `graph.js` | `firmaNormieren()` in `index.html` |
| Adresse von Flow B | `flowKlasseUrl` in `konfig.js` | `FLOW_KLASSE_URL` in `index.html` |

Ändert sich die Adresse eines Flows, gehört der Host zusätzlich in
`connect-src` in `frontend/_headers`.

Ein Fehler bei der Firmencode-Regel ist **still**: Die Gästeseite meldet dann
nur «Kein Kurs gefunden».

### Was nicht vereinfacht werden darf

- **Datum aus SharePoint** (`Hilfe.datumAusSp()`): In SharePoint stehen zwei
  Schreibweisen für denselben Tag (`…T22:00:00Z` von der alten Power App,
  `…T12:00:00Z` neu). Darum wird über die lokale Zeitzone umgerechnet, nie über
  die ersten zehn Zeichen. Sonst verschieben sich alte Einträge um einen Tag.
- **Ruhezone des QR-Codes:** `margin` zählt in SVG-Einheiten, nicht in Modulen.
  Bei `cellSize: 2` muss `margin: 8` stehen. Ohne Rand scannen viele Handys nicht.
- **Der Bindestrich unterscheidet Firmen- von Zufallscodes.** Er darf nie ins
  Alphabet `CODE_ZEICHEN`. `firmenSchluesselAusCode()` schneidet am
  **letzten** Bindestrich, weil der Schlüssel selbst einen enthält.
- **`formularSpeichern()` in `admin.html`** schickt `code` nur mit, wenn er sich
  wirklich ändern muss (Firmen-Termin verschoben oder Firma gewechselt). Wer
  `code` immer mitschickt, überschreibt bei jedem Speichern den Code.
- **`Graph.firmaAendern()`** schreibt nur den Namen, nie den Schlüssel. Am
  Schlüssel hängen gedruckte QR-Codes.
- **Fehlt die Liste «Firmen»**, liefern die Lesefunktionen eine leere Liste
  statt eines Fehlers. So bleibt die Terminverwaltung benutzbar.
- **Auswahlwerte aus SharePoint** setzt `auswahlSetzen()` auch dann, wenn sie
  zu keiner Option passen. Sonst würde ein Speichern den Wert still überschreiben.
- **Terminliste:** `passtZuZeitraum()` zeigt den heutigen Tag und Termine ohne
  Datum immer an; sonst verschwände ein Termin ohne Datum für immer.
  `nachTagen()` sortiert alle Tage in **einer** Richtung (umkehrbar über
  `fruehesteOben`). Keine Sonderregel für «heute».
- **CSS-Raster in `admin.html`:** `minmax(0, …)` und `min-width: 0` stehen
  lassen. Sonst schiebt ein langer Kurstitel die Spalten übereinander.

### Was nicht eingebaut werden darf

- **Keine Frist im Bestellformular der Verwaltung.** Die Réception muss jederzeit
  korrigieren können; dafür gibt es sie.
- **`kursblatt.html` darf nie von selbst zur Anmeldung umleiten.** Der Link geht
  an externe Kursleitungen. `Auth.anmeldungSicherstellen()` läuft dort nur auf
  Knopfdruck.
- **Die Gästeseite lädt keine Admin-Dateien** (`konfig.js`, `auth.js`,
  `graph.js`). Das hält den anonymen und den angemeldeten Teil getrennt.

### Wenn etwas Neues dazukommt

- **Neue fremde Adresse** (Dienst, Bibliothek, Flow): in `frontend/_headers`
  freigeben. Sonst blockiert der Browser still.
- **Neue Seite mit Anmeldung:** Umleitungsadresse in Entra ID eintragen, mit und
  ohne `.html` ([Einrichtung 2.2](04_Einrichtung_und_Deployment.md#22-umleitungsadressen)).
- **Neue Spalte in `FELDER_KLASSE`** (`graph.js`): zuerst in SharePoint anlegen,
  dann veröffentlichen. Lesen hat einen Rückfall, Schreiben nicht.
- **Neuer Text auf Gästeseite oder Kursblatt:** im Objekt `TEXTE` in allen drei
  Sprachen (`de`, `fr`, `en`) eintragen. Die Werte, die an Flow C gehen
  (`Suppe`, `Salat`, `Keine`, `Menü 1`, `Menü 2`), bleiben immer deutsch.
- **Neue Bibliotheksversion:** Adresse und `integrity` zusammen ändern
  ([Einrichtung, Abschnitt 5](04_Einrichtung_und_Deployment.md#5-bibliotheksversion-anheben)).
