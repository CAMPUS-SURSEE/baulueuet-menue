# Betriebs- und Supporthandbuch: Menüwahl Restaurant BAULÜÜT

**Für:** ICT-Services Campus Sursee
**Stand:** 28.08.2026
**Gilt für:** die Webseite `https://menue.campus-sursee.ch` samt SharePoint-Listen, Power-Automate-Flows und Entra-App-Registrierung
**Verwandte Dokumente:** `ANLEITUNG_ANMELDUNG.md` (Einrichtung der App-Registrierung), `HANDOFF_Menuewahl_BAULUUT_Stand_2026-08-28.md` (Projektstand und Architektur)

Alle Zitate von Fehlermeldungen in diesem Handbuch stammen wortgetreu aus dem Quellcode im Ordner `frontend\`.

---

## Inhaltsverzeichnis

1. [System in zwei Minuten](#1-system-in-zwei-minuten)
2. [Regelbetrieb](#2-regelbetrieb)
3. [Fehlerbilder](#3-fehlerbilder)
   - [3.1 Anmeldung schlägt fehl](#31-anmeldung-schlägt-fehl)
   - [3.2 Anmeldebibliothek und CDN](#32-anmeldebibliothek-und-cdn)
   - [3.3 Berechtigungen auf die SharePoint-Listen](#33-berechtigungen-auf-die-sharepoint-listen)
   - [3.4 Anmeldung abgelaufen, Token-Fehler](#34-anmeldung-abgelaufen-token-fehler)
   - [3.5 Klasse nicht gefunden, Gästelink defekt](#35-klasse-nicht-gefunden-gästelink-defekt)
   - [3.6 Gast sieht «falscher Tag» statt Formular](#36-gast-sieht-falscher-tag-statt-formular)
   - [3.7 Tagesmenüs fehlen auf dem Menüblatt](#37-tagesmenüs-fehlen-auf-dem-menüblatt)
   - [3.8 Menütexte falsch verteilt](#38-menütexte-falsch-verteilt)
   - [3.9 QR-Code lässt sich nicht scannen](#39-qr-code-lässt-sich-nicht-scannen)
   - [3.10 Seite bleibt leer, Konsole meldet nichts](#310-seite-bleibt-leer-konsole-meldet-nichts)
   - [3.11 Bestellungen erscheinen nicht in der Verwaltung](#311-bestellungen-erscheinen-nicht-in-der-verwaltung)
   - [3.12 Weitere Meldungen im Wortlaut](#312-weitere-meldungen-im-wortlaut)
4. [Diagnose-Werkzeuge](#4-diagnose-werkzeuge)
5. [Wiederkehrende Aufgaben](#5-wiederkehrende-aufgaben)
6. [Grenzen und bekannte Schwächen](#6-grenzen-und-bekannte-schwächen)
7. [Eskalation](#7-eskalation)

---

## 1. System in zwei Minuten

Kursteilnehmende wählen ihr Mittagsmenü über eine Webseite statt auf Papier. Die Réception legt pro Kurs eine Klasse an, verteilt Link oder QR-Code und druckt für die Küche das Menüblatt.

### 1.1 Bestandteile

| Bestandteil | Was es ist | Wo |
|---|---|---|
| Webseite | statische Seiten, kein Server, keine Datenbank | Netlify, `https://menue.campus-sursee.ch` |
| `index.html` | Gästeseite, ohne Anmeldung | Netlify |
| `admin.html` | Verwaltung der Klassen, mit Anmeldung | Netlify |
| `kursblatt.html` | Aushang mit QR-Code, mit Anmeldung | Netlify |
| `menueblatt.html` | Bestellübersicht für die Küche, mit Anmeldung | Netlify |
| Liste «Klassen» | ein Eintrag pro Kurs, mit 8-stelligem Code | SharePoint-Site «Reception» (`hot-reze`) |
| Liste «Bestellungen» | ein Eintrag pro Person | SharePoint-Site «Reception» |
| Flow B «API Klasse laden» | GET, liefert Klassendaten und die Tagesmenüs von Lunchgate | Power Automate |
| Flow C «API Bestellung speichern» | POST, schreibt eine Bestellung | Power Automate |
| Flow «Aufraeumen Menuewahl» | täglich 03:00, löscht Altbestand | Power Automate |
| App-Registrierung «Menuewahl BAULUUT Admin» | Anmeldung der Réception, Zugangskontrolle | Entra ID |

Alle IDs, Adressen und Flow-Aufrufadressen stehen an einem Ort: `frontend\konfig.js`. Die Gästeseite `index.html` trägt die beiden Flow-Adressen zusätzlich in ihrem eigenen Konfigurationsblock ganz oben im `<script>`. Diese Adressen enthalten eine Signatur und gehören nicht in Tickets, Mails oder Chats.

### 1.2 Wer redet mit wem

- **Gäste** öffnen `index.html` anonym. Die Seite spricht ausschliesslich mit **Flow B** (Klassendaten und Tagesmenüs) und **Flow C** (Bestellung speichern). Kein Konto, kein Token.
- **Réception** meldet sich auf `admin.html`, `kursblatt.html` und `menueblatt.html` mit dem Microsoft-365-Konto an und greift danach **direkt über Microsoft Graph** auf die beiden SharePoint-Listen zu. Die Berechtigung ist delegiert: Das Token kann nur das, was die Person in SharePoint ohnehin darf.
- **Ausnahme:** `menueblatt.html` holt die Bestellungen über Graph, die Menütexte aber weiterhin über **Flow B**, weil dort die Lunchgate-Anbindung sitzt.

### 1.3 Zuständigkeiten

| Thema | Zuständig |
|---|---|
| Klassen anlegen, Codes verteilen, Blätter drucken | Réception |
| Menütexte inhaltlich (Lunchgate) | Restaurant BAULÜÜT / Küche |
| Webseite veröffentlichen (Netlify) | ICT-Services |
| Flows, Verbindungen, Aufräum-Flow | ICT-Services, Konto `powerplatform@campus-sursee.ch` |
| Entra-App-Registrierung, Benutzerzuweisung | ICT-Services / IT-Administration |
| SharePoint-Berechtigungen der Site «Reception» | Besitzende der Site «Reception» |

---

## 2. Regelbetrieb

Im Normalfall ist nichts zu tun. Es gibt keinen Server, der überwacht werden müsste, und keine geplante Wartung.

**Was von allein läuft:**

- **Aufräum-Flow «Aufraeumen Menuewahl»**, täglich um 03:00. Er löscht Klassen und Bestellungen, die älter als 30 Tage sind. Dadurch bleiben die Listen klein, was für die Seiten wichtig ist: Sie holen ganze Listen und filtern im Browser.
- **Token-Erneuerung.** MSAL erneuert das Zugriffstoken still im Hintergrund, solange die Sitzung gültig ist. Token liegen im `sessionStorage` und sind beim Schliessen des Tabs weg. Eine Abmeldung von Hand ist nicht nötig.
- **Codeerzeugung.** Der 8-stellige Klassencode entsteht beim Speichern automatisch aus dem Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, ohne 0, O, 1 und I, damit er auf Papier eindeutig lesbar ist. Der Code ist nie ein Eingabefeld und ändert sich beim Bearbeiten nicht.
- **Tagesmenüs.** Flow B holt sie bei jedem Aufruf frisch von Lunchgate. Fehlt ein Wert, greift ein Fallback auf die entsprechenden Spalten der Klasse in SharePoint.

