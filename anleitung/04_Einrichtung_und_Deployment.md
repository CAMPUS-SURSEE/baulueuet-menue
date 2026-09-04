# Einrichtung und Veröffentlichung

**Stand:** 04.09.2026

Dieses Dokument beschreibt, wie das System eingerichtet wird und wie eine Änderung live geht. Wer nur eine bestehende Installation betreut, findet die häufigen Fälle in `02_Betriebshandbuch_Support.md`.

---

## Inhalt

1. [Was einmalig eingerichtet werden muss](#1-was-einmalig-eingerichtet-werden-muss)
2. [App-Registrierung in Entra ID](#2-app-registrierung-in-entra-id)
3. [Zugang auf die Réception einschränken](#3-zugang-auf-die-réception-einschränken)
4. [Eine Änderung veröffentlichen](#4-eine-änderung-veröffentlichen)
5. [Erstinbetriebnahme, Prüfliste](#5-erstinbetriebnahme-prüfliste)
6. [Bibliotheksversion anheben](#6-bibliotheksversion-anheben)
7. [Von Null wieder aufbauen](#7-von-null-wieder-aufbauen)

---

## 1. Was einmalig eingerichtet werden muss

| Baustein | Zustand | Wer |
|---|---|---|
| SharePoint-Listen «Klassen» und «Bestellungen» | vorhanden | ICT |
| Power Automate Flows B, C und Aufräum-Flow | vorhanden und in Betrieb | ICT |
| Cloudflare-Pages-Projekt auf `menue.campus-sursee.ch` | vorhanden | ICT |
| App-Registrierung in Entra ID | angelegt, Client-ID eingetragen | ICT |
| Benutzerzuweisung der Réception | **noch zu prüfen** | ICT |
| Erste Veröffentlichung der neuen Seiten | **noch offen** | ICT |

---

## 2. App-Registrierung in Entra ID

Die Registrierung besteht bereits unter dem Namen **«Menuewahl BAULUUT Admin»** mit der Client-ID `9d344eb0-8af8-44d1-ad64-916d564e5975`. Die folgenden Schritte sind zum Nachvollziehen und zum Prüfen gedacht.

### 2.1 Anlegen

1. `https://entra.microsoft.com` öffnen, als Administrator anmelden.
2. **Identität, Anwendungen, App-Registrierungen, Neue Registrierung**
3. Ausfüllen:
   - **Name:** `Menuewahl BAULUUT Admin`
   - **Unterstützte Kontotypen:** nur Konten in diesem Organisationsverzeichnis, einzelner Mandant
   - **Umleitungs-URI:** Plattform **Single-Page-Anwendung (SPA)**, Wert `https://menue.campus-sursee.ch/admin` (ohne `.html`, Begründung in Abschnitt 2.2)
4. Registrieren.

> Die Plattform muss **SPA** sein, nicht «Web». Nur bei SPA erlaubt Microsoft den Tokentausch direkt aus dem Browser. Bei falscher Einstellung erscheint nach der Anmeldung `AADSTS9002326`.

### 2.2 Umleitungsadressen

**Verwalten, Authentifizierung**, unter der Plattform *Single-Page-Anwendung* müssen diese Adressen stehen:

```
https://menue.campus-sursee.ch/admin
https://menue.campus-sursee.ch/termine
https://menue.campus-sursee.ch/menueblatt
https://menue.campus-sursee.ch/kursblatt
https://menue.campus-sursee.ch/admin.html
https://menue.campus-sursee.ch/termine.html
https://menue.campus-sursee.ch/menueblatt.html
https://menue.campus-sursee.ch/kursblatt.html
http://localhost:8123/admin.html
http://localhost:8123/termine.html
http://localhost:8123/menueblatt.html
http://localhost:8123/kursblatt.html
```

> **Wegen Cloudflare Pages nötig: die vier Adressen ohne `.html`.** Cloudflare Pages beantwortet `/admin.html` mit einer Umleitung auf `/admin`. Die Seite meldet sich immer auf der Adresse an, auf der sie tatsächlich läuft, also auf der Fassung ohne Endung. Fehlen diese vier Einträge, scheitert die Anmeldung mit `AADSTS50011`.
>
> **Die Adressen mit `.html` bleiben trotzdem stehen.** Sie kosten nichts und decken den lokalen Betrieb sowie den Fall ab, dass die Seiten je wieder auf einem Hoster ohne diese Umleitung liegen.
>
> **Seit dem 04.09.2026 neu: `termine`.** Auch diese Adresse muss ergänzt werden, sonst scheitert die Terminübersicht mit `AADSTS50011`.
>
> **`kursblatt` bleibt in der Liste**, obwohl das Kursblatt seit dem 04.09.2026 im Normalfall ohne Anmeldung lädt. Auf seiner Fehlerkarte gibt es den Knopf «Mit Konto anmelden» als Rückfall, wenn Flow B nicht antwortet; ohne den Eintrag scheitert dieser Weg.

Die `localhost`-Adressen dienen dem lokalen Testen und können weggelassen werden, wenn nie lokal getestet wird. Sie tragen weiterhin `.html`, weil `code\serve.ps1` die Dateien direkt ausliefert und nicht umleitet.

Jede Seite meldet sich auf ihrer eigenen Adresse an, daher die getrennten Einträge. Abfragezeichenfolgen wie `?klasse=CODE` gehören **nicht** dazu; MSAL merkt sich die vollständige Adresse selbst und kehrt am Ende dorthin zurück.

Speichern nicht vergessen.

### 2.3 Berechtigungen

**Verwalten, API-Berechtigungen, Berechtigung hinzufügen, Microsoft Graph, Delegierte Berechtigungen**

| Berechtigung | Wofür |
|---|---|
| `Sites.ReadWrite.All` | Klassen und Bestellungen lesen und schreiben |
| `User.Read` | Name der angemeldeten Person anzeigen, meist schon vorhanden |

Danach **Administratorzustimmung für Campus Sursee erteilen**.

> *Delegiert* heisst: Das Token kann nur das, was die angemeldete Person in SharePoint ohnehin darf. Wer keinen Zugriff auf die Site «Reception» hat, bekommt über diese Seiten auch keinen. Es ist kein Generalschlüssel.

### 2.4 Client-ID in der Webseite

In `frontend\konfig.js` steht bereits:

```js
mandantId: "2553fb74-5dcc-4072-8bb5-399d18f72af9",
clientId:  "9d344eb0-8af8-44d1-ad64-916d564e5975",
```

Nur falls je eine neue Registrierung angelegt wird, muss die Anwendungs-ID von deren Übersichtsseite hier ersetzt werden.

> Client-ID und Mandanten-ID stehen anschliessend im öffentlich lesbaren Quelltext. Das ist bei Single-Page-Anwendungen so vorgesehen und unbedenklich: Es sind Kennungen, keine Geheimnisse. Der Schutz kommt aus der Anmeldung und aus der Benutzerzuweisung im nächsten Abschnitt.

---

## 3. Zugang auf die Réception einschränken

**Das ist der eigentliche Türsteher.** Ohne diesen Schritt könnte sich jede Person im Mandanten an der Verwaltung anmelden.

1. **Identität, Anwendungen, Unternehmensanwendungen, `Menuewahl BAULUUT Admin`**
2. **Eigenschaften, Zuweisung erforderlich = Ja**, speichern
3. **Benutzer und Gruppen, Benutzer hinzufügen**, die Personen der Réception auswählen

Ohne Entra ID P1 lassen sich nur einzelne Personen zuweisen, keine Gruppen. Bei einer Handvoll Leuten ist das kein Problem, es **muss aber bei Personalwechsel nachgeführt werden**. Diese Aufgabe gehört in den Prozess für Ein- und Austritte.

Wer nicht zugewiesen ist, erhält bei der Anmeldung `AADSTS50105`.

---

## 4. Eine Änderung veröffentlichen

Cloudflare Pages ist an das Git-Repository `CAMPUS-SURSEE/baulueuet-menue` angebunden und veröffentlicht bei jedem Push auf `main` automatisch.

1. Änderung lokal machen und mit `?mock=1` prüfen, siehe `03_Technische_Dokumentation.md`, Abschnitt 11.
2. Committen und auf `main` pushen.
3. In Cloudflare unter **Workers & Pages, `baulueuet-menue`, Deployments** verfolgen, bis der Eintrag «Success» heisst.
4. Danach die Seite mit geleertem Zwischenspeicher aufrufen und kurz gegenprüfen.

Der ausgelieferte Ordner steht in `wrangler.toml` im Wurzelverzeichnis:

| Einstellung | Wert | Warum |
|---|---|---|
| `pages_build_output_dir` | `frontend` | nur dieser Ordner geht ins Netz, `anleitung`, `code` und `Vorlagen` bleiben aussen vor |
| `name` | `baulueuet-menue` | muss gleich lauten wie das Projekt in Cloudflare Pages, sonst bricht der Build ab |
| `compatibility_date` | Datum | von Cloudflare in dieser Datei erwartet, ohne Wirkung, solange es keine Pages Functions gibt |

Diese Datei hat Vorrang vor den entsprechenden Feldern in der Cloudflare-Oberfläche; dort sind sie nur noch lesbar. Wird sie geändert, gilt die Änderung ab dem nächsten Deploy.

Zwei Felder stehen weiterhin nur in der Oberfläche, unter **Settings, Build**:

| Feld | Wert |
|---|---|
| Build command | leer |
| Root directory | leer, also `/` |

> **Nichts nachbearbeiten lassen.** Die Seiten binden zwei Bibliotheken mit fester Version und Prüfsumme (`integrity="sha384-..."`) ein. Cloudflare Pages liefert die Dateien unverändert aus; wichtig ist nur, dass für die Domäne **Rocket Loader** und ähnliche Skriptoptimierungen ausgeschaltet bleiben, sonst verweigert der Browser das Laden.

> **Ohne Git veröffentlichen** geht weiterhin: im Projekt **Create deployment, Upload assets**, dort den Ordner `frontend` hochladen. Dabei muss immer der **ganze Ordner** hochgeladen werden, nicht einzelne Dateien; Cloudflare ersetzt den Inhalt vollständig. Dieser Weg umgeht das Repository und sollte die Ausnahme bleiben, weil der veröffentlichte Stand danach nicht mehr dem Repository entspricht.

Seit der Anbindung an Git ist dieses Repository der massgebende Stand: Was in `frontend\` liegt, ist das, was im Netz steht. Ein separates Arbeitsverzeichnis, aus dem nachträglich zurückgespielt werden müsste, gibt es nicht mehr.

---

## 5. Erstinbetriebnahme, Prüfliste

- [ ] Cloudflare Pages mit dem Git-Repository verbunden, erster Deploy aus `main` ist «Success»
- [ ] `https://menue.campus-sursee.ch/admin.html` öffnet sich, landet auf `/admin` und die Anmeldung gelingt
      *Dieser eine Schritt belegt auf einmal, dass Umleitungsadresse, Graph-Berechtigung und Benutzerzuweisung stimmen.*
- [ ] Testklasse angelegt, Zugangscode wurde automatisch erzeugt
- [ ] In den Details der Testklasse steht die kleine Zeile «Erstellt … von …» mit dem eigenen Namen
- [ ] Gästelink kopiert, Gästeseite zeigt die Klasse und die Tagesmenüs
- [ ] Eine Testbestellung abgegeben, sie erscheint in der Verwaltung
- [ ] **Kursblatt-Link in einem privaten Fenster geöffnet**, ohne Anmeldung: Das Blatt erscheint samt QR-Code
- [ ] `termine.html` öffnet sich, die Testklasse steht unter ihrem Datum
- [ ] Kursblatt gedruckt, **QR-Code mit einer echten Handykamera gescannt** und der Link führt zur richtigen Klasse
- [ ] Menüblatt gedruckt, Namen, Vorspeisen, Hauptgänge und Bemerkungen stimmen
- [ ] Ein Konto **ohne** Zuweisung ausprobiert, die Anmeldung wird abgelehnt
- [ ] Réception eingewiesen, `01_Anleitung_Reception.md` abgegeben
- [ ] Alte Power App «Menuewahl BAULUUT Admin» gelöscht oder deaktiviert, damit niemand parallel damit arbeitet

---

## 6. Bibliotheksversion anheben

Die Seiten laden zwei Bibliotheken von `cdn.jsdelivr.net`, festgenagelt auf eine Version und abgesichert mit einer Prüfsumme.

| Bibliothek | Version | Eingebunden in |
|---|---|---|
| `@azure/msal-browser` | 4.30.0 | `admin.html`, `termine.html`, `menueblatt.html`, `kursblatt.html` |
| `qrcode-generator` | 1.4.4 | `kursblatt.html` |

Vorgehen beim Anheben:

1. Neue Adresse zusammensetzen, zum Beispiel
   `https://cdn.jsdelivr.net/npm/@azure/msal-browser@4.31.0/lib/msal-browser.min.js`
2. Prüfsumme berechnen:
   ```
   curl -sL <URL> | openssl dgst -sha384 -binary | openssl base64 -A
   ```
3. In **allen** betroffenen Dateien sowohl die Adresse als auch den Wert im `integrity`-Attribut ersetzen. Beides muss zusammenpassen, sonst verweigert der Browser das Laden und die Seite meldet, die Anmeldebibliothek sei nicht ladbar.
4. Mit `?mock=1` und danach mit echter Anmeldung prüfen, erst dann veröffentlichen.

---

## 7. Von Null wieder aufbauen

Falls die Webseite je vollständig neu aufgesetzt werden muss:

1. **SharePoint:** Listen «Klassen» und «Bestellungen» mit den Spalten aus `03_Technische_Dokumentation.md`, Abschnitt 4. Die internen Feldnamen müssen genau stimmen, sonst greift `graph.js` ins Leere. Neue Listen-IDs in `konfig.js` eintragen.
2. **Power Automate:** Flow B und Flow C neu bauen, Aufbau und Lunchgate-Anbindung siehe `03_Technische_Dokumentation.md`, Abschnitt 7. Neue Aufruf-Adressen in `konfig.js` und im Kopf von `index.html` eintragen. Den Aufräum-Flow nicht vergessen.
3. **Entra ID:** App-Registrierung nach Abschnitt 2 dieses Dokuments.
4. **Cloudflare Pages:** neues Projekt aus dem Git-Repository anlegen, Framework-Vorlage «None», Build command leer lassen. Der ausgelieferte Ordner kommt aus `wrangler.toml`; der Projektname muss dem Feld `name` darin entsprechen. Anschliessend unter **Custom domains** die Domäne `menue.campus-sursee.ch` verbinden.
5. Prüfliste aus Abschnitt 5 abarbeiten.

Der vollständige Quellcode liegt in `frontend\`. Er enthält keine Abhängigkeit zu einem Bauprozess: Was dort liegt, ist genau das, was ausgeliefert wird.
