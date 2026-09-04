# Technische Dokumentation: Menüwahl Restaurant BAULÜÜT

**Stand:** 04.09.2026
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
7.1 [Annahmeschluss 10:00 Uhr](#71-annahmeschluss-1000-uhr)
8. [Eingebundene Bibliotheken](#8-eingebundene-bibliotheken)
9. [Sicherheitsheader und Content Security Policy](#9-sicherheitsheader-und-content-security-policy)
10. [Fallstricke, die Zeit kosten](#10-fallstricke-die-zeit-kosten)
11. [Lokale Entwicklung und Test](#11-lokale-entwicklung-und-test)
12. [Alle Kennungen auf einen Blick](#12-alle-kennungen-auf-einen-blick)

---

## 1. Zweck und Ablauf

Kursteilnehmende am Campus Sursee wählen ihr Mittagsmenü im Restaurant BAULÜÜT über eine Webseite statt auf einem Papierblatt.

1. Die Réception legt in der Verwaltung einen «Termin» an: Kursname, Firma, Datum, Essenszeit und, wenn bekannt, die erwartete Teilnehmerzahl. Ein achtstelliger Zugangscode entsteht automatisch.
2. Die Teilnehmenden erhalten den Gästelink oder ein Blatt mit QR-Code. Den Link auf das Kursblatt kann die Réception auch der Kursleitung schicken, er verlangt keine Anmeldung.
3. Am Tag des Mittagessens wählen sie **bis 10:00 Uhr** Vorspeise und Hauptgang, geben Namen und allfällige Allergien an. Danach ist weder Bestellen noch Ändern möglich, beides läuft über die Réception.
4. Die Küche erhält das gedruckte Menüblatt mit allen Bestellungen.

Wie viele Kurse an welchem Tag anstehen, zeigt `admin.html` in der linken Spalte: die Termine stehen dort nach Kurstag gruppiert, gefiltert über die Schaltfläche «Filter».

---

## 2. Architektur

Das ganze System ist eine **statische Webseite**. Es gibt keinen eigenen Server und keine eigene Datenbank.

```
Gäste und Kursleitung                Réception (Microsoft-365-Konto)
(kein Konto im Mandanten)
            |                                     |
  index.html + kursblatt.html          admin.html / menueblatt.html
            |                                     |
            | anonym                              | Entra ID, Anmeldung per MSAL
            v                                     v
    Flow B  +  Flow C                     Microsoft Graph
            |                                     |
            +-------> SharePoint «Reception» <----+
                   Listen Klassen und Bestellungen

    Flow B holt zusätzlich die Tagesmenüs von Lunchgate.
    menueblatt.html ruft Flow B nur noch dafür auf.
    kursblatt.html hält den Weg über Graph als Rückfall bereit, geht ihn
    aber nur auf Knopfdruck.
```

**Warum diese Zweiteilung:** Kursteilnehmende haben kein Konto im Mandanten. Ihre Seite muss ohne Anmeldung funktionieren, deshalb läuft sie über zwei anonym erreichbare Power-Automate-Flows. Die Réception hat ein Konto, dort ist eine echte Anmeldung möglich und richtig; diese Seiten sprechen direkt mit SharePoint.

**Warum Flow B trotzdem bleibt:** Die Lunchgate-API verlangt Basic Authentication und sendet keine CORS-Freigaben. Ein Aufruf direkt aus dem Browser ist damit nicht möglich, und die Zugangsdaten dürften ohnehin nicht im Quelltext stehen. Flow B ist deshalb weiterhin die einzige Stelle, welche die Tagesmenüs holt.

**Historie:** Bis zum 28.08.2026 lief die Verwaltung als Power-Apps-Canvas-App (App-ID `5994926d-2710-4847-9482-ed976014a26c`). Sie wurde vollständig durch `admin.html` abgelöst und soll gelöscht werden. Ein geplanter vierter Flow «API Bestellungen laden» wurde nie gebaut und wird nicht mehr gebraucht.

---

## 3. Dateien und ihre Aufgabe

Alles im Ordner `frontend\` ist genau das, was bei Cloudflare Pages liegt.

| Datei | Aufgabe | Anmeldung nötig |
|---|---|---|
| `index.html` | Gästeseite, Menüwahl | nein |
| `kursblatt.html` | Aushang mit QR-Code, Aufruf mit `?klasse=CODE` | nein, siehe Abschnitt 6.1 |
| `admin.html` | Verwaltung der Termine, nach Kurstag gruppiert | ja |
| `menueblatt.html` | Bestellübersicht für die Küche, Aufruf mit `?klasse=CODE` | ja |
| `konfig.js` | sämtliche Kennungen und Adressen an einer Stelle | |
| `auth.js` | Anmeldung an Entra ID, dünner Aufsatz auf MSAL | |
| `graph.js` | Zugriff auf die SharePoint-Listen, dazu Datums- und Codehilfen | |
| `_headers` | Sicherheitsheader und Content Security Policy für Cloudflare Pages | |

Jede Seite trägt ihr HTML, CSS und JavaScript in einer einzigen Datei. Geteilt werden nur die drei `.js`-Module. Das ist Absicht: Die Seiten sollen sich einzeln öffnen, verstehen und ändern lassen.

**Gestaltung:** Weiss, minimal, vier CSS-Variablen (`--orange #E8722A`, `--schwarz #111111`, `--grau #767676`, `--linie #ebebeb`), Systemschriften, Radien von 10px. Das Logo ist ein Inline-SVG, es wird nichts nachgeladen.

**Veröffentlichen:** Cloudflare Pages, angebunden an das Git-Repository. Ein Push auf `main` veröffentlicht automatisch. Welcher Ordner ausgeliefert wird, steht in `wrangler.toml` im Wurzelverzeichnis (`pages_build_output_dir = "frontend"`); gebaut wird nichts, das Feld «Build command» in der Cloudflare-Oberfläche bleibt leer. Siehe `04_Einrichtung_und_Deployment.md`, Abschnitt 4.

**Adressen ohne `.html`:** Cloudflare Pages beantwortet `/admin.html` mit einer Umleitung (308) auf `/admin` und hängt die Abfragezeichenfolge unverändert an. Bestehende Links und QR-Codes funktionieren deshalb weiter. Folge für die Anmeldung: `auth.js` benutzt als Umleitungsadresse `location.origin + location.pathname`, also die Adresse **ohne** Endung. Genau diese muss in der App-Registrierung stehen, siehe `04_Einrichtung_und_Deployment.md`, Abschnitt 2.2.

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
| `Status` | Choice | `offen` oder `geschlossen`. Von der Verwaltung nur noch beim Anlegen auf `offen` gesetzt, siehe unten |
| `Teilnehmer` | Zahl | erwartete Teilnehmerzahl, darf leer sein. Reiner Massstab, schränkt nichts ein |
| `Suppe`, `Salat`, `Menu1`, `Menu2`, `Dessert` | Text bzw. Notiz | Rückfallwerte, falls Lunchgate nichts liefert |
| `Menu1Preis`, `Menu2Preis`, `Bemerkung` | | derzeit von der Webseite nicht benutzt |

> **Spalte `Teilnehmer` (seit 04.09.2026).** Zahlenspalte, Vorgabewert leer, nicht erforderlich. Fehlt sie in der Liste, läuft die Verwaltung weiter: Der Aufruf mit Feldauswahl scheitert dann mit HTTP 400, `alleElemente` in `graph.js` wiederholt ihn ohne Auswahl, und `erwartet` bleibt 0 — die Verwaltung zeigt dann nur die tatsächlichen Bestellungen. **Speichern** schlägt in diesem Fall allerdings fehl, weil Graph ein unbekanntes Feld ablehnt. Die Spalte ist also anzulegen, bevor die neue Fassung veröffentlicht wird.
>
> Leer und `0` sind bewusst nicht dasselbe: Leer heisst «noch nicht bekannt» und die Verwaltung zeigt gar keinen Massstab; eine `0` hiesse «niemand wird erwartet». Ein geleertes Formularfeld schreibt deshalb `null` in die Spalte, nicht `0`.

> **Zum `Status`.** Die Verwaltung setzt ihn beim Anlegen einmalig auf `offen` und fasst ihn danach nicht mehr an; die Marke «Bestellung offen» und der Punkt in der Liste sind seit dem 04.09.2026 entfernt, siehe `05_Entscheide_und_Verlauf.md`, Abschnitt 5d. Flow B liest die Spalte weiterhin und meldet der Gästeseite `offen: false`, wenn dort `geschlossen` steht. Wer einen Termin vorzeitig schliessen will, tut das direkt in der SharePoint-Liste.

**Nachvollziehbarkeit ohne eigene Spalten.** Wer eine Klasse angelegt und wer sie zuletzt geändert hat, führt SharePoint für jeden Listeneintrag von selbst mit. Die Verwaltung liest diese Angaben über die Eigenschaften des Listenelements, nicht über Listenspalten:

| Graph-Eigenschaft | Zeigt |
|---|---|
| `createdDateTime` | Zeitpunkt des Anlegens |
| `createdBy.user.displayName` | wer angelegt hat |
| `lastModifiedDateTime` | Zeitpunkt der letzten Änderung |
| `lastModifiedBy.user.displayName` | wer zuletzt geändert hat |

Das ist bewusst so gewählt: Es braucht keine neue Spalte, keine Migration, und die Werte lassen sich über die Oberfläche nicht fälschen. Wird eine Klasse durch einen Flow angefasst, steht dort dessen Name statt einer Person. In `graph.js` heissen die Felder `erstellt`, `erstelltVon`, `geaendert` und `geaendertVon`; `admin.html` zeigt sie als kleine graue Zeile unter dem Klassenkopf.

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
- **Je Seite eine eigene Umleitungsadresse**, weil sich jede Seite auf ihrer eigenen Adresse anmeldet. Ohne Abfragezeichenfolge: MSAL merkt sich die vollständige Adresse selbst und kehrt am Ende samt `?klasse=CODE` dorthin zurück. Nötig sind `admin.html`, `menueblatt.html` und weiterhin `kursblatt.html` für dessen Rückfallweg. Der Eintrag für `termine.html` darf stehen bleiben oder entfernt werden; die Seite gibt es seit dem 04.09.2026 nicht mehr.
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
await Graph.klasseOeffentlich(code)         // Klasse über Flow B, ohne Anmeldung, oder null
await Graph.menuetexte(code)                // Tagesmenüs aus Flow B, oder null
await Graph.ich()

Hilfe.heute()               // "2026-08-28"
Hilfe.datumAusSp(wert)      // SharePoint-Zeitstempel -> "2026-08-28"
Hilfe.datumFuerSp(ymd)      // "2026-08-28" -> "2026-08-28T12:00:00Z"
Hilfe.datumText(ymd)        // "Freitag, 28.08.2026"
Hilfe.datumKurz(ymd)        // "28.08.2026"
Hilfe.zeitstempelKurz(iso)  // "28.08.2026, 14:23", für die Spur in der Verwaltung
Hilfe.neuerCode()           // acht Zeichen, ohne 0/O/1/I
Hilfe.gastLink(code)        // vollständiger Gästelink
Hilfe.kursblattLink(code)   // vollständiger Kursblatt-Link
Hilfe.annahmeschlussStunde() // 10
Hilfe.annahmeschlussText()   // "10:00"
```

**Verwendete Endpunkte**

```
GET    /v1.0/sites/{siteId}/lists/{listId}/items
         ?$select=id,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy
         &$expand=fields($select=...)&$top=999
POST   /v1.0/sites/{siteId}/lists/{listId}/items          { "fields": { ... } }
PATCH  /v1.0/sites/{siteId}/lists/{listId}/items/{id}/fields
DELETE /v1.0/sites/{siteId}/lists/{listId}/items/{id}
```

**Zwei bewusste Entscheidungen:**

*Es wird immer die ganze Liste geholt und im Browser gefiltert.* Serverseitige `$filter` auf Listenspalten setzen in SharePoint einen Spaltenindex voraus und scheitern sonst sporadisch, was schwer zu diagnostizieren ist. Dank der Aufbewahrung von 30 Tagen sind es höchstens ein paar hundert Einträge; das trägt problemlos. Folgeseiten über `@odata.nextLink` werden berücksichtigt.

*Die Feldauswahl hat einen Rückfall.* Schlägt eine Abfrage mit `$expand=fields($select=...)` mit HTTP 400 fehl, etwa weil eine Spalte umbenannt wurde, wird automatisch ohne Feldauswahl wiederholt. Derselbe Rückfall reduziert auch das `$select` auf dem Listenelement wieder auf `id,createdDateTime`. Verweigert Graph die Auswahl von `createdBy` und `lastModifiedBy` also je, laden die Seiten trotzdem; es fehlt dann nur die Spur «erstellt von / geändert von» in der Verwaltung.

**Fehlermeldungen** werden in `graph.js` in Klartext übersetzt, statt rohe Graph-Meldungen zu zeigen: HTTP 401 auf abgelaufene Anmeldung, 403 auf fehlenden Zugriff auf die Site «Reception», 404 auf falsche Kennungen in `konfig.js`, 429 auf zu viele Anfragen.

### 6.1 Das Kursblatt ohne Anmeldung

`kursblatt.html` lädt seine Klassendaten über `Graph.klasseOeffentlich(code)`, also anonym über Flow B, dieselbe Quelle wie die Gästeseite. Es meldet sich beim Laden **nicht** an.

Der Grund ist fachlich: Die Réception soll den Link der Kursleitung schicken können, damit diese das Blatt selbst ausdruckt. Eine Weiterleitung auf `login.microsoftonline.com` wäre für eine Person ohne Konto im Mandanten eine Sackgasse.

Preisgegeben werden Kursname, Firma, Datum und Essenszeit, und nur an jemanden, der den achtstelligen Code bereits kennt. Genau diese Angaben stehen ohnehin auf dem Aushang, und derselbe Code öffnet über die Gästeseite bereits mehr. Bestellungen sind über diesen Weg nicht erreichbar; Flow B liefert sie nicht.

Der Weg über Microsoft Graph bleibt als Rückfall bestehen, falls Flow B einmal nicht antwortet, wird aber nie von selbst eingeschlagen. Stattdessen erscheint die Fehlerkarte «Kursblatt nicht abrufbar» mit dem Knopf **«Mit Konto anmelden»**; erst der Klick löst `Auth.anmeldungSicherstellen()` und `Graph.klasseNachCode()` aus. Die Umleitungsadresse für `kursblatt.html` muss deshalb in der App-Registrierung eingetragen bleiben.

> **Geprüft am 04.09.2026:** Flow B liefert Klassen mit ihrem eigenen Datum, auch wenn dieses nicht der laufende Tag ist. Ein Aufruf mit der Testklasse `TEST1234` gab `"datum":"2026-08-27"` zurück, also einen vergangenen Tag. Das im Voraus gedruckte Kursblatt stimmt damit für jedes Kursdatum. Das war die offene Frage, die früher gegen Flow B sprach; siehe `05_Entscheide_und_Verlauf.md`, Abschnitt 5.

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

## 7.1 Annahmeschluss 10:00 Uhr

Die Menüwahl ist am Kurstag bis 10:00 Uhr offen. Danach zeigt `index.html`:

| Lage | Anzeige |
|---|---|
| Bestellung liegt vor | Bestätigung wie bisher, aber ohne den Knopf «Auswahl bearbeiten». An seiner Stelle der Hinweis, sich für Änderungen an die Réception zu wenden |
| keine Bestellung | die Karte «Menüwahl geschlossen» mit demselben Verweis auf die Réception |

Umgesetzt ist das in `index.html`:

- `ANNAHMESCHLUSS` ist die volle Stunde in Ortszeit, `annahmeschlussVorbei()` die einzige Stelle, die vergleicht.
- Geprüft wird an drei Stellen: beim Laden, beim Zeichnen der Bestätigung und **nochmals beim Absenden**. Die dritte Prüfung fängt den Fall ab, dass das Formular über 10:00 Uhr hinaus offen liegt.
- `fristUeberwachen()` plant zusätzlich einen einzelnen `setTimeout` auf den Zeitpunkt selbst. Wer die Seite um 09:58 öffnet, sieht um 10:00 von selbst die geschlossene Ansicht, ohne neu zu laden.
- Im Mock-Modus lässt sich der Zustand mit `?mock=1&spaet=1` beziehungsweise `&spaet=0` erzwingen. Ohne diesen Schalter wäre je nach Tageszeit nur eine der beiden Ansichten zu sehen.

> **Diese Prüfung läuft im Browser und ist keine Sperre im Sinne der Sicherheit.**
> Flow C nimmt eine Bestellung weiterhin an, wenn jemand ihn von Hand aufruft. Für den Zweck genügt das: Es geht darum, den Ablauf für die Küche verlässlich zu machen, nicht darum, Missbrauch abzuwehren, und wer den Code kennt, könnte ohnehin bestellen (siehe `05_Entscheide_und_Verlauf.md`, Abschnitt 2). Soll die Frist hart gelten, gehört dieselbe Bedingung in **Flow C**: vor dem Anlegen des Listeneintrags prüfen, ob `utcNow()` in Ortszeit vor 10:00 Uhr des Kurstages liegt, und sonst mit HTTP 403 antworten. Die Gästeseite zeigt bei 403 bereits die Karte «Bestellung geschlossen»; es wäre also kein weiterer Eingriff in die Webseite nötig.

**Die Uhrzeit steht an zwei Stellen.** `KONFIG.annahmeschluss` in `konfig.js` für die Admin-Seiten und `ANNAHMESCHLUSS` im Kopf von `index.html` für die Gästeseite. Das ist bewusst doppelt: `index.html` bindet `konfig.js` nicht ein, weil die Gästeseite ohne Anmeldung auskommt und deshalb keine der Admin-Dateien lädt. Wird die Zeit geändert, muss sie an **beiden** Stellen geändert werden. Das Kursblatt beschriftet sich über `Hilfe.annahmeschlussText()` von selbst.

---

## 8. Eingebundene Bibliotheken

Grundsatz seit dem 28.08.2026: **so wenig selbstgebauter Code wie möglich.**

| Bibliothek | Version | Aufgabe | Wo eingebunden |
|---|---|---|---|
| `@azure/msal-browser` | 4.30.0 | Anmeldung an Entra ID | `admin.html`, `menueblatt.html`, `kursblatt.html` (nur für den Rückfallweg) |
| `qrcode-generator` | 1.4.4 | QR-Code | `kursblatt.html` |

Beide kommen von `cdn.jsdelivr.net`, sind auf eine feste Fassung genagelt und mit `integrity="sha384-..."` gegen unbemerkten Austausch abgesichert. Wer eine Version anhebt, muss die Prüfsumme mitziehen, sonst verweigert der Browser das Laden:

```
curl -sL <URL> | openssl dgst -sha384 -binary | openssl base64 -A
```

**Der Preis:** Anmeldung und Kursblatt setzen voraus, dass der CDN erreichbar ist. Beide Seiten melden einen Ausfall im Klartext, statt leer zu bleiben. Frühere Eigenbauten, ein QR-Encoder von rund 380 Zeilen und ein PKCE-Ablauf von rund 230 Zeilen, sind dafür entfallen.

---

## 9. Sicherheitsheader und Content Security Policy

Die Datei `_headers` wird von Cloudflare Pages ausgewertet und setzt für alle Seiten. Sie muss dazu im ausgelieferten Ordner liegen, also in `frontend\`:

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

Geprüft wird im Browser, mit dem kleinen Server aus `code\serve.ps1`.

```
powershell -ExecutionPolicy Bypass -File code\serve.ps1
```

Danach läuft ein Server auf `http://localhost:8123/`.

**Jede Seite kennt `?mock=1`.** Damit arbeitet sie mit erfundenen Daten, ohne Anmeldung und ohne Netzwerk. Das ist der schnellste Weg, eine Änderung an der Darstellung zu prüfen.

| Adresse | Zeigt |
|---|---|
| `localhost:8123/index.html?mock=1` | Gästeseite mit Testmenü |
| `localhost:8123/index.html?mock=1&falschertag=1` | Gästeseite am falschen Tag |
| `localhost:8123/index.html?mock=1&spaet=1` | Gästeseite nach 10:00 Uhr, unabhängig von der echten Uhrzeit |
| `localhost:8123/index.html?mock=1&spaet=0` | Gästeseite vor 10:00 Uhr, unabhängig von der echten Uhrzeit |
| `localhost:8123/admin.html?mock=1` | Verwaltung mit vier Klassen, Anlegen, Ändern und Löschen funktionieren im Speicher |
| `localhost:8123/kursblatt.html?mock=1` | Kursblatt mit QR-Code |
| `localhost:8123/menueblatt.html?mock=1` | Menüblatt mit acht Bestellungen |

Um die geschlossene Ansicht **mit** bestehender Bestellung zu sehen, zuerst mit `?mock=1&spaet=0` eine Bestellung absenden und danach auf `?mock=1&spaet=1` wechseln. Die Bestellung liegt im `localStorage` unter `bauluut-bestellung-mock`.

Für Tests mit echter Anmeldung müssen die `localhost:8123`-Adressen in der App-Registrierung als Umleitungsadressen eingetragen sein.

> **Auf dem Arbeitsplatz sind Node und Python vorhanden** (geprüft am 04.09.2026: Node 22.15.0, Python 3.13), auch wenn frühere Fassungen dieses Dokuments das Gegenteil behaupteten. `serve.ps1` bleibt trotzdem der einfachste Weg, weil er ohne Installation auskommt. Für eine schnelle Syntaxprüfung der Inline-Skripte genügt `new vm.Script(...)` in Node.

---

## 12. Alle Kennungen auf einen Blick

| Was | Wert |
|---|---|
| Gästeseite | `https://menue.campus-sursee.ch` |
| Verwaltung | `https://menue.campus-sursee.ch/admin.html` |
| Kursblatt, ohne Anmeldung | `https://menue.campus-sursee.ch/kursblatt.html?klasse=CODE` |
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