**Was niemand anfassen muss:**

- Die Listen «Klassen» und «Bestellungen» direkt in SharePoint. Alles Nötige geht über `admin.html`. SharePoint ist nur für die Diagnose gedacht.
- Die Flows B und C. Sie sind fertig und laufen. Änderungen im Power-Automate-Designer sind heikel, siehe Abschnitt 6.
- Die Client-ID und die Mandanten-ID im Quelltext. Sie sind öffentlich sichtbar und dürfen das sein: Es sind Kennungen, keine Geheimnisse. Der Schutz kommt aus der Anmeldung und aus der Benutzerzuweisung in Entra ID.

**Regelmässig sinnvoll, aber nicht dringend:**

- Bei Personalwechsel in der Réception die Benutzerzuweisung in der Unternehmensanwendung nachführen, siehe Abschnitt 5.
- Einmal pro Quartal prüfen, ob die eingebundenen Bibliotheken noch aktuell sind, siehe Abschnitt 5.3.

---

## 3. Fehlerbilder

Aufbau je Abschnitt: **Symptom**, **wahrscheinliche Ursache**, **Prüfschritt**, **Behebung**.

Wichtig zum Verständnis der Meldungen: Auf `kursblatt.html` und `menueblatt.html` erscheint jeder unerwartete Fehler unter der Überschrift **«Verbindungsfehler»**, auch wenn es in Wahrheit ein Berechtigungs- oder Anmeldeproblem ist. Der eigentliche Text darunter ist die aussagekräftige Information. Auf `admin.html` erscheinen Anmeldefehler unter **«Anmeldung nicht möglich»**, Datenfehler im roten Balken oben im Arbeitsbereich.

### 3.1 Anmeldung schlägt fehl

**Symptom:** Nach dem Öffnen von `admin.html`, `kursblatt.html` oder `menueblatt.html` erscheint statt der Seite eine Fehlerkarte. Auf `admin.html` lautet die Überschrift «Anmeldung nicht möglich», darunter steht der Text von Entra ID mit einem Code der Form `AADSTS…`.

| Code | Ursache | Prüfschritt | Behebung |
|---|---|---|---|
| `AADSTS50011` | Die Umleitungsadresse ist in der App-Registrierung nicht hinterlegt oder weicht ab. Auch `http` gegen `https`, ein zusätzlicher Schrägstrich oder eine abweichende Domäne zählen als Abweichung. | In Entra ID unter **App-Registrierungen → Menuewahl BAULUUT Admin → Authentifizierung** die Liste der SPA-Umleitungsadressen mit der Adresse in der Browserzeile vergleichen (ohne den Teil ab `?`). | Fehlende Adresse ergänzen. Nötig sind `https://menue.campus-sursee.ch/admin.html`, `.../kursblatt.html`, `.../menueblatt.html`, für lokale Tests zusätzlich die drei `http://localhost:8123/…`-Varianten. Abfragezeichenfolgen wie `?klasse=CODE` gehören **nicht** dazu; die Seiten schneiden sie für die Anmeldung ab und stellen sie danach selbst wieder her. Speichern nicht vergessen. |
| `AADSTS9002326` | Die Plattform der App-Registrierung steht auf «Web» statt auf «Single-Page-Anwendung». Nur bei SPA erlaubt Microsoft den Tokentausch direkt aus dem Browser. | Gleiche Seite **Authentifizierung**: Unter welcher Plattformüberschrift stehen die drei Adressen? | Die Adressen unter der Plattform **Single-Page-Anwendung (SPA)** eintragen und die Plattform «Web» entfernen. |
| `AADSTS50105` | Die Person ist der Unternehmensanwendung nicht zugewiesen. Das ist der beabsichtigte Zustand für alle ausserhalb der Réception. | In Entra ID unter **Unternehmensanwendungen → Menuewahl BAULUUT Admin → Benutzer und Gruppen** nachsehen, ob das Konto aufgeführt ist. | Wenn die Person Zugriff haben soll: zuweisen, siehe Abschnitt 5.1. Wenn nicht: kein Fehler, so ist es gedacht. |

**Weitere Ursache im gleichen Bild:** Steht in der Fehlerkarte statt eines `AADSTS`-Codes der Text

> In konfig.js ist keine Client-ID eingetragen. Bitte die App-Registrierung anlegen, siehe ANLEITUNG_ANMELDUNG.md.

dann ist die Datei `konfig.js` auf Netlify unvollständig oder wurde durch eine ältere Fassung überschrieben. Behebung: `konfig.js` aus `frontend\` prüfen, die Client-ID muss gesetzt sein, und den Ordner neu veröffentlichen (Abschnitt 5.4).

### 3.2 Anmeldebibliothek und CDN

**Symptom:** Auf einer der drei Admin-Seiten erscheint im Klartext

> Die Anmeldebibliothek konnte nicht geladen werden. Bitte die Internetverbindung prüfen und die Seite neu laden.

**Wahrscheinliche Ursachen**

1. `cdn.jsdelivr.net` ist nicht erreichbar, etwa weil der Arbeitsplatz offline ist, ein Proxy oder die FortiGate den Host blockiert oder das CDN eine Störung hat.
2. Die Prüfsumme im `integrity`-Attribut passt nicht mehr zur ausgelieferten Datei. Das passiert, wenn jemand die Versionsnummer in der `<script>`-Zeile angehoben hat, ohne die Prüfsumme mitzuziehen. Der Browser lädt die Datei dann bewusst nicht.
3. Ein Browsererweiterung oder Werbeblocker unterbindet den CDN-Aufruf.

**Prüfschritte**

- Browser-Konsole öffnen (F12). Bei Fall 2 steht dort sinngemäss, die Ressource verletze die Integritätsprüfung («Failed to find a valid digest in the integrity attribute»). Bei Fall 1 oder 3 steht ein Netzwerk- oder Blockierungsfehler.
- Die Adresse `https://cdn.jsdelivr.net/npm/@azure/msal-browser@4.30.0/lib/msal-browser.min.js` direkt im Browser aufrufen. Lädt sie nicht, ist es Fall 1 oder 3.
- Am gleichen Arbeitsplatz eine andere Seite mit Internetzugriff öffnen, um eine allgemeine Netzstörung auszuschliessen.

**Behebung**

- Fall 1: Netzwerk beziehungsweise Proxy freigeben. `cdn.jsdelivr.net` muss erreichbar sein. Bei einer CDN-Störung hilft nur Warten; die Gästeseite `index.html` ist davon **nicht** betroffen und bleibt nutzbar, weil sie keine Bibliothek lädt.
- Fall 2: Prüfsumme neu berechnen und in allen betroffenen Seiten nachführen, siehe Abschnitt 5.3.
- Fall 3: Erweiterung für die Domäne `menue.campus-sursee.ch` deaktivieren oder einen anderen Browser verwenden.

