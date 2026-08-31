# Technische Dokumentation: Menüwahl Restaurant BAULÜÜT

**Stand:** 28.08.2026
**Gilt für:** die statische Webseite auf `menue.campus-sursee.ch` samt Anbindung an SharePoint, Entra ID und Power Automate

---

## Inhalt

1. [Zweck und Ablauf](#1-zweck-und-ablauf)
2. [Architektur](#2-architektur)
3. [Dateien und ihre Aufgabe](#3-dateien-und-ihre-aufgabe)
4. [Datenmodell](#4-datenmodell)
5. [Anmeldung und Berechtigungen](#5-anmeldung-und-berechtigungen)
6. [Zugriff auf die Daten über Microsoft Graph](#6-zugriff-auf-die-daten-über-microsoft-graph)
7. [Power Automate Flows](#7-power-automate-flows)
8. [Eingebundene Bibliotheken](#8-eingebundene-bibliotheken)
9. [Sicherheitsheader und Content Security Policy](#9-sicherheitsheader-und-content-security-policy)
10. [Fallstricke, die Zeit kosten](#10-fallstricke-die-zeit-kosten)
11. [Lokale Entwicklung und Test](#11-lokale-entwicklung-und-test)
12. [Alle Kennungen auf einen Blick](#12-alle-kennungen-auf-einen-blick)

---

## 1. Zweck und Ablauf

Kursteilnehmende am Campus Sursee wählen ihr Mittagsmenü im Restaurant BAULÜÜT über eine Webseite statt auf einem Papierblatt.

1. Die Réception legt in der Verwaltung eine «Klasse» an: Kursname, Firma, Datum, Essenszeit. Ein achtstelliger Zugangscode entsteht automatisch.
2. Die Teilnehmenden erhalten den Gästelink oder ein Blatt mit QR-Code.
3. Am Tag des Mittagessens wählen sie Vorspeise und Hauptgang, geben Namen und allfällige Allergien an.
4. Die Küche erhält das gedruckte Menüblatt mit allen Bestellungen.

---

## 2. Architektur

Das ganze System ist eine **statische Webseite**. Es gibt keinen eigenen Server und keine eigene Datenbank.

```
Gäste (kein Konto im Mandanten)      Réception (Microsoft-365-Konto)
            |                                     |
       index.html            admin.html / kursblatt.html / menueblatt.html
            |                                     |
            | anonym                              | Entra ID, Anmeldung per MSAL
            v                                     v
    Flow B  +  Flow C                     Microsoft Graph
            |                                     |
            +-------> SharePoint «Reception» <----+
                   Listen Klassen und Bestellungen

    Flow B holt zusätzlich die Tagesmenüs von Lunchgate.
    menueblatt.html ruft Flow B nur noch dafür auf.
```

**Warum diese Zweiteilung:** Kursteilnehmende haben kein Konto im Mandanten. Ihre Seite muss ohne Anmeldung funktionieren, deshalb läuft sie über zwei anonym erreichbare Power-Automate-Flows. Die Réception hat ein Konto, dort ist eine echte Anmeldung möglich und richtig; diese Seiten sprechen direkt mit SharePoint.

**Warum Flow B trotzdem bleibt:** Die Lunchgate-API verlangt Basic Authentication und sendet keine CORS-Freigaben. Ein Aufruf direkt aus dem Browser ist damit nicht möglich, und die Zugangsdaten dürften ohnehin nicht im Quelltext stehen. Flow B ist deshalb weiterhin die einzige Stelle, welche die Tagesmenüs holt.

**Historie:** Bis zum 28.08.2026 lief die Verwaltung als Power-Apps-Canvas-App (App-ID `5994926d-2710-4847-9482-ed976014a26c`). Sie wurde vollständig durch `admin.html` abgelöst und soll gelöscht werden. Ein geplanter vierter Flow «API Bestellungen laden» wurde nie gebaut und wird nicht mehr gebraucht.

---

## 3. Dateien und ihre Aufgabe

Alles im Ordner `frontend\` ist genau das, was auf Netlify liegt.

| Datei | Aufgabe | Anmeldung nötig |
|---|---|---|
| `index.html` | Gästeseite, Menüwahl | nein |
| `admin.html` | Verwaltung der Klassen | ja |
| `kursblatt.html` | Aushang mit QR-Code, Aufruf mit `?klasse=CODE` | ja |
| `menueblatt.html` | Bestellübersicht für die Küche, Aufruf mit `?klasse=CODE` | ja |
| `konfig.js` | sämtliche Kennungen und Adressen an einer Stelle | |
| `auth.js` | Anmeldung an Entra ID, dünner Aufsatz auf MSAL | |
| `graph.js` | Zugriff auf die SharePoint-Listen, dazu Datums- und Codehilfen | |
| `_headers` | Sicherheitsheader und Content Security Policy für Netlify | |

Jede Seite trägt ihr HTML, CSS und JavaScript in einer einzigen Datei. Geteilt werden nur die drei `.js`-Module. Das ist Absicht: Die Seiten sollen sich einzeln öffnen, verstehen und ändern lassen.

**Gestaltung:** Weiss, minimal, vier CSS-Variablen (`--orange #E8722A`, `--schwarz #111111`, `--grau #767676`, `--linie #ebebeb`), Systemschriften, Radien von 10px. Das Logo ist ein Inline-SVG, es wird nichts nachgeladen.

**Veröffentlichen:** Netlify, Ordner `frontend` per Drag & Drop auf die bestehende Site ziehen (Deploys, dann Drag & Drop). Es gibt keine Git-Anbindung und keine automatische Veröffentlichung.

---

## 4. Datenmodell

SharePoint-Site **«Reception»**: `https://campussursee.sharepoint.com/sites/hot-reze`

### Liste «Klassen»

| Interner Feldname | Typ | Verwendung |
|---|---|---|
| `Title` | Text | Kursname, in der Oberfläche «Titel» |
| `Firma` | Text | Auftraggeber, erscheint auf beiden Druckblättern |
| `Datum` | DateTime | Kurstag. Siehe die Datumsfalle in Abschnitt 10 |
| `Essenszeit` | Text | Format `HH:MM`, zum Beispiel `12:00` |
| `Code` | Text | achtstelliger Zugangscode, Alphabet ohne 0, O, 1 und I |
| `Status` | Choice | `offen` oder `geschlossen` |
| `Suppe`, `Salat`, `Menu1`, `Menu2`, `Dessert` | Text bzw. Notiz | Rückfallwerte, falls Lunchgate nichts liefert |
| `Menu1Preis`, `Menu2Preis`, `Bemerkung` | | derzeit von der Webseite nicht benutzt |

### Liste «Bestellungen»

| Interner Feldname | Typ | Verwendung |
|---|---|---|
| `Title` | Text | technisch nötig, inhaltlich ohne Bedeutung |
| `KlasseID` | Zahl | Verweis auf die Klasse. **Die einzige Zuordnung, die zählt** |
| `KlasseCode` | Text | Kopie des Codes, nur zur Nachvollziehbarkeit |
| `Vorname`, `Nachname` | Text | |
| `Vorspeise` | Choice | `Suppe`, `Salat` oder `Keine` |
| `Hauptgang` | Choice | `Menü 1` oder `Menü 2` |
| `Bemerkung` | Text | **Allergien und Unverträglichkeiten**, maximal 200 Zeichen |
| `Created` | | automatisch von SharePoint |

> **Wichtig:** Die Liste «Bestellungen» hat **keine eigene Datumsspalte**. Der Bezug zum Kurstag entsteht ausschliesslich über `KlasseID`. Wer eine Klasse löscht, kappt diesen Bezug: Die Bestellungen bleiben als verwaiste Einträge stehen, bis der Aufräum-Flow sie nach 30 Tagen entfernt.

---

## 5. Anmeldung und Berechtigungen

App-Registrierung **«Menuewahl BAULUUT Admin»** im Mandanten `2553fb74-5dcc-4072-8bb5-399d18f72af9`.
Client-ID: `9d344eb0-8af8-44d1-ad64-916d564e5975`

Die Einrichtung Schritt für Schritt steht in `04_Einrichtung_und_Deployment.md`.

**Verfahren:** OAuth 2.0 Authorization Code Flow mit PKCE, ausgeführt von **MSAL** (`@azure/msal-browser`). `auth.js` ist nur die Übersetzung in vier Funktionen:

```js
await Auth.anmeldungSicherstellen()  // löst mit {name, adresse} auf, oder leitet zur Anmeldung um
await Auth.token()                   // gültiges Zugriffstoken, erneuert sich still
Auth.konto()                         // {name, adresse} oder null
await Auth.abmelden()
```

Punkte, die man kennen muss:

- **Plattform muss «Single-Page-Anwendung» sein**, nicht «Web». Nur dort erlaubt Microsoft den Tokentausch direkt aus dem Browser. Bei falscher Einstellung kommt `AADSTS9002326`.
- **Kein Clientgeheimnis.** Single-Page-Anwendungen haben keines und brauchen keines. Client-ID und Mandanten-ID stehen im öffentlich lesbaren Quelltext; das sind Kennungen, keine Geheimnisse.
- **Je Seite eine eigene Umleitungsadresse**, weil sich jede Seite auf ihrer eigenen Adresse anmeldet. Ohne Abfragezeichenfolge: MSAL merkt sich die vollständige Adresse selbst und kehrt am Ende samt `?klasse=CODE` dorthin zurück.
- **Berechtigung:** delegiert `Sites.ReadWrite.All` und `User.Read`, mit Administratorzustimmung. *Delegiert* heisst, das Token kann nur das, was die angemeldete Person in SharePoint ohnehin darf. Wer keinen Zugriff auf die Site «Reception» hat, bekommt über diese Seiten auch keinen.
- **Der eigentliche Türsteher** ist nicht die Anmeldung, sondern die Unternehmensanwendung: «Zuweisung erforderlich = Ja», danach nur die Réception zuweisen. Ohne Entra ID P1 lassen sich nur einzelne Personen zuweisen, keine Gruppen. Das muss bei Personalwechsel von Hand nachgeführt werden.
- **Token liegen im `sessionStorage`.** Beim Schliessen des Tabs sind sie weg. Ein Tab, der aus der Verwaltung heraus geöffnet wird, erbt den Speicher, deshalb verlangen die Druckblätter in der Regel keine zweite Anmeldung.

---

## 6. Zugriff auf die Daten über Microsoft Graph

`graph.js` kapselt alles. Die Seiten sprechen nie direkt mit Graph.

```js
await Graph.klassen()                       // alle Klassen, absteigend nach Datum
await Graph.klasseNachCode(code)            // eine Klasse, oder null
await Graph.klasseAnlegen({titel, firma, datum, essenszeit, code, status})
await Graph.klasseAendern(id, {...})
await Graph.klasseLoeschen(id)
await Graph.bestellungen(klasseId)          // ohne Argument: alle
await Graph.bestellungLoeschen(id)
Graph.zaehler(liste)                        // {total, suppe, salat, keine, menu1, menu2}
await Graph.menuetexte(code)                // Tagesmenüs aus Flow B, oder null
await Graph.ich()

Hilfe.heute()          // "2026-08-28"
Hilfe.datumAusSp(wert) // SharePoint-Zeitstempel -> "2026-08-28"
Hilfe.datumFuerSp(ymd) // "2026-08-28" -> "2026-08-28T12:00:00Z"
Hilfe.datumText(ymd)   // "Freitag, 28.08.2026"
Hilfe.datumKurz(ymd)   // "28.08.2026"
Hilfe.neuerCode()      // acht Zeichen, ohne 0/O/1/I
Hilfe.gastLink(code)   // vollständiger Gästelink
```

**Verwendete Endpunkte**

```
GET    /v1.0/sites/{siteId}/lists/{listId}/items?$select=id,createdDateTime&$expand=fields($select=...)&$top=999
POST   /v1.0/sites/{siteId}/lists/{listId}/items          { "fields": { ... } }
PATCH  /v1.0/sites/{siteId}/lists/{listId}/items/{id}/fields
DELETE /v1.0/sites/{siteId}/lists/{listId}/items/{id}
```

**Zwei bewusste Entscheidungen:**

*Es wird immer die ganze Liste geholt und im Browser gefiltert.* Serverseitige `$filter` auf Listenspalten setzen in SharePoint einen Spaltenindex voraus und scheitern sonst sporadisch, was schwer zu diagnostizieren ist. Dank der Aufbewahrung von 30 Tagen sind es höchstens ein paar hundert Einträge; das trägt problemlos. Folgeseiten über `@odata.nextLink` werden berücksichtigt.

*Die Feldauswahl hat einen Rückfall.* Schlägt eine Abfrage mit `$expand=fields($select=...)` mit HTTP 400 fehl, etwa weil eine Spalte umbenannt wurde, wird automatisch ohne Feldauswahl wiederholt. Das System bleibt so auch nach einer Umbenennung benutzbar.

**Fehlermeldungen** werden in `graph.js` in Klartext übersetzt, statt rohe Graph-Meldungen zu zeigen: HTTP 401 auf abgelaufene Anmeldung, 403 auf fehlenden Zugriff auf die Site «Reception», 404 auf falsche Kennungen in `konfig.js`, 429 auf zu viele Anfragen.

---

## 7. Power Automate Flows

Umgebung `Default-2553fb74-5dcc-4072-8bb5-399d18f72af9`, alle Flows laufen unter **powerplatform@campus-sursee.ch**.

| Flow | Aufgabe | Wer ruft ihn auf |
|---|---|---|
| **API Klasse laden** (Flow B) | GET, liefert Klassendaten und die Tagesmenüs | `index.html` sowie `menueblatt.html`, dort nur für die Menütexte |
| **API Bestellung speichern** (Flow C) | POST, speichert eine Bestellung | nur `index.html` |
| **Aufraeumen Menuewahl** | täglich 03:00, löscht Klassen und Bestellungen älter als 30 Tage | Zeitplan, Flow-ID `063e1fa8-494b-4274-9402-608e88d59889` |

Die Aufruf-Adressen samt Signatur stehen in `frontend\konfig.js` und im Kopf von `index.html`. Sie gehören nicht in dieses Dokument.

**Antwort von Flow B**

```json
{"ok":true,"offen":true,"klasse":"...","firma":"...","datum":"2026-08-28",
 "datumText":"Freitag, 28.08.2026","essenszeit":"12:00",
 "suppe":"...","salat":"...","menu1":"...\n...","menu2":"...","dessert":"..."}
```

**Lunchgate-Anbindung** (innerhalb von Flow B)

- `GET https://api2.lunchgate.ch/restaurant/menu?restaurant_id=5081&response=json`, Basic Authentication
- **Kein `&limit=1` anhängen.** Sonst liefert die Schnittstelle nur `key_0` und Menü 2, Vorspeisen und Dessert bleiben leer.
- Verfassen-Aktionen: `M1` = `key_0.title` + Zeilenumbruch + `line2`, `M2` = `key_1.title` + Zeilenumbruch + `line2`, `P3` = `key_2.line2`, `Dess` = `key_2.line3`. Leere Felder kommen als `{}` zurück, daher der `'{}'`-Test in den Ausdrücken.
- Die Vorspeisenzeile `P3` wird am Wort « oder » in Suppe und Salat zerlegt. **Das ist fragil:** Schreibt die Küche die Zeile anders, landet alles im Feld Suppe. Ein Fehler in den Menütexten hat oft hier seine Ursache.
- Alle Menüfelder haben einen `if(empty(...))`-Rückfall auf die SharePoint-Spalten der Klasse.

---

## 8. Eingebundene Bibliotheken

Grundsatz seit dem 28.08.2026: **so wenig selbstgebauter Code wie möglich.**

| Bibliothek | Version | Aufgabe | Wo eingebunden |
|---|---|---|---|
| `@azure/msal-browser` | 4.30.0 | Anmeldung an Entra ID | `admin.html`, `kursblatt.html`, `menueblatt.html` |
| `qrcode-generator` | 1.4.4 | QR-Code | `kursblatt.html` |

Beide kommen von `cdn.jsdelivr.net`, sind auf eine feste Fassung genagelt und mit `integrity="sha384-..."` gegen unbemerkten Austausch abgesichert. Wer eine Version anhebt, muss die Prüfsumme mitziehen, sonst verweigert der Browser das Laden:

```
curl -sL <URL> | openssl dgst -sha384 -binary | openssl base64 -A
```

**Der Preis:** Anmeldung und Kursblatt setzen voraus, dass der CDN erreichbar ist. Beide Seiten melden einen Ausfall im Klartext, statt leer zu bleiben. Frühere Eigenbauten, ein QR-Encoder von rund 380 Zeilen und ein PKCE-Ablauf von rund 230 Zeilen, sind dafür entfallen.

---

## 9. Sicherheitsheader und Content Security Policy

Die Datei `_headers` wird von Netlify ausgewertet und setzt für alle Seiten:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` und `frame-ancestors 'none'`, die Seiten lassen sich nicht in fremde Seiten einbetten
- `Referrer-Policy: no-referrer`
- eine Content Security Policy mit `default-src 'none'`

Freigegeben ist nur, was wirklich gebraucht wird:

| Richtung | Freigabe | Wofür |
|---|---|---|
| `script-src` | `'self' 'unsafe-inline' cdn.jsdelivr.net` | die Seiten tragen ihr JavaScript inline, dazu die beiden Bibliotheken |
| `style-src` | `'self' 'unsafe-inline'` | CSS steht ebenfalls inline |
| `img-src` | `'self' data: baulueuet.ch` | nur das Favicon kommt von aussen |
| `connect-src` | Graph, `login.microsoftonline.com`, der Power-Automate-Host | Datenzugriff und Anmeldung |
| `frame-src` | `login.microsoftonline.com` | MSAL erneuert Token in einem verborgenen Rahmen |

> Wird eine dieser Adressen je geändert, muss sie hier nachgeführt werden. Sonst blockiert der Browser den Aufruf **stillschweigend**, und die Seite bleibt ohne erkennbare Ursache leer.

---

## 10. Fallstricke, die Zeit kosten

**Die Datumsfalle.** Je nachdem, womit ein Eintrag angelegt wurde, steht in `Datum` entweder `2026-08-27T22:00:00Z` (von der alten Power App, Mitternacht Ortszeit) oder `2026-08-28T12:00:00Z` (neu geschrieben) für **denselben** Kurstag. `Hilfe.datumAusSp()` rechnet deshalb immer über die lokale Zeitzone um und nie über die ersten zehn Zeichen der Zeichenkette. Wer das vereinfacht, verschiebt alle Altbestände um einen Tag. Beim Schreiben wird bewusst Mittag UTC gesetzt, damit jede Zeitzonenverschiebung auf demselben Tag landet.

**Die QR-Falle.** `createSvgTag({ margin: n })` zählt in SVG-Einheiten, nicht in Modulen. Bei `cellSize: 2` sind die von der Norm verlangten vier Module Ruhezone also `margin: 8`. Mit `margin: 0` fehlt die Ruhezone ganz, und weil direkt unter dem Symbol der Linktext folgt, verweigern Scanner den Code dann leicht. Im Druck ergibt die richtige Einstellung ein Symbol von 62.8 mm im Rahmen von 78 mm.

**Auswahlspalten.** `Vorspeise`, `Hauptgang` und `Status` sind Choice-Spalten. Graph liefert sie je nach Konfiguration als Text oder als Objekt mit `Value`. `graph.js` fängt beides ab.

**Registrierte Umleitungsadressen lassen sich nicht durch blosses Aufrufen prüfen.** Ruft man den `authorize`-Endpunkt mit einer nicht registrierten Adresse auf, erscheint trotzdem zuerst die Anmeldemaske; der Fehler kommt erst nach der Anmeldung. Ein solcher Test beweist also nichts. Der erste echte Login ist der Beleg.

**Power Automate Designer**, weiterhin gültig für Flow B und C:
- Der Ausdruck-Editor meldet oft fälschlich «Der Ausdruck ist ungültig». Abhilfe: in den Ausdruck klicken, Taste `End`, dann nochmals «Hinzufügen» oder «Aktualisieren». Änderungen danach **immer** in der Codeansicht der Aktion nachprüfen, sie gehen sonst still verloren.
- «Die Verbindung für X wurde unterbrochen» blockiert das Speichern, auch wenn die Verbindungsübersicht alles als verbunden zeigt. Half hier: Verbindung im Designer neu auswählen, Designer neu laden, Flow neu aufbauen.
- Ein nie gespeicherter Entwurf ist unwiederbringlich weg.

**Zwischenablage.** «Link kopieren» braucht einen sicheren Kontext. Über HTTPS und über `localhost` ist das gegeben, für ältere Browser fängt ein Ersatzweg über `execCommand` ab.

---

## 11. Lokale Entwicklung und Test

Auf dem Arbeitsplatz sind weder Node noch Python installiert. Geprüft wird im Browser.

```
powershell -ExecutionPolicy Bypass -File code\serve.ps1
```

Danach läuft ein Server auf `http://localhost:8123/`.

**Jede Seite kennt `?mock=1`.** Damit arbeitet sie mit erfundenen Daten, ohne Anmeldung und ohne Netzwerk. Das ist der schnellste Weg, eine Änderung an der Darstellung zu prüfen.

| Adresse | Zeigt |
|---|---|
| `localhost:8123/index.html?mock=1` | Gästeseite mit Testmenü |
| `localhost:8123/index.html?mock=1&falschertag=1` | Gästeseite am falschen Tag |
| `localhost:8123/admin.html?mock=1` | Verwaltung mit vier Klassen, Anlegen, Ändern und Löschen funktionieren im Speicher |
| `localhost:8123/kursblatt.html?mock=1` | Kursblatt mit QR-Code |
| `localhost:8123/menueblatt.html?mock=1` | Menüblatt mit acht Bestellungen |

Für Tests mit echter Anmeldung müssen die drei `localhost:8123`-Adressen in der App-Registrierung als Umleitungsadressen eingetragen sein.

---

## 12. Alle Kennungen auf einen Blick

| Was | Wert |
|---|---|
| Gästeseite | `https://menue.campus-sursee.ch` |
| Verwaltung | `https://menue.campus-sursee.ch/admin.html` |
| SharePoint-Site | `https://campussursee.sharepoint.com/sites/hot-reze` |
| Site-ID | `campussursee.sharepoint.com,141d7dcf-e2f2-4273-8b14-af04a092ccb8,ac91aebb-2f75-4dd3-bdc4-6b26858f1d2b` |
| Liste «Klassen» | `966a62ea-0ec5-4054-80a2-9a52d7b32483` |
| Liste «Bestellungen» | `19bef1ed-a806-4a5b-bdb5-c869f7d2a582` |
| Mandanten-ID | `2553fb74-5dcc-4072-8bb5-399d18f72af9` |
| Client-ID der App-Registrierung | `9d344eb0-8af8-44d1-ad64-916d564e5975` |
| Power-Automate-Umgebung | `Default-2553fb74-5dcc-4072-8bb5-399d18f72af9` |
| Aufräum-Flow | `063e1fa8-494b-4274-9402-608e88d59889` |
| Alte Power App, abgelöst | `5994926d-2710-4847-9482-ed976014a26c` |
| Lunchgate | `restaurant_id` 5081 |
| Testklasse | Code `TEST1234` |

Zugangsdaten und Aufruf-Adressen mit Signatur stehen bewusst nicht hier, sondern in `frontend\konfig.js` beziehungsweise bei den Betriebskonten.
