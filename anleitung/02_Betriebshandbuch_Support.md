# Betriebshandbuch und Support

Für die ICT-Services: was im Betrieb von selbst läuft, wie man Störungen findet
und behebt, und wann man eskaliert.

**Stand:** 28.09.2026

Alle Fehlermeldungen sind wörtlich aus dem Quellcode in `frontend/` zitiert.
So lassen sie sich hier mit Strg + F finden.

---

## Inhalt

1. [Das System in zwei Minuten](#1-das-system-in-zwei-minuten)
2. [Regelbetrieb](#2-regelbetrieb)
3. [Werkzeuge zur Fehlersuche](#3-werkzeuge-zur-fehlersuche)
4. [Fehlerbilder](#4-fehlerbilder)
5. [Wiederkehrende Aufgaben](#5-wiederkehrende-aufgaben)
6. [Bekannte Grenzen](#6-bekannte-grenzen)
7. [Eskalation](#7-eskalation)

---

## 1. Das System in zwei Minuten

Die Webseite ist reines HTML ohne eigenen Server. Die Daten liegen in SharePoint.

| Bestandteil | Aufgabe | Wo |
|---|---|---|
| Gästeseite `index.html` | Menüwahl, ohne Anmeldung | `menue.campus-sursee.ch/?klasse=CODE` |
| Verwaltung `admin.html` | Termine, Bestellungen, Firmenverzeichnis; mit Anmeldung | [menue.campus-sursee.ch/admin](https://menue.campus-sursee.ch/admin) |
| Kursblatt `kursblatt.html` | Aushang mit QR-Code, ohne Anmeldung; mit `?firma=` als Firmenblatt | `menue.campus-sursee.ch/kursblatt?klasse=CODE` |
| Menüblatt `menueblatt.html` | Bestellübersicht für die Küche; mit Anmeldung | `menue.campus-sursee.ch/menueblatt?klasse=CODE` |
| Listen «Klassen», «Bestellungen», «Firmen» | die Daten | [SharePoint-Site «Reception»](https://campussursee.sharepoint.com/sites/hot-reze/_layouts/15/viewlsts.aspx) |
| Flow B «API Klasse laden» | liefert Termin und Tagesmenüs (Lunchgate) an Seiten ohne Anmeldung | [Power Automate](https://make.powerautomate.com/environments/Default-2553fb74-5dcc-4072-8bb5-399d18f72af9/flows) |
| Flow C «API Bestellung speichern» | speichert eine Bestellung von der Gästeseite | Power Automate |
| Flow «Aufraeumen Menuewahl» | löscht täglich um 03:00 Termine und Bestellungen, die älter als 30 Tage sind | Power Automate |
| App «Menuewahl BAULUUT Admin» | Anmeldung und Zugangskontrolle der Réception | [Entra ID](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/9d344eb0-8af8-44d1-ad64-916d564e5975) |

**Wer spricht mit wem:**

- **Gästeseite und Kursblatt** haben keine Anmeldung. Sie lesen über Flow B;
  die Gästeseite speichert Bestellungen zusätzlich über Flow C.
- **Verwaltung und Menüblatt** melden die Réception mit dem Microsoft-Konto an
  und lesen und schreiben **direkt über Microsoft Graph** in SharePoint. Die
  Menütexte holt das Menüblatt trotzdem über Flow B.

Alle Kennungen und Adressen stehen in [`frontend/konfig.js`](../frontend/konfig.js).
Die Flow-Adressen enthalten eine Signatur und gehören **nicht** in Tickets, Mails
oder Chats.

---

## 2. Regelbetrieb

**Im Normalfall ist nichts zu tun.** Es gibt keinen Server zu überwachen.

Von selbst läuft:

- **Aufräumen:** Der Flow «Aufraeumen Menuewahl» löscht täglich um 03:00 alles,
  was älter als 30 Tage ist. Die Liste «Firmen» bleibt davon unberührt.
- **Anmeldung:** Die Bibliothek MSAL erneuert das Zugriffstoken still. Beim
  Schliessen des Tabs ist die Sitzung weg.
- **Tagesmenüs:** Flow B holt sie bei jedem Aufruf frisch von Lunchgate.

Nicht anfassen, ausser zur Diagnose:

- **Die SharePoint-Listen direkt.** Alles Nötige geht über die Verwaltung.
- **Flow B und C.** Sie laufen. Der Power-Automate-Designer verliert Änderungen
  leicht, siehe [Technische Dokumentation, Abschnitt 6](03_Technische_Dokumentation.md#6-power-automate-flows).

Ab und zu:

- Bei **Personalwechsel** an der Réception den Zugriff nachführen ([5.1](#51-zugriff-geben-oder-entziehen)).
- Einmal pro Quartal prüfen, ob es **Sicherheitsmeldungen** zu den beiden
  Bibliotheken gibt ([Einrichtung, Abschnitt 5](04_Einrichtung_und_Deployment.md#5-bibliotheksversion-anheben)).

---

## 3. Werkzeuge zur Fehlersuche

### 3.1 Testmodus `?mock=1`

Jede Seite kennt `?mock=1`: Sie zeigt dann Beispieldaten, ohne Anmeldung, ohne
SharePoint und ohne Flows.

- [admin?mock=1](https://menue.campus-sursee.ch/admin?mock=1) ·
  [kursblatt?mock=1](https://menue.campus-sursee.ch/kursblatt?mock=1) ·
  [menueblatt?mock=1](https://menue.campus-sursee.ch/menueblatt?mock=1) ·
  [?mock=1](https://menue.campus-sursee.ch/?mock=1)
- Gästeseite in Sonderlagen: `&falschertag=1` (falscher Tag), `&spaet=1` (nach
  10 Uhr), `&keinkurs=1` (Firmen-QR-Code ohne Termin)

**So trennt man Anzeige- von Datenproblemen:** Sieht die Seite im Testmodus
richtig aus, im Echtbetrieb aber nicht, liegt es an Daten, Berechtigungen, Flows
oder Netzwerk. Ist sie auch im Testmodus kaputt, ist die Veröffentlichung
unvollständig.

### 3.2 Browser-Konsole und Netzwerkanalyse (F12)

In der **Konsole** achten auf:

| Meldung | Siehe |
|---|---|
| «Refused to …» oder «Content Security Policy» | [4.10](#410-seite-bleibt-leer-ohne-fehlermeldung) |
| «Failed to find a valid digest in the integrity attribute» | [4.2](#42-anmeldebibliothek-lädt-nicht) |
| `AADSTS…` | [4.1](#41-anmeldung-schlägt-fehl) |
| 401, 403, 404, 429 von `graph.microsoft.com` | [4.3](#43-keine-berechtigung-oder-liste-nicht-gefunden), [4.4](#44-anmeldung-abgelaufen-oder-zu-viele-anfragen) |

In der **Netzwerkanalyse** (Reiter «Netzwerk», Seite neu laden) sollte man sehen:

| Seite | Erwartete Aufrufe |
|---|---|
| Gästeseite | ein GET an den Power-Automate-Host (Flow B), beim Absenden ein POST (Flow C) |
| Verwaltung | MSAL vom CDN, `login.microsoftonline.com`, mehrere GET an `graph.microsoft.com` |
| Kursblatt | QR-Bibliothek vom CDN, ein GET an Flow B. **Keine Anmeldung** |
| Menüblatt | MSAL, Anmeldung, Graph, dazu ein GET an Flow B für die Menütexte |

Fehlt ein Aufruf ganz, blockiert ihn meist die Content Security Policy.

### 3.3 Flow-Läufe ansehen

1. [Power Automate](https://make.powerautomate.com/environments/Default-2553fb74-5dcc-4072-8bb5-399d18f72af9/flows)
   öffnen, als `powerplatform@campus-sursee.ch` anmelden.
2. Flow öffnen: «API Klasse laden» (B), «API Bestellung speichern» (C) oder
   [«Aufraeumen Menuewahl»](https://make.powerautomate.com/environments/Default-2553fb74-5dcc-4072-8bb5-399d18f72af9/flows/063e1fa8-494b-4274-9402-608e88d59889/details).
3. Unter **Ausführungsverlauf** den Lauf zum fraglichen Zeitpunkt öffnen. Rote
   Aktionen zeigen die Fehlermeldung.

### 3.4 In SharePoint nachsehen

[Websiteinhalte der Site «Reception»](https://campussursee.sharepoint.com/sites/hot-reze/_layouts/15/viewlsts.aspx)
→ Liste «Klassen», «Bestellungen» oder «Firmen». Die Spalten sind in der
[Technischen Dokumentation, Abschnitt 3](03_Technische_Dokumentation.md#3-datenmodell) beschrieben.

- Bestellungen sucht man am einfachsten über die Spalte `KlasseCode`.
- Die Liste «Bestellungen» hat **kein Datum**. Der Bezug zum Kurstag läuft nur
  über `KlasseID`.

---

## 4. Fehlerbilder

Hinweis: Auf Kursblatt und Menüblatt erscheint **jeder** unerwartete Fehler unter
der Überschrift «Verbindungsfehler», auch ein Berechtigungsproblem. Der Text
darunter ist die eigentliche Information.

### 4.1 Anmeldung schlägt fehl

Die Verwaltung zeigt «Anmeldung nicht möglich» mit einem Code von Microsoft.

| Code | Ursache | Lösung |
|---|---|---|
| `AADSTS50011` | Die Umleitungsadresse fehlt in der App-Registrierung. | Adressen nach [Einrichtung 2.2](04_Einrichtung_und_Deployment.md#22-umleitungsadressen) ergänzen. Wichtig: auch die Fassungen **ohne** `.html` (`/admin`, `/menueblatt`, `/kursblatt`). |
| `AADSTS9002326` | Plattform steht auf «Web» statt «Single-Page-Anwendung». | Adressen unter der Plattform **SPA** eintragen, «Web» entfernen. |
| `AADSTS50105` | Person ist der App nicht zugewiesen. | Gewollt für alle ausserhalb der Réception. Sonst zuweisen, siehe [5.1](#51-zugriff-geben-oder-entziehen). |

Steht stattdessen «In konfig.js ist keine Client-ID eingetragen», ist
`frontend/konfig.js` unvollständig veröffentlicht. Datei prüfen und neu veröffentlichen.

### 4.2 Anmeldebibliothek lädt nicht

> Die Anmeldebibliothek konnte nicht geladen werden. Bitte die Internetverbindung prüfen und die Seite neu laden.

Mögliche Ursachen:

1. `cdn.jsdelivr.net` ist nicht erreichbar (offline, Firewall, Störung beim CDN).
2. Jemand hat die Version einer Bibliothek geändert, ohne die Prüfsumme
   (`integrity`) mitzuziehen. Die Konsole meldet dann «Failed to find a valid digest».
3. Ein Werbeblocker blockiert das CDN.

Lösung: Netz freigeben, Prüfsumme korrigieren ([Einrichtung, Abschnitt 5](04_Einrichtung_und_Deployment.md#5-bibliotheksversion-anheben))
oder Erweiterung ausschalten. Die **Gästeseite ist nicht betroffen**, sie lädt
keine Bibliothek. Fehlt nur die QR-Bibliothek, zeigt das Kursblatt statt des
QR-Codes einen Hinweis; der Link darunter bleibt gültig.

### 4.3 Keine Berechtigung oder Liste nicht gefunden

> Keine Berechtigung für diese Liste. Bitte prüfen, ob das Konto Zugriff auf die SharePoint-Site «Reception» hat.

Die Anmeldung klappt, aber das Konto darf nicht auf die
[SharePoint-Site «Reception»](https://campussursee.sharepoint.com/sites/hot-reze).
Die Berechtigung ist *delegiert*: Die Webseite kann nur, was die Person in
SharePoint ohnehin darf. Lösung: Person von den Besitzenden der Site als
Mitglied hinzufügen lassen.

> Liste oder Eintrag nicht gefunden. Bitte die IDs in konfig.js prüfen.

Die IDs in `frontend/konfig.js` passen nicht mehr zu SharePoint, oder der
Eintrag wurde gelöscht. Erst neu laden, dann IDs abgleichen.

### 4.4 Anmeldung abgelaufen oder zu viele Anfragen

| Meldung oder Bild | Ursache | Lösung |
|---|---|---|
| «Die Anmeldung ist abgelaufen. Bitte die Seite neu laden.» | Token abgelaufen oder Zugriff entzogen | F5. Hilft das nicht: Tab schliessen und neu öffnen. |
| Seite springt endlos zu `login.microsoftonline.com` und zurück | `frame-src` in `frontend/_headers` fehlt, oder der Browser blockiert Drittanbieter-Cookies | `_headers` prüfen; im privaten Fenster gegenprüfen. |
| «Zu viele Anfragen. Bitte einen Moment warten und neu laden.» | Microsoft Graph drosselt | Eine Minute warten. Kommt es oft vor: Läuft der Aufräum-Flow? |

### 4.5 Gast sieht «Ungültiger Link»

| Text darunter | Ursache | Lösung |
|---|---|---|
| «Dieser Link ist unvollständig.» | Link ohne `?klasse=` oder abgeschnitten | Vollständigen Link aus der Verwaltung («Link kopieren») weitergeben. |
| «Diese Klasse wurde nicht gefunden.» | Tippfehler im Code, Termin gelöscht oder älter als 30 Tage, oder Flow B gestört | Code in der Verwaltung vergleichen (Filter auf alle Termine). 0, O, 1 und I kommen im Code nie vor. Sonst Flow-B-Läufe prüfen ([3.3](#33-flow-läufe-ansehen)). |

Dieselben Meldungen gibt es auf Kursblatt und Menüblatt, wenn diese ohne
gültigen Code aufgerufen werden. Blätter immer über die Knöpfe in der
Verwaltung öffnen.

### 4.6 Gast sieht «Kein Kurs gefunden»

> Für diese Firma wurde für den heutigen Tag kein Kurs gefunden. Bitte melde dich bei der Réception.

Das ist meist **kein** technischer Fehler: Der dauerhafte Firmen-QR-Code findet
für heute keinen Termin. Die Gästeseite bildet aus Firmenschlüssel und heutigem
Datum den Code (`SORBA-K7M2` → `SORBA-K7M2-260914`) und fragt damit Flow B.

| Ursache | Lösung |
|---|---|
| Für heute kein Termin dieser Firma | Termin anlegen, Firma aus dem Klappfeld wählen. |
| Termin mit frei eingetipptem Firmennamen angelegt (keine Marke «Firmen-QR», Code ohne Bindestrich) | Termin bearbeiten, Firma aus dem Klappfeld wählen, «Code neu bilden» bestätigen. |
| Falsches Datum am Termin | Datum korrigieren; der Code wird neu gebildet. |
| Uhrzeit oder Zeitzone am Handy falsch | Handy richtig stellen. |

Gegenprobe mit Testdaten: [?mock=1&keinkurs=1](https://menue.campus-sursee.ch/?mock=1&keinkurs=1).

### 4.7 Gast sieht «Menüwahl noch nicht möglich» oder «Bestellung geschlossen»

**«Menüwahl noch nicht möglich»** ist gewollt: Gewählt werden kann nur am
Kurstag. Nennt die Meldung einen falschen Tag, stimmt das Datum am Termin nicht
oder die Uhr am Handy ist falsch gestellt.

**«Bestellung geschlossen»** erscheint, wenn in der Liste «Klassen» die Spalte
`Status` auf `geschlossen` steht. Die Verwaltung zeigt diese Spalte nicht mehr;
**direkt in SharePoint** auf `offen` setzen (klein geschrieben).

### 4.8 Gast sieht «Menüwahl geschlossen» oder «Änderungen nicht mehr möglich»

Gewollt: Nach 10:00 Uhr kann niemand mehr selbst bestellen oder ändern. Die
Réception erfasst oder ändert die Bestellung in der Verwaltung, dort gilt keine
Frist.

Erscheint die Meldung **vor** 10:00 Uhr:

1. Uhrzeit am Handy prüfen (die Frist wird im Browser geprüft).
2. Tritt es auf mehreren Geräten mit richtiger Uhrzeit auf: Wert
   `ANNAHMESCHLUSS` in `frontend/index.html` prüfen, er muss `10` sein.

### 4.9 Kursblatt verlangt eine Anmeldung oder ist «nicht abrufbar»

Das Kursblatt muss **ohne** Anmeldung laden, damit auch eine externe Kursleitung
es öffnen kann.

- **Leitet es zur Microsoft-Anmeldung um:** Im privaten Fenster testen. In
  Cloudflare prüfen, ob der neueste Stand veröffentlicht ist.
- **«Kursblatt nicht abrufbar»:** Flow B hat zu diesem Code nichts geliefert.
  Code prüfen, dann die Flow-Läufe. Die Réception kommt in der Zwischenzeit über
  den Knopf «Mit Konto anmelden» ans Blatt.

### 4.10 Seite bleibt leer, ohne Fehlermeldung

Das tückischste Fehlerbild. Fast immer blockiert die **Content Security Policy**
in [`frontend/_headers`](../frontend/_headers) einen Aufruf, still und ohne
Fehlertext.

1. Konsole öffnen und nach «Refused to» oder «Content Security Policy» suchen.
2. Die fehlende Adresse in `_headers` in der passenden Zeile ergänzen und neu
   veröffentlichen. Typisch: Ein Flow wurde neu erstellt und hat eine neue Adresse.

Zweite mögliche Ursache: Eine der Dateien `konfig.js`, `auth.js` oder `graph.js`
fehlt (404 in der Netzwerkanalyse). Den ganzen Ordner `frontend` neu veröffentlichen.

### 4.11 Tagesmenüs fehlen oder stehen falsch

**Fehlen die Menütexte** («Die Tagesmenüs sind zurzeit nicht abrufbar»): Das
Menüblatt ist trotzdem vollständig, nur die Beschreibungen fehlen.

1. Gästeseite eines heutigen Termins öffnen: Fehlen sie dort auch, liegt es an
   Flow B oder Lunchgate.
2. Flow-B-Läufe ansehen ([3.3](#33-flow-läufe-ansehen)). Kommen von Lunchgate
   `key_0`, `key_1` und `key_2` zurück? Kommt nur `key_0`, steht in der Abfrage
   fälschlich `&limit=1`.
3. Als Notlösung die Spalten `Suppe`, `Salat`, `Menu1`, `Menu2`, `Dessert` des
   Termins in SharePoint von Hand füllen. Flow B nimmt sie, wenn Lunchgate nichts liefert.

**Steht die ganze Vorspeisenzeile bei «Tagessuppe»:** Flow B trennt die Zeile am
Wort « oder ». Hat die Küche anders geschrieben (zum Beispiel mit «/»), greift
das nicht. Lösung: Das Restaurant bitten, «Tagessuppe oder Tagessalat» zu schreiben.

### 4.12 QR-Code lässt sich nicht scannen

| Ursache | Lösung |
|---|---|
| Ausdruck verkleinert | Im Druckdialog 100 % wählen, «An Seite anpassen» aus. Das Symbol misst rund 63 mm. |
| Schlechter Ausdruck, Knick, graues Papier | Auf weissem Papier neu drucken. |
| Weisser Rand um den Code fehlt | Jemand hat `margin` im Code verändert, siehe [Hinweise zum Quellcode](06_Hinweise_Quellcode.md). |
| Handy kann keine QR-Codes | Der Link steht als Text unter dem Code. |

### 4.13 Bestellungen fehlen in der Verwaltung

Gäste sagen, sie hätten bestellt, aber die Verwaltung zeigt nichts.

1. **Richtiger Termin?** Zwei ähnliche Termine am selben Tag verwechselt?
2. **Neu laden** (F5) und den Termin nochmals anklicken.
3. **In SharePoint nachsehen**, Liste «Bestellungen», nach `KlasseCode` filtern.
   Stehen sie dort, ist die `KlasseID` falsch (zum Beispiel weil der Termin
   gelöscht und neu angelegt wurde). Fehlen sie, hat Flow C nicht gespeichert:
   Flow-C-Läufe prüfen.
4. Wer die Bestätigung «Danke, …!» nicht gesehen hat, hat **nicht** bestellt.
   Bei «Senden fehlgeschlagen» wurde nichts gespeichert.

**Doppelte Namen auf dem Menüblatt:** Die Gästeseite merkt sich die Bestellung
nur auf dem Gerät. Wer auf einem anderen Handy nochmals bestellt, erzeugt einen
zweiten Eintrag. Die Réception löscht den überzähligen in der Verwaltung.

### 4.14 Reiter «Firmen» meldet, die Liste fehle

Die Verwaltung findet die Liste «Firmen» nicht. Die Terminverwaltung läuft
trotzdem weiter.

- Liste fehlt: Knopf «Liste jetzt anlegen» klicken.
- Liste heisst anders: in SharePoint genau «Firmen» nennen.
- In `konfig.js` steht unter `listeFirmen` eine falsche ID: korrigieren oder leeren.

### 4.15 Weitere Meldungen

| Meldung | Bedeutung und Lösung |
|---|---|
| «Senden fehlgeschlagen. Bitte versuche es nochmals.» | Flow C nicht erreichbar. Nichts gespeichert. Nochmals senden, sonst Flow C prüfen. |
| «Das Menü konnte nicht geladen werden.» | Gästeseite erreicht Flow B nicht. «Nochmals versuchen», sonst Flow B prüfen. |
| «Fehler von Microsoft Graph (HTTP *nnn*)» | Graph-Fehler ohne eigenen Text. Nummer ins Ticket. |
| «Kopieren nicht möglich, bitte von Hand markieren.» | Zwischenablage gesperrt. Link von Hand kopieren; Seite über `https://` geöffnet? |
| «Field 'Teilnehmer' is not recognized» | Spalte `Teilnehmer` fehlt in der Liste «Klassen». Anlegen (Typ Zahl). |
| Kursblatt ist deutsch statt französisch | Beim Öffnen stand das Klappfeld auf «DE». Neu öffnen mit «FR». |

Meldungen, die **kein** Fehler sind (fehlender Titel, Firma doppelt, zweiter
Firmen-Termin am selben Tag usw.), erklärt die Seite selbst.

---

## 5. Wiederkehrende Aufgaben

### 5.1 Zugriff geben oder entziehen

Zugriff braucht **zwei Dinge**: die Zuweisung in Entra ID **und** Zugriff auf
die SharePoint-Site «Reception».

**Neue Person:**

1. [entra.microsoft.com](https://entra.microsoft.com) → **Unternehmensanwendungen**
   → «Menuewahl BAULUUT Admin» → **Benutzer und Gruppen** → **Benutzer hinzufügen**.
2. Prüfen, ob die Person Mitglied der [Site «Reception»](https://campussursee.sharepoint.com/sites/hot-reze) ist.
3. Person öffnet [menue.campus-sursee.ch/admin](https://menue.campus-sursee.ch/admin) und sieht die Termine.

**Person entfernen:** Gleicher Weg, Person markieren, **Entfernen**. Eine offene
Sitzung läuft noch, bis der Tab geschlossen wird; für sofortigen Entzug die
Anmeldesitzungen des Kontos in Entra ID widerrufen.

Ohne Entra ID P1 lassen sich nur einzelne Personen zuweisen, keine Gruppen. Das
gehört deshalb in den Prozess für Ein- und Austritte.

### 5.2 Änderung veröffentlichen oder zurücknehmen

Siehe [Einrichtung, Abschnitt 4](04_Einrichtung_und_Deployment.md#4-eine-änderung-veröffentlichen).
Kurz: Push auf `main` veröffentlicht automatisch. Geht danach etwas nicht mehr,
in Cloudflare unter **Deployments** beim letzten guten Stand «Rollback to this
deployment» wählen.

---

## 6. Bekannte Grenzen

Bewusst in Kauf genommen. Begründungen in [Entscheide und Verlauf](05_Entscheide_und_Verlauf.md).

1. **Datum und 10-Uhr-Frist prüft nur der Browser**, nicht Flow C. Wer die
   Schnittstelle direkt aufruft, könnte trotzdem bestellen. Für ein Mittagsmenü vertretbar.
2. **Die Trennung Suppe/Salat hängt am Wort « oder »** in Lunchgate ([4.11](#411-tagesmenüs-fehlen-oder-stehen-falsch)).
3. **Gelöschte Termine hinterlassen ihre Bestellungen** in SharePoint, bis der
   Aufräum-Flow sie nach 30 Tagen entfernt.
4. **Zugriff wird von Hand gepflegt**, bei jedem Personalwechsel.
5. **Anmeldung und QR-Code brauchen `cdn.jsdelivr.net`.** Die Gästeseite nicht.
6. **Die Gästeseite merkt sich die Bestellung nur auf dem Gerät** ([4.13](#413-bestellungen-fehlen-in-der-verwaltung)).
7. **Der Firmen-QR-Code braucht trotzdem einen Termin pro Kurstag**, und pro
   Firma und Tag ist nur einer möglich.

---

## 7. Eskalation

**Wenn nichts hilft, in dieser Reihenfolge:**

1. Mit `?mock=1` eingrenzen ([3.1](#31-testmodus-mock1)).
2. Mit zweitem Konto und zweitem Gerät gegenprüfen. Betrifft es nur eine Person,
   liegt es an Berechtigung oder Browser.
3. Nach einer Veröffentlichung: in Cloudflare auf den letzten guten Stand zurücksetzen.
4. **Notbetrieb:** Die Küche braucht die Bestellungen, nicht die Webseite. In
   SharePoint die Liste «Bestellungen» nach `KlasseCode` filtern und drucken.
   Fällt alles aus: Papierblatt.
5. Ticket eröffnen.

**Ein Ticket enthält:** Code und Name des Termins · Zeitpunkt auf die Minute ·
Konto (oder «Gästeseite») · Fehlermeldung wörtlich oder als Bildschirmfoto ·
Browser und Gerät · betroffene Seite · ob es immer oder nur einmal auftritt.

| Thema | Zuständig |
|---|---|
| Anmeldung, Zuweisung, App-Registrierung | ICT-Services, Entra-ID-Administration |
| Berechtigung auf die Site «Reception» | Besitzende der SharePoint-Site |
| Flows, Lunchgate-Anbindung | ICT-Services, Konto `powerplatform@campus-sursee.ch` |
| Webseite, Veröffentlichung | ICT-Services |
| Inhalt der Tagesmenüs | Restaurant BAULÜÜT |
| Störung bei Cloudflare, jsDelivr oder Lunchgate | Statusseite des Anbieters prüfen, abwarten |