**Verwandtes Bild auf dem Kursblatt:** Fehlt nur die QR-Bibliothek, lädt das Kursblatt trotzdem, im QR-Rahmen steht dann

> Der QR-Code konnte nicht erzeugt werden. Bitte laden Sie die Seite mit bestehender Internetverbindung neu.

Der Gästelink im Klartext unter dem Rahmen bleibt gültig und kann als Ersatz weitergegeben werden.

### 3.3 Berechtigungen auf die SharePoint-Listen

**Symptom:** Die Anmeldung klappt, der Name der Person steht rechts oben, aber statt Daten erscheint

> Keine Berechtigung für diese Liste. Bitte prüfen, ob das Konto Zugriff auf die SharePoint-Site «Reception» hat.

Auf `admin.html` erscheint dieser Text im roten Balken oben, auf `kursblatt.html` und `menueblatt.html` unter der Überschrift «Verbindungsfehler».

**Wahrscheinliche Ursache:** Das Konto hat keinen Zugriff auf die SharePoint-Site «Reception» (`hot-reze`). Die Graph-Berechtigung ist delegiert, das Token kann also nur, was die Person in SharePoint ohnehin darf. Eine Zuweisung in der Unternehmensanwendung allein genügt nicht.

**Prüfschritt:** Mit dem betroffenen Konto `https://campussursee.sharepoint.com/sites/hot-reze` öffnen und versuchen, die Listen «Klassen» und «Bestellungen» zu sehen. Schlägt das bereits fehl, liegt es nicht an der Webseite.

**Behebung:** Die Person durch die Besitzenden der Site «Reception» als Mitglied hinzufügen lassen. Danach die Menüwahl-Seite neu laden. Zusätzlich prüfen, ob in der App-Registrierung die delegierte Graph-Berechtigung `Sites.ReadWrite.All` samt Administratorzustimmung vorhanden ist.

**Verwandte Meldung:** Steht stattdessen

> Liste oder Eintrag nicht gefunden. Bitte die IDs in konfig.js prüfen.

dann stimmen `siteId`, `listeKlassen` oder `listeBestellungen` in `frontend\konfig.js` nicht mehr mit SharePoint überein, oder der Eintrag wurde zwischenzeitlich gelöscht. Zuerst die Seite neu laden; besteht das Bild, die IDs abgleichen.

### 3.4 Anmeldung abgelaufen, Token-Fehler

**Symptom A:** Die Seite lief, nach einer längeren Pause erscheint

> Die Anmeldung ist abgelaufen. Bitte die Seite neu laden.

**Ursache:** Das Zugriffstoken ist abgelaufen und liess sich nicht still erneuern, oder der Zugriff wurde zwischenzeitlich entzogen (Konto gesperrt, Zuweisung entfernt, Kennwort geändert, Richtlinie für bedingten Zugriff greift).

**Behebung:** Seite mit F5 neu laden. MSAL versucht dann eine stille Erneuerung und leitet nötigenfalls auf die Anmeldung um. Hilft das nicht: Tab schliessen und neu öffnen. Beim Schliessen des Tabs wird der `sessionStorage` geleert, damit sind alle Reste der alten Sitzung weg.

**Symptom B:** Die Seite springt in einer Schlaufe auf `login.microsoftonline.com` und zurück, ohne je fertig zu laden.

**Ursache:** Die stille Erneuerung im verborgenen Rahmen scheitert. Häufigste Gründe: Der Eintrag `frame-src https://login.microsoftonline.com` in `frontend\_headers` fehlt oder wurde verändert, oder der Browser blockiert Cookies von Drittanbietern für `login.microsoftonline.com`.

**Prüfschritt:** Konsole und Netzwerkanalyse öffnen und auf CSP-Verstösse beziehungsweise blockierte Rahmen achten. Testweise ein privates Fenster mit Standardeinstellungen verwenden.

**Behebung:** `_headers` gegen die Fassung in `frontend\_headers` abgleichen und den Ordner neu veröffentlichen. Cookieblockade im Browserprofil lockern.

**Symptom C:** Es erscheint

> Zu viele Anfragen. Bitte einen Moment warten und neu laden.

**Ursache:** Microsoft Graph drosselt (HTTP 429), meist weil mehrere Personen gleichzeitig die vollständigen Listen abrufen. **Behebung:** Eine Minute warten und neu laden. Tritt das regelmässig auf, weist es auf zu grosse Listen hin; dann prüfen, ob der Aufräum-Flow läuft (Abschnitt 3.11).

### 3.5 Klasse nicht gefunden, Gästelink defekt

**Symptom A (Gast):** Auf `index.html` erscheint

> **Ungültiger Link**
> Dieser Link ist unvollständig. Bitte verwende den Link, den du erhalten hast.

**Ursache:** Die Adresse enthält keinen Parameter `?klasse=`. Meist wurde `https://menue.campus-sursee.ch` von Hand eingetippt oder der Link beim Kopieren abgeschnitten.

**Behebung:** Den vollständigen Gästelink verwenden. Er hat immer die Form `https://menue.campus-sursee.ch/?klasse=CODE` und steht in `admin.html` in der Detailansicht der Klasse, Knopf «Link kopieren».

**Symptom B (Gast):** Auf `index.html` erscheint

> **Ungültiger Link**
> Diese Klasse wurde nicht gefunden. Bitte prüfe den Link oder melde dich bei der Réception.

**Wahrscheinliche Ursachen und Prüfschritte:**

| Ursache | Prüfschritt | Behebung |
|---|---|---|
| Tippfehler im Code | Code mit dem in `admin.html` vergleichen. Verwechslungsgefahr besteht bei S/5, B/8, Z/2. 0, O, 1 und I kommen im Alphabet **nicht** vor; wer sie im Code liest, hat falsch abgelesen. | Richtigen Link weitergeben. |
| Klasse wurde gelöscht | In `admin.html` suchen, dabei den Umschalter «Vergangene anzeigen» betätigen. | Klasse neu anlegen, neuen Link verteilen. |
| Klasse älter als 30 Tage, vom Aufräum-Flow entfernt | Datum des Kurses prüfen. | Neue Klasse anlegen. |
| Flow B liefert `ok = false` oder HTTP 404 | Flow-Lauf in Power Automate ansehen, siehe Abschnitt 4.4. | Je nach Befund, siehe 3.11. |

**Symptom C (Réception):** Auf `kursblatt.html` oder `menueblatt.html` erscheint

> **Ungültiger Link**
> Dieser Link ist unvollständig. Bitte rufen Sie die Seite mit dem Klassencode auf, zum Beispiel kursblatt.html?klasse=ABC123.

beziehungsweise mit `menueblatt.html?klasse=ABC123`. **Ursache:** Die Seite wurde ohne `?klasse=` geöffnet. **Behebung:** Die Blätter immer aus `admin.html` über die Knöpfe «Kursblatt drucken» und «Menüblatt drucken» öffnen; die Adresse wird dann korrekt zusammengesetzt.

**Symptom D (Réception):**

> **Ungültiger Link**
> Diese Klasse wurde nicht gefunden. Bitte prüfen Sie den Klassencode.

