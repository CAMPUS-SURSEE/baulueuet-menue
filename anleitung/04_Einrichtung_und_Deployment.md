# Einrichtung und Veröffentlichung

Wie das System eingerichtet ist und wie eine Änderung live geht. Für Störungen
im laufenden Betrieb: [Betriebshandbuch](02_Betriebshandbuch_Support.md).

**Stand:** 28.09.2026

---

## Inhalt

1. [Die Bausteine](#1-die-bausteine)
2. [App-Registrierung in Entra ID](#2-app-registrierung-in-entra-id)
3. [SharePoint-Listen](#3-sharepoint-listen)
4. [Eine Änderung veröffentlichen](#4-eine-änderung-veröffentlichen)
5. [Bibliotheksversion anheben](#5-bibliotheksversion-anheben)
6. [Von Null wieder aufbauen](#6-von-null-wieder-aufbauen)

---

## 1. Die Bausteine

| Baustein | Wo | Link |
|---|---|---|
| Listen «Klassen», «Bestellungen», «Firmen» | SharePoint-Site «Reception» | [Websiteinhalte](https://campussursee.sharepoint.com/sites/hot-reze/_layouts/15/viewlsts.aspx) |
| Flow B, Flow C, Aufräum-Flow | Power Automate, Konto `powerplatform@campus-sursee.ch` | [Flows](https://make.powerautomate.com/environments/Default-2553fb74-5dcc-4072-8bb5-399d18f72af9/flows) |
| App «Menuewahl BAULUUT Admin» | Entra ID | [App-Registrierung](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/9d344eb0-8af8-44d1-ad64-916d564e5975) |
| Webseite auf `menue.campus-sursee.ch` | Cloudflare Pages, Projekt `baulueuet-menue` | [Cloudflare](https://dash.cloudflare.com/?to=/:account/pages/view/baulueuet-menue) |
| Quellcode | GitHub | [Repository](https://github.com/CAMPUS-SURSEE/baulueuet-menue) |

Alle Kennungen, die die Webseite braucht, stehen in
[`frontend/konfig.js`](../frontend/konfig.js). Die Gästeseite hat zusätzlich
eigene Einträge im Kopf von [`frontend/index.html`](../frontend/index.html).

---

## 2. App-Registrierung in Entra ID

Die Registrierung besteht bereits. Die Schritte dienen zum Prüfen und für einen
Neuaufbau.

### 2.1 Anlegen

1. [entra.microsoft.com](https://entra.microsoft.com) → **App-Registrierungen** → **Neue Registrierung**.
2. Name `Menuewahl BAULUUT Admin`, nur Konten dieses Mandanten.
3. Umleitungs-URI: Plattform **Single-Page-Anwendung (SPA)**, Wert
   `https://menue.campus-sursee.ch/admin`.

> Die Plattform muss **SPA** sein, nicht «Web». Sonst scheitert die Anmeldung
> mit `AADSTS9002326`.

### 2.2 Umleitungsadressen

Unter **Authentifizierung**, Plattform *Single-Page-Anwendung*:

```
https://menue.campus-sursee.ch/admin
https://menue.campus-sursee.ch/menueblatt
https://menue.campus-sursee.ch/kursblatt
https://menue.campus-sursee.ch/admin.html
https://menue.campus-sursee.ch/menueblatt.html
https://menue.campus-sursee.ch/kursblatt.html
http://localhost:8123/admin.html
http://localhost:8123/menueblatt.html
http://localhost:8123/kursblatt.html
```

- **Die Adressen ohne `.html` sind die wichtigen.** Cloudflare leitet
  `/admin.html` auf `/admin` um, und die Seite meldet sich dort an. Fehlen sie,
  kommt `AADSTS50011`.
- Die Fassungen mit `.html` schaden nicht und decken andere Hoster ab.
- `localhost` braucht es nur für Tests auf dem eigenen PC.
- `kursblatt` braucht es für den Notweg «Mit Konto anmelden».
- Nie `?klasse=…` mit eintragen.

### 2.3 Berechtigungen

**API-Berechtigungen** → Microsoft Graph → **Delegiert**:

| Berechtigung | Wofür |
|---|---|
| `Sites.ReadWrite.All` | Listen lesen und schreiben, Liste «Firmen» anlegen |
| `User.Read` | Namen der angemeldeten Person anzeigen |

Danach **Administratorzustimmung erteilen**.

### 2.4 Zugang auf die Réception beschränken

**Das ist der eigentliche Türsteher.** Ohne diesen Schritt könnte sich jede
Person bei Campus Sursee anmelden.

1. **Unternehmensanwendungen** → «Menuewahl BAULUUT Admin».
2. **Eigenschaften** → **Zuweisung erforderlich = Ja**.
3. **Benutzer und Gruppen** → die Personen der Réception hinzufügen.

Zusätzlich braucht jede Person Zugriff auf die SharePoint-Site «Reception».

---

## 3. SharePoint-Listen

Die Spalten sind in der [Technischen Dokumentation](03_Technische_Dokumentation.md#3-datenmodell)
beschrieben. Beim Anlegen zählt der **interne Spaltenname**; er muss genau
stimmen, sonst findet `graph.js` die Daten nicht.

- **«Klassen»** und **«Bestellungen»**: von Hand anlegen, IDs in `konfig.js`
  unter `listeKlassen` und `listeBestellungen` eintragen.
- **«Firmen»**: am einfachsten in der Verwaltung, Reiter «Firmen», Knopf
  **«Liste jetzt anlegen»**. Oder von Hand: Liste mit Namen `Firmen` und
  Textspalte `Schluessel`. Die ID darf unter `listeFirmen` in `konfig.js`
  stehen; leer ist auch erlaubt.

> **Neue Spalte in «Klassen»?** Erst in SharePoint anlegen, dann die neue
> Fassung der Webseite veröffentlichen. Sonst schlägt das Speichern fehl.

---

## 4. Eine Änderung veröffentlichen

Cloudflare Pages ist mit diesem Repository verbunden. **Jeder Push auf `main`
geht automatisch live**, meist in unter einer Minute.

1. Änderung machen und lokal mit `?mock=1` prüfen
   ([Lokal testen](03_Technische_Dokumentation.md#9-lokal-testen)).
2. Auf `main` bringen (direkt oder über einen Pull Request).
3. In [Cloudflare](https://dash.cloudflare.com/?to=/:account/pages/view/baulueuet-menue)
   unter **Deployments** warten, bis «Success» steht.
4. Seite mit Strg + F5 neu laden und kurz prüfen: Verwaltung öffnen, Termin
   wählen, Kursblatt und Menüblatt öffnen, einen Gästelink testen.

**Etwas ist kaputt?** In Cloudflare unter **Deployments** beim letzten guten
Stand über das Menü «…» **Rollback to this deployment** wählen. Danach den
Fehler im Repository beheben, sonst bringt der nächste Push ihn zurück.

**Vorschau:** Pull Requests und andere Zweige erhalten bei Cloudflare eine
eigene Vorschau-Adresse (`….pages.dev`). Dort funktioniert nur `?mock=1`, weil
diese Adressen nicht in Entra ID eingetragen sind.

**Einstellungen** stehen in [`wrangler.toml`](../wrangler.toml):

| Einstellung | Wert | Bedeutung |
|---|---|---|
| `name` | `baulueuet-menue` | muss gleich heissen wie das Projekt in Cloudflare |
| `pages_build_output_dir` | `frontend` | nur dieser Ordner geht ins Netz |

In der Cloudflare-Oberfläche bleiben **Build command** und **Root directory**
leer. **Rocket Loader** und ähnliche Skript-Optimierungen müssen ausgeschaltet
bleiben, sonst stimmen die Prüfsummen der Bibliotheken nicht mehr.

Sicherheitsheader stehen nur in [`frontend/_headers`](../frontend/_headers),
nicht in `wrangler.toml`.

> **Ohne Git** lässt sich im Notfall der ganze Ordner `frontend` in Cloudflare
> unter **Create deployment → Upload assets** hochladen. Danach entspricht der
> Stand im Netz aber nicht mehr dem Repository; darum die Ausnahme.

---

## 5. Bibliotheksversion anheben

Nur bei einer Sicherheitsmeldung oder einem konkreten Fehler. Sonst ist die
feste Version die sicherere Wahl.

| Bibliothek | Version | In |
|---|---|---|
| `@azure/msal-browser` | 4.30.0 | `admin.html`, `menueblatt.html`, `kursblatt.html` |
| `qrcode-generator` | 1.4.4 | `kursblatt.html` |

1. Neue Adresse bilden, zum Beispiel
   `https://cdn.jsdelivr.net/npm/@azure/msal-browser@4.31.0/lib/msal-browser.min.js`
2. Prüfsumme berechnen:
   ```
   curl -sL <URL> | openssl dgst -sha384 -binary | openssl base64 -A
   ```
3. In **allen** betroffenen Dateien Adresse **und** `integrity="sha384-…"`
   ersetzen. Passen sie nicht zusammen, lädt der Browser die Bibliothek nicht.
4. Mit `?mock=1`, dann mit echter Anmeldung prüfen, dann veröffentlichen.

---

## 6. Von Null wieder aufbauen

1. **SharePoint:** Listen nach [Abschnitt 3](#3-sharepoint-listen) anlegen, IDs
   in `konfig.js` eintragen.
2. **Power Automate:** Flow B, Flow C und den Aufräum-Flow neu bauen
   ([Technische Dokumentation, Abschnitt 6](03_Technische_Dokumentation.md#6-power-automate-flows)).
   Neue Adressen in `konfig.js`, im Kopf von `index.html` **und** in
   `frontend/_headers` (`connect-src`) eintragen.
3. **Entra ID:** nach [Abschnitt 2](#2-app-registrierung-in-entra-id).
   Neue Client-ID in `konfig.js`.
4. **Cloudflare Pages:** neues Projekt aus dem Repository, Vorlage «None»,
   Build command leer. Projektname wie `name` in `wrangler.toml`. Unter
   **Custom domains** `menue.campus-sursee.ch` verbinden.
5. Prüfliste unten abarbeiten.

> Wird das **Firmenverzeichnis** neu aufgebaut, bekommen die Firmen neue
> Schlüssel. Alle gedruckten Firmenblätter müssen dann neu gedruckt werden.

### Prüfliste

- [ ] [/admin](https://menue.campus-sursee.ch/admin) öffnet sich und die Anmeldung
      gelingt. *Das belegt auf einmal Umleitungsadresse, Berechtigung und Zuweisung.*
- [ ] Ein Konto **ohne** Zuweisung wird abgelehnt.
- [ ] Testtermin anlegen: Code entsteht, die Zeile «Erstellt … von …» zeigt den eigenen Namen.
- [ ] Gästelink öffnen: Kurs und Tagesmenüs erscheinen. Testbestellung abgeben;
      sie erscheint in der Verwaltung.
- [ ] Kursblatt-Link **im privaten Fenster** öffnen: Blatt erscheint ohne Anmeldung.
- [ ] Kursblatt auf «FR» öffnen: Blatt und QR-Code-Link sind französisch.
- [ ] Kursblatt drucken und den QR-Code **mit einem echten Handy** scannen.
- [ ] Menüblatt drucken: Namen, Menüs und Bemerkungen stimmen.
- [ ] Reiter «Firmen» zeigt das Verzeichnis. Testfirma anlegen, Termin mit ihr
      anlegen (Code `SCHLUESSEL-JJMMTT`, Marke «Firmen-QR»), Firmenblatt drucken.
- [ ] Firmen-Link an einem Tag **ohne** Termin öffnen: «Kein Kurs gefunden».
- [ ] Réception eingewiesen, [Anleitung](01_Anleitung_Reception.md) abgegeben.