**Ursache:** Zu diesem Code existiert in der Liste «Klassen» kein Eintrag. Der Vergleich läuft in Grossbuchstaben, Gross- und Kleinschreibung spielt also keine Rolle; Leerzeichen im Code hingegen schon. **Behebung:** Code in `admin.html` nachschlagen und die Adresse neu aufbauen.

### 3.6 Gast sieht «falscher Tag» statt Formular

**Symptom:** Statt des Formulars zeigt `index.html`

> **Menüwahl noch nicht möglich**
> Das Mittagessen von *Klassenname* findet am *Wochentag, TT.MM.JJJJ* statt.
> Die Menüwahl ist nur am Tag des Mittagessens möglich. Bitte öffne diesen Link am entsprechenden Tag nochmals.

**Ursache:** So ist es gedacht. Das Formular erscheint nur, wenn das Datum der Klasse dem heutigen Datum entspricht. Wird ein anderes Datum genannt als erwartet, stimmt das Datum der Klasse nicht.

**Prüfschritte**

1. Nennt die Meldung den richtigen Kurstag? Dann ist alles in Ordnung, die Teilnehmenden müssen am Kurstag selbst wählen.
2. Nennt sie einen Tag daneben, in `admin.html` das Datum der Klasse kontrollieren.
3. Ist die Uhrzeit am Gerät des Gastes korrekt? Die Prüfung läuft im Browser gegen die lokale Systemzeit. Ein falsch gestelltes Handy oder eine falsche Zeitzone auf Reisen erzeugt genau dieses Bild.

**Behebung:** Datum in `admin.html` korrigieren, Systemzeit des Geräts richtigstellen. Der Gästelink bleibt derselbe, der Code ändert sich beim Bearbeiten nicht.

**Hinweis zu Altbeständen:** Datumswerte, die noch von der früheren Power App stammen, stehen in SharePoint anders geschrieben als neu erfasste (`…T22:00:00Z` gegen `…T12:00:00Z`) und meinen trotzdem denselben Kurstag. Die Seiten rechnen deshalb bewusst über die lokale Zeitzone um. Wer diese Umrechnung im Code ändert, verschiebt sämtliche Altbestände um einen Tag.

**Verwandtes Bild:** Erscheint stattdessen

> **Bestellung geschlossen**
> Die Menüwahl von *Klassenname* vom *Datum* ist bereits abgeschlossen.
> Bitte melde dich bei der Réception.

dann steht der Status der Klasse auf «geschlossen». Behebung: in `admin.html` die Klasse bearbeiten und den Status auf «offen» setzen. Der gleiche Text erscheint auch, wenn Flow C beim Absenden mit HTTP 403 antwortet, die Klasse also zwischen dem Öffnen der Seite und dem Absenden geschlossen wurde.

### 3.7 Tagesmenüs fehlen auf dem Menüblatt

**Symptom:** Auf `menueblatt.html` fehlt der Kasten «Menü des Tages», stattdessen steht dort

> Die Tagesmenüs sind zurzeit nicht abrufbar. Die Bestellungen sind vollständig aufgeführt.

**Wichtig für die Auskunft am Telefon:** Das Blatt ist trotzdem **vollständig und druckbar**. Nur die Beschreibungstexte der Menüs fehlen, die Bestellungen selbst kommen aus SharePoint und sind davon nicht betroffen. Wer Menü 1 und Menü 2 bestellt hat, steht korrekt in der Tabelle und im Zusammenzug.

**Wahrscheinliche Ursachen**

1. Lunchgate ist gestört oder liefert für heute keine Menüs.
2. Flow B läuft auf einen Fehler, etwa wegen einer unterbrochenen Verbindung.
3. Die Flow-Aufrufadresse in `frontend\konfig.js` stimmt nicht mehr, weil der Flow neu erstellt oder die Signatur erneuert wurde.
4. Der Power-Automate-Host ist in der Content Security Policy in `_headers` nicht mehr freigegeben.

**Prüfschritte**

1. `index.html` mit einem Gästelink für heute öffnen. Fehlen die Menütexte auch dort, ist es Flow B oder Lunchgate, nicht das Menüblatt.
2. Power Automate öffnen, Flow **API Klasse laden**, Läufe der letzten Stunden ansehen (Abschnitt 4.4). Rote Läufe zeigen die fehlgeschlagene Aktion.
3. In der Aktion «Lunchgate» die Antwort ansehen. Kommen `key_0`, `key_1` und `key_2` zurück? Kommt nur `key_0`, wurde in der Aufrufadresse `&limit=1` ergänzt; dieser Parameter darf dort **nicht** stehen, sonst bleiben M2, P3 und Dessert leer.
4. Netzwerkanalyse im Browser: Wird der Aufruf an den Power-Automate-Host überhaupt gesendet oder von der CSP blockiert?

**Behebung**

- Lunchgate-Störung: abwarten. Als Übergang können die Menütexte in den Spalten `Suppe`, `Salat`, `Menu1`, `Menu2` und `Dessert` der Klasse in SharePoint von Hand erfasst werden; Flow B greift bei leeren Lunchgate-Werten auf diese Spalten zurück.
- Flow-Fehler: Verbindung im Designer neu auswählen beziehungsweise reparieren, danach den Designer neu laden. Änderungen an Ausdrücken anschliessend **immer** in der Codeansicht der Aktion verifizieren, sie gehen sonst still verloren.
- Geänderte Aufrufadresse: neue Adresse in `konfig.js` und im Konfigurationsblock von `index.html` nachführen, dann neu veröffentlichen (Abschnitt 5.4).
- CSP: Host in `_headers` unter `connect-src` ergänzen und neu veröffentlichen.

### 3.8 Menütexte falsch verteilt

**Symptom:** Auf der Gästeseite und auf dem Menüblatt steht die ganze Vorspeisenzeile bei «Tagessuppe», bei «Tagessalat» steht nichts oder etwas Falsches. Seltener stehen Menü 1 und Menü 2 vertauscht oder das Dessert im falschen Feld.

**Ursache:** Flow B teilt die Vorspeisenzeile aus Lunchgate (Feld `P3`) am Wort « oder » in Suppe und Salat auf. Diese Aufteilung ist rein textabhängig. Schreibt die Küche die Zeile anders, etwa mit «/», mit «und» oder ganz ohne Trenner, greift die Regel nicht und der gesamte Text landet im Suppe-Feld.

**Prüfschritte**

1. In Power Automate den letzten Lauf von **API Klasse laden** öffnen und die Rohantwort von Lunchgate ansehen. Wie lautet `key_2.line2` genau?
2. Enthält der Text das Wort « oder » mit Leerzeichen davor und dahinter? Fehlt es, ist die Ursache bestätigt.

**Behebung**

- Kurzfristig und ohne Codeänderung: In `admin.html` ist das nicht möglich. Die Felder `Suppe` und `Salat` der betroffenen Klasse direkt in der SharePoint-Liste «Klassen» ausfüllen. Diese Werte greifen als Fallback nur dann, wenn Lunchgate nichts liefert. Verlässlicher ist deshalb der nächste Punkt.
- Richtige Lösung: Das Restaurant bitten, die Vorspeisenzeile wieder im gewohnten Muster «Tagessuppe oder Tagessalat» zu schreiben. Das ist der Weg, der das Bild dauerhaft behebt.
- Dauerlösung mit Aufwand: Die Aufteilung in Flow B robuster gestalten. Das ist eine Änderung am Flow und keine Supportaufgabe, siehe Abschnitt 7.

### 3.9 QR-Code lässt sich nicht scannen

**Symptom:** Die Handykamera erkennt den QR-Code auf dem gedruckten Kursblatt nicht oder nur nach langem Suchen.

**Wahrscheinliche Ursachen und Behebung**

| Ursache | Prüfschritt | Behebung |
|---|---|---|
| Ruhezone fehlt, weil jemand am Parameter `margin` gedreht hat | Auf dem Ausdruck: Ist rings um das Symbol ein weisser Rand von etwa vier Modulbreiten? Im Code muss bei `cellSize: 2` der Wert `margin: 8` stehen, weil `margin` in SVG-Einheiten zählt, nicht in Modulen. | Wert zurücksetzen, Seite neu veröffentlichen. Ohne Ruhezone verweigern Scanner den Code oft, weil direkt unter dem Symbol der Linktext folgt. |
| Zu klein gedruckt, auf mehrere Seiten verteilt oder skaliert | Druckvorschau prüfen. Im Normaldruck misst das Symbol rund 63 mm in einem Rahmen von 78 mm. | Auf A4 in Originalgrösse drucken, Skalierung im Druckdialog auf 100 Prozent stellen, «An Seite anpassen» ausschalten. |
| Schlechter Ausdruck: Toner am Ende, graues oder farbiges Papier, Knick quer durch das Symbol | Ausdruck ansehen. | Auf weissem Papier neu drucken. |
| QR-Bibliothek nicht geladen | Im Rahmen steht «Der QR-Code konnte nicht erzeugt werden. Bitte laden Sie die Seite mit bestehender Internetverbindung neu.» | Siehe Abschnitt 3.2. |
| Kamera-App des Geräts kann keine QR-Codes | Mit einem zweiten Gerät gegenprüfen. | Der vollständige Gästelink steht als Text unter dem Symbol und kann von Hand eingetippt oder abfotografiert werden. |

Falls der Verdacht besteht, dass am Generator selbst etwas kaputt ist: Der Ordner `qr-test\` im Projektordner enthält die Testumgebung dafür. Sie liegt bewusst ausserhalb von `frontend` und wird nicht mitveröffentlicht.

### 3.10 Seite bleibt leer, Konsole meldet nichts

**Symptom:** Die Seite lädt, bleibt aber weiss oder hängt beim Ladehinweis. In der Konsole steht keine oder nur eine unauffällige Meldung, und in der Netzwerkanalyse fehlt ein Aufruf, den es geben müsste.

**Ursache:** Die Content Security Policy in `frontend\_headers` blockiert den Aufruf. Fehlt dort eine Adresse, blockiert der Browser sie stillschweigend, ohne dass die Seite selbst etwas davon merkt. Das ist das tückischste Fehlerbild des Systems, weil es keinen Fehlertext gibt.

**Prüfschritte**

1. Konsole (F12) öffnen und gezielt nach Zeilen suchen, die mit «Refused to …» beginnen oder das Wort «Content Security Policy» enthalten. Diese Meldungen sind leicht zu übersehen.
2. Netzwerkanalyse: Fehlt der Aufruf ganz oder ist er als blockiert markiert?
3. `_headers` gegen die Fassung in `frontend\_headers` vergleichen.

**Behebung:** Die betroffene Adresse in der passenden Direktive ergänzen und den Ordner neu veröffentlichen. Zur Orientierung, welche Direktive wofür da ist:

| Direktive | Enthält | Wofür |
|---|---|---|
| `script-src` | `'self'`, `'unsafe-inline'`, `cdn.jsdelivr.net` | die inline eingebetteten Skripte der Seiten, MSAL und die QR-Bibliothek |
| `connect-src` | `'self'`, Microsoft Graph, `login.microsoftonline.com`, der Power-Automate-Host | Graph-Zugriffe, Anmeldung, Flow B und Flow C |
| `frame-src` | `login.microsoftonline.com` | die stille Token-Erneuerung von MSAL im verborgenen Rahmen |
| `img-src` | `'self'`, `data:`, `baulueuet.ch` | Favicon und der als SVG erzeugte QR-Code |
| `form-action` | `'self'`, `login.microsoftonline.com` | die Weiterleitung in die Anmeldung |

Wird eine dieser Adressen je geändert, etwa weil ein Flow neu erstellt wurde, muss sie hier ebenfalls nachgeführt werden.

**Andere Ursache mit gleichem Bild:** Eine der Dateien `konfig.js`, `auth.js` oder `graph.js` fehlt auf Netlify, weil beim Veröffentlichen nur einzelne Dateien statt des ganzen Ordners `frontend` gezogen wurden. In der Netzwerkanalyse steht dann ein 404 auf die fehlende Datei. Behebung: den vollständigen Ordner neu veröffentlichen.

### 3.11 Bestellungen erscheinen nicht in der Verwaltung

**Symptom:** Gäste bestätigen, bestellt zu haben, aber in `admin.html` steht bei der Klasse

> Für diese Klasse liegt noch keine Bestellung vor.

oder der Zähler in der Klassenliste bleibt auf 0.

**Prüfschritte in dieser Reihenfolge**

1. **Richtige Klasse gewählt?** Der Zähler in der Liste zeigt nur Bestellungen mit passender `KlasseID`. Gibt es zwei Klassen mit ähnlichem Namen für denselben Tag, prüfen, welchen Code die Gäste tatsächlich erhalten haben.
2. **Neu geladen?** Die Seite lädt die Bestellungen beim Auswählen der Klasse. F5 drücken und die Klasse erneut anklicken.
3. **In SharePoint nachsehen.** Liste «Bestellungen» öffnen (Abschnitt 4.5) und nach dem Klassencode in der Spalte `KlasseCode` filtern. Sind die Einträge dort vorhanden, aber in `admin.html` nicht sichtbar, stimmt die `KlasseID` nicht. Fehlen sie auch dort, hat Flow C nicht geschrieben.
4. **Flow C prüfen.** In Power Automate den Flow **API Bestellung speichern** öffnen und die Läufe des betreffenden Vormittags ansehen. Rote Läufe zeigen die Ursache, meist eine unterbrochene Verbindung oder ein Feldname, der nicht mehr passt.
5. **Klasse gelöscht und neu angelegt?** Dann hat die neue Klasse eine neue `KlasseID`, während die alten Bestellungen auf die alte ID zeigen. Sie erscheinen dann nirgends mehr, stehen aber noch in der Liste.

**Behebung**

- Fehler in Flow C: Verbindung reparieren, Flow speichern, mit einem Testgast gegenprüfen.
- Verwaiste Bestellungen nach einem Klassenwechsel: In der SharePoint-Liste «Bestellungen» stehen sie mit korrektem `KlasseCode` und können der Küche von dort übergeben werden. Automatisch aufgeräumt werden sie erst nach 30 Tagen.
- Gäste haben in Wahrheit nicht bestellt: Auf der Gästeseite erscheint nach erfolgreichem Absenden eine Bestätigung mit «Danke, *Vorname*!» und der Zusammenfassung. Wer diese Seite nicht gesehen hat, hat nicht bestellt. Kommt beim Absenden «Senden fehlgeschlagen. Bitte versuche es nochmals.», wurde nichts gespeichert.

**Verwandtes Bild:** Die Klassenliste selbst ist leer und zeigt «Keine aktuellen Klassen vorhanden.» oder «Keine vergangenen Klassen vorhanden.». Dann steht der Umschalter oben auf der falschen Seite. Mit «Vergangene anzeigen» beziehungsweise «Aktuelle anzeigen» umschalten. Steht dort «Keine Klasse gefunden.», ist das Suchfeld gefüllt; es zu leeren zeigt wieder alle Klassen.

### 3.12 Weitere Meldungen im Wortlaut

Meldungen, die im Betrieb auftauchen können und oben nicht bereits behandelt sind.

| Meldung (wortgetreu) | Wo | Ursache | Behebung |
|---|---|---|---|
| «Bitte ergänzen: Vorname, Nachname, Vorspeise, Hauptgang» (nur die tatsächlich fehlenden Felder) | Gästeseite, roter Balken im Formular | Pflichtfelder leer | Felder ausfüllen und erneut absenden. Kein Systemfehler. |
| «Senden fehlgeschlagen. Bitte versuche es nochmals.» | Gästeseite, roter Balken im Formular | Flow C nicht erreichbar, Netzwerk unterbrochen oder Flow C meldet einen Fehler | Nochmals absenden. Bleibt es dabei: Flow C prüfen, siehe 3.11. Achtung: Es wurde **nichts** gespeichert. |
| «Verbindungsfehler» mit «Das Menü konnte nicht geladen werden. Bitte prüfe deine Internetverbindung.» | Gästeseite | Flow B nicht erreichbar oder liefert einen Fehlerstatus | Knopf «Nochmals versuchen». Bleibt es dabei: Flow B prüfen, siehe 3.7. |
| «Verbindungsfehler» mit «Die Klassendaten konnten nicht geladen werden. Bitte prüfen Sie die Internetverbindung.» | Kursblatt | unerwarteter Fehler ohne eigene Meldung | Knopf «Nochmals versuchen», danach Konsole prüfen. |
| «Verbindungsfehler» mit «Die Bestellungen konnten nicht geladen werden. Bitte prüfen Sie die Internetverbindung.» | Menüblatt | dito | dito |
| «Fehler von Microsoft Graph (HTTP *nnn*)» | Admin-Seiten | ein Graph-Fehler, für den es keinen eigenen Text gibt | HTTP-Nummer notieren und ins Ticket aufnehmen. |
| «Bitte einen Titel eingeben.» | Verwaltung, Formular | Das Feld «Titel» ist leer. | Titel erfassen. |
| «Kopieren nicht möglich, bitte von Hand markieren.» | Verwaltung, neben «Link kopieren» | Die Zwischenablage ist gesperrt. Der Zugriff braucht einen sicheren Kontext, also HTTPS oder `localhost`. | Link im Feld daneben von Hand markieren und kopieren. Prüfen, ob die Seite tatsächlich über `https://` geöffnet wurde. |
| Rückfrage beim Löschen: «Klasse «*Name*» wirklich löschen? Die bereits erfassten Bestellungen dieser Klasse werden dabei nicht mitgelöscht; sie bleiben in der Liste «Bestellungen» stehen.» | Verwaltung | keine Störung, sondern die bewusste Warnung vor dem Löschen | Siehe Abschnitt 6, Punkt 3. |
| «Anmeldung nicht möglich» als Überschrift | Verwaltung | Sammelbild für alle Anmeldefehler; der Text darunter nennt die Ursache | Siehe 3.1 bis 3.4. Knopf «Erneut versuchen» lädt die Seite neu. |

---

## 4. Diagnose-Werkzeuge

### 4.1 Testansicht ohne Backend: `?mock=1`

An **jede** Seite lässt sich `?mock=1` anhängen. Die Seite arbeitet dann mit fest eingebauten Beispieldaten, ohne Anmeldung, ohne SharePoint und ohne Flows.

```
https://menue.campus-sursee.ch/admin.html?mock=1
https://menue.campus-sursee.ch/kursblatt.html?mock=1
https://menue.campus-sursee.ch/menueblatt.html?mock=1
https://menue.campus-sursee.ch/?mock=1
https://menue.campus-sursee.ch/?mock=1&falschertag=1
```

Das ist das schnellste Mittel, um Anzeige- von Datenproblemen zu trennen:

- **Sieht die Seite im Mock-Modus richtig aus, im Echtbetrieb aber nicht?** Dann liegt es an Daten, Berechtigungen, Flows oder Netzwerk, nicht am Layout.
- **Ist sie auch im Mock-Modus kaputt?** Dann ist die Veröffentlichung unvollständig oder eine Datei beschädigt.

In der Verwaltung erscheint im Mock-Modus rechts oben «Testperson (Mock-Modus)». Änderungen bleiben nur bis zum Neuladen bestehen und erreichen SharePoint nie. Mit `&falschertag=1` auf der Gästeseite lässt sich gezielt das Bild aus Abschnitt 3.6 nachstellen.

### 4.2 Browser-Konsole

F12, Reiter «Konsole». Worauf zu achten ist:

- Zeilen mit «Content Security Policy» oder «Refused to …»: siehe Abschnitt 3.10.
- «Failed to find a valid digest in the integrity attribute»: die Prüfsumme passt nicht, siehe 3.2 und 5.3.
- Meldungen mit `AADSTS`: Anmeldeproblem, siehe 3.1.
- 401, 403, 404 und 429 von `graph.microsoft.com`: siehe 3.3 und 3.4.

### 4.3 Netzwerkanalyse

F12, Reiter «Netzwerk», dann die Seite neu laden. Erwartete Aufrufe:

| Seite | Erwartete Aufrufe |
|---|---|
| Gästeseite | ein GET an den Power-Automate-Host (Flow B), beim Absenden ein POST (Flow C) |
| Verwaltung | MSAL vom CDN, Anmeldung an `login.microsoftonline.com`, mehrere GET an `graph.microsoft.com` |
| Kursblatt | MSAL und QR-Bibliothek vom CDN, Anmeldung, GET an `graph.microsoft.com` |
| Menüblatt | MSAL vom CDN, Anmeldung, GET an `graph.microsoft.com`, zusätzlich ein GET an den Power-Automate-Host für die Menütexte |

Fehlt ein Aufruf ganz, ist er meist von der CSP blockiert. Steht dort ein Statuscode, ist er der beste Anhaltspunkt für das Ticket.

### 4.4 Flow-Läufe in Power Automate

1. `https://make.powerautomate.com` öffnen, anmelden mit **powerplatform@campus-sursee.ch**.
2. Umgebung oben rechts auf `Default-2553fb74-5dcc-4072-8bb5-399d18f72af9` stellen.
3. **Meine Flows** oder **Lösungen**, je nach Ablage, dann den gewünschten Flow öffnen:
   - **API Klasse laden** (Flow B): Klassendaten und Tagesmenüs
   - **API Bestellung speichern** (Flow C): eingehende Bestellungen
   - **Aufraeumen Menuewahl**: täglicher Lauf um 03:00
4. Im Abschnitt **Ausführungsverlauf** den Lauf zum fraglichen Zeitpunkt anklicken. Rote Aktionen ausklappen, dort stehen Eingaben, Ausgaben und die Fehlermeldung des Dienstes.

Für die Störungssuche besonders nützlich: die Ausgabe der Aktion «Lunchgate» in Flow B und die Rohantwort mit `key_0` bis `key_2` (Abschnitte 3.7 und 3.8).

### 4.5 Direkt in die SharePoint-Listen schauen

Site «Reception»: `https://campussursee.sharepoint.com/sites/hot-reze`, dort **Websiteinhalte**, dann die Liste «Klassen» oder «Bestellungen».

- **Liste «Klassen»:** Spalten `Title`, `Firma`, `Datum`, `Essenszeit`, `Code`, `Status` («offen» oder «geschlossen»), `Suppe`, `Salat`, `Menu1`, `Menu2`, `Dessert`, `Bemerkung`.
- **Liste «Bestellungen»:** Spalten `Title`, `KlasseID`, `KlasseCode`, `Vorname`, `Nachname`, `Vorspeise` («Suppe», «Salat» oder «Keine»), `Hauptgang` («Menü 1» oder «Menü 2»), `Bemerkung`, `Created`.
- **Achtung:** Die Liste «Bestellungen» hat **keine** eigene Datumsspalte. Die Zuordnung zum Kurstag läuft immer über `KlasseID`. Wer nach einem Tag suchen will, sucht zuerst die Klasse und dann deren ID.
- Zum Suchen eignet sich die Spalte `KlasseCode`, weil sie den Code im Klartext enthält.

Änderungen von Hand in SharePoint sind möglich, aber die Ausnahme. Beim Status ist die Schreibweise entscheidend: exakt «offen» oder «geschlossen», in Kleinschreibung.

---

## 5. Wiederkehrende Aufgaben

### 5.1 Neue Person der Réception Zugriff geben

1. `https://entra.microsoft.com` öffnen, als Administrator anmelden.
2. **Identität → Anwendungen → Unternehmensanwendungen → Menuewahl BAULUUT Admin**.
3. **Benutzer und Gruppen → Benutzer hinzufügen**, die Person auswählen, zuweisen.
4. Prüfen, ob dieselbe Person Zugriff auf die SharePoint-Site «Reception» hat. Ohne diesen zweiten Schritt kann sie sich zwar anmelden, sieht danach aber die Meldung «Keine Berechtigung für diese Liste …». Nötigenfalls von den Besitzenden der Site als Mitglied hinzufügen lassen.
5. Gegenprüfen: Die Person öffnet `https://menue.campus-sursee.ch/admin.html` und sollte die Klassenliste sehen.

Ohne Entra ID P1 lassen sich nur einzelne Personen zuweisen, keine Gruppen. Bei einer Handvoll Leuten ist das vertretbar, es muss aber bei jedem Personalwechsel von Hand nachgeführt werden.

### 5.2 Person entfernen

1. Gleicher Weg: **Unternehmensanwendungen → Menuewahl BAULUUT Admin → Benutzer und Gruppen**.
2. Die Person markieren und **Entfernen**.
3. Die Person erhält beim nächsten Aufruf `AADSTS50105`. Eine bereits offene Sitzung läuft, bis das Token abläuft oder der Tab geschlossen wird; für einen sofortigen Entzug zusätzlich in Entra ID die Anmeldesitzungen des Kontos widerrufen.
4. Bei einem Austritt aus dem Unternehmen genügt in der Regel die Deaktivierung des Kontos; die Zuweisung sollte trotzdem aufgeräumt werden, damit die Liste aussagekräftig bleibt.

### 5.3 Bibliotheksversion anheben und Prüfsumme neu berechnen

Betroffen sind zwei Bibliotheken: `@azure/msal-browser` (aktuell 4.30.0, eingebunden in `admin.html`, `kursblatt.html` und `menueblatt.html`) und `qrcode-generator` (aktuell 1.4.4, nur in `kursblatt.html`).

1. Neue Version auf jsDelivr bestimmen und die vollständige Adresse notieren, zum Beispiel
   `https://cdn.jsdelivr.net/npm/@azure/msal-browser@X.Y.Z/lib/msal-browser.min.js`.
2. Prüfsumme berechnen:
   ```bash
   curl -sL <URL> | openssl dgst -sha384 -binary | openssl base64 -A
   ```
3. In **allen** betroffenen Seiten in `frontend\` sowohl die Versionsnummer in der Adresse als auch den Wert im Attribut `integrity="sha384-…"` ersetzen. Beides muss zusammenpassen, sonst verweigert der Browser das Laden und die Seite meldet «Die Anmeldebibliothek konnte nicht geladen werden. …».
4. Zuerst lokal oder mit `?mock=1` prüfen, danach veröffentlichen (Abschnitt 5.4).
5. Nach der Veröffentlichung alle drei Admin-Seiten einmal echt anmelden und das Kursblatt einmal mit QR-Code öffnen.

Anlass für eine Anhebung ist eine Sicherheitsmeldung zur Bibliothek oder ein konkreter Fehler. Ohne Anlass ist die feste Fassung die sicherere Wahl.

### 5.4 Änderung an der Webseite veröffentlichen

Es gibt **keine** Git-Anbindung und keine automatische Veröffentlichung. Der Weg ist manuell:

1. Änderung in `frontend\` vornehmen.
2. Lokal prüfen: `serve.ps1` starten, `http://localhost:8123/` öffnen. Für Seiten mit Anmeldung müssen die drei `localhost:8123`-Umleitungsadressen in der App-Registrierung eingetragen sein.
3. `https://app.netlify.com` öffnen, die bestehende Site auswählen, Reiter **Deploys**.
4. Den **ganzen Ordner** `frontend` in das Feld für Drag & Drop ziehen. Nicht einzelne Dateien, sonst fehlen `konfig.js`, `auth.js`, `graph.js` oder `_headers` und die Seiten bleiben leer (Abschnitt 3.10).
5. Warten, bis der Deploy als «Published» markiert ist.
6. Gegenprüfen: `admin.html` öffnen, eine Klasse auswählen, Kursblatt und Menüblatt aufrufen und einen Gästelink testen. Beim Prüfen den Browsercache umgehen (Strg und F5).

Eine fehlerhafte Veröffentlichung lässt sich in Netlify über den Deploy-Verlauf sofort auf einen früheren Stand zurücksetzen. Das ist der schnellste Ausweg, wenn nach einer Änderung nichts mehr geht.

### 5.5 Neue Klasse anlegen (Réception, zur Auskunft)

1. `https://menue.campus-sursee.ch/admin.html` öffnen.
2. «Neue Klasse», Titel, Firma, Datum und Essenszeit erfassen. Datum ist auf heute vorbelegt, Essenszeit auf 12:00, Status automatisch «offen».
3. Speichern. Der Code entsteht dabei automatisch und ist danach in der Detailansicht sichtbar.
4. «Link kopieren» für den Gästelink, «Kursblatt drucken» für den Aushang mit QR-Code.
5. Am Kurstag «Menüblatt drucken» für die Küche.

---

## 6. Grenzen und bekannte Schwächen

Diese Punkte sind bekannt und bewusst in Kauf genommen. Sie gehören ins Gespräch, bevor jemand sie für einen Fehler hält.

1. **Flow C prüft das Datum nicht serverseitig.** Die Regel «nur am Tag des Mittagessens» setzt allein die Gästeseite durch. Wer die Schnittstelle direkt aufruft, kann eine Bestellung auch an einem anderen Tag absetzen. Die Aufrufadresse mit Signatur steht im Quelltext der öffentlich zugänglichen Gästeseite; sie ist damit für jeden lesbar, der die Seite öffnet. Für diesen Anwendungsfall, eine Menüwahl ohne schutzwürdige Daten, ist das vertretbar, aber es ist keine Sicherheitsgrenze. Eine serverseitige Datumsprüfung in Flow C steht auf der Liste der offenen Punkte.
2. **Die Aufteilung der Vorspeisenzeile ist textabhängig.** Flow B trennt das Lunchgate-Feld `P3` am Wort « oder ». Schreibt die Küche anders, landet die ganze Zeile im Suppe-Feld. Das fällt niemandem im System auf, es fällt erst auf dem gedruckten Blatt auf. Siehe Abschnitt 3.8.
3. **Beim Löschen einer Klasse bleiben deren Bestellungen stehen.** Sie verlieren ihren Bezug und verschwinden aus jeder Ansicht, stehen aber weiter in der Liste «Bestellungen», bis der Aufräum-Flow sie nach 30 Tagen entfernt. Die Verwaltung warnt beim Löschen ausdrücklich davor. Der Aufräum-Flow könnte erweitert werden, sodass er verwaiste Bestellungen mit entfernt; das ist noch nicht umgesetzt.
4. **Zugriff auf die Verwaltung muss bei Personalwechsel von Hand nachgeführt werden.** Ohne Entra ID P1 lassen sich nur einzelne Personen zuweisen, keine Gruppen. Es gibt keinen automatischen Abgleich mit einer Abteilung oder einer AD-Gruppe. Wer austritt, bleibt zugewiesen, bis jemand die Zuweisung entfernt.
5. **Abhängigkeit von einem fremden CDN.** Anmeldung und QR-Code setzen voraus, dass `cdn.jsdelivr.net` erreichbar ist. Fällt der Dienst aus oder wird er im Netz blockiert, sind die drei Admin-Seiten nicht benutzbar. Sie melden das im Klartext, statt leer zu bleiben. Die Gästeseite ist nicht betroffen: Sie lädt keine Bibliothek und funktioniert weiter. Als Gegengewicht sind beide Bibliotheken auf feste Fassungen genagelt und mit Prüfsumme abgesichert; ein manipuliertes Auslieferungspaket würde nicht geladen.
6. **Kein serverseitiger Filter.** Die Seiten holen ganze Listen und filtern im Browser, weil serverseitige Filter auf SharePoint-Listenspalten einen Index voraussetzen und sonst sporadisch fehlschlagen. Bei 30 Tagen Aufbewahrung sind das wenige hundert Einträge, das trägt problemlos. Würde die Aufbewahrung stark verlängert, müsste dieser Punkt neu bewertet werden.
7. **Keine automatische Veröffentlichung.** Jede Änderung an der Webseite geht per Drag & Drop auf Netlify. Es gibt keine Versionsverwaltung ausserhalb des Deploy-Verlaufs von Netlify und des Projektordners.
8. **Die Gästeseite merkt sich die Bestellung nur lokal.** Sie speichert die abgesendete Wahl im `localStorage` des Geräts, damit die Bestätigung nach dem Neuladen wieder erscheint und die Wahl bearbeitet werden kann. Auf einem anderen Gerät oder in einem privaten Fenster ist diese Erinnerung weg; eine erneute Bestellung erzeugt dann einen zweiten Eintrag in der Liste. Doppelte Namen auf dem Menüblatt haben in der Regel diese Ursache.

---

## 7. Eskalation

### 7.1 Wenn nichts hilft

In dieser Reihenfolge vorgehen:

1. **Eingrenzen mit `?mock=1`.** Trennt Anzeigeproblem von Datenproblem, siehe 4.1.
2. **Zweites Konto und zweites Gerät.** Tritt der Fehler nur bei einer Person auf, ist es Berechtigung oder Browserprofil, nicht das System.
3. **Netlify-Deploy zurücksetzen.** Trat der Fehler nach einer Veröffentlichung auf, im Deploy-Verlauf auf den letzten funktionierenden Stand zurückgehen. Das ist der schnellste Weg zurück in den Betrieb.
4. **Notbetrieb sicherstellen.** Die Küche braucht die Bestellungen, nicht die Webseite. Solange SharePoint erreichbar ist, lassen sich die Bestellungen einer Klasse direkt aus der Liste «Bestellungen» filtern (Spalte `KlasseCode`) und ausdrucken. Fällt alles aus, ist das Papierblatt als Rückfallebene weiterhin möglich.
5. **Ticket eröffnen** mit den Angaben aus 7.2.

### 7.2 Was ein Ticket enthalten muss

- **Klassencode** (8 Zeichen) und Name der Klasse
- **Zeitpunkt** mit Datum und Uhrzeit auf die Minute genau, damit sich der Flow-Lauf zuordnen lässt
- **Konto**, mit dem gearbeitet wurde, oder der Hinweis, dass es die anonyme Gästeseite war
- **Fehlermeldung im Wortlaut**, samt Überschrift der Fehlerkarte und einem allfälligen `AADSTS`-Code oder HTTP-Statuscode. Ein Bildschirmfoto der ganzen Seite ist besser als eine Umschreibung.
- **Browser und Gerät**, zum Beispiel «Edge auf dem Arbeitsplatz-PC» oder «iPhone, Safari»
- **Betroffene Seite**: Gästeseite, Verwaltung, Kursblatt oder Menüblatt
- **Reproduzierbarkeit**: einmalig, bei jedem Versuch, nur bei einer Person, nur bei einer Klasse
- Falls schon geprüft: Ergebnis des Aufrufs mit `?mock=1`

### 7.3 Wer wofür

| Fall | Nächste Stelle |
|---|---|
| Anmeldung, Zuweisung, App-Registrierung | ICT-Services, Entra-ID-Administration |
| Berechtigung auf die Site «Reception» | Besitzende der SharePoint-Site |
| Flows, Verbindungen, Lunchgate-Anbindung | ICT-Services, Konto `powerplatform@campus-sursee.ch` |
| Webseite, Veröffentlichung, CSP, Bibliotheken | ICT-Services |
| Inhalt der Tagesmenüs | Restaurant BAULÜÜT |
| Störung bei Netlify, jsDelivr oder Lunchgate | fremder Dienst, Statusseite des Anbieters prüfen und abwarten |
