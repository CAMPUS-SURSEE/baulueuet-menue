# Menüwahl Restaurant BAULÜÜT

Kursteilnehmende am Campus Sursee wählen ihr Mittagsmenü über eine Webseite statt auf einem Papierblatt. Die Réception legt pro Kurs eine Klasse an und gibt den Teilnehmenden einen Link oder ein Blatt mit QR-Code. Die Küche erhält die gesammelten Bestellungen ausgedruckt.

**Stand dieser Ablage:** 04.09.2026

---

## Wo fange ich an

| Ich bin | Ich lese |
|---|---|
| an der Réception und will das System bedienen | [`anleitung/01_Anleitung_Reception.md`](anleitung/01_Anleitung_Reception.md) |
| bei den ICT-Services und habe eine Störung | [`anleitung/02_Betriebshandbuch_Support.md`](anleitung/02_Betriebshandbuch_Support.md) |
| bei den ICT-Services und will verstehen, wie es gebaut ist | [`anleitung/03_Technische_Dokumentation.md`](anleitung/03_Technische_Dokumentation.md) |
| dabei, etwas zu ändern oder zu veröffentlichen | [`anleitung/04_Einrichtung_und_Deployment.md`](anleitung/04_Einrichtung_und_Deployment.md) |
| neu im Projekt und frage mich, warum es so ist | [`anleitung/05_Entscheide_und_Verlauf.md`](anleitung/05_Entscheide_und_Verlauf.md) |
| dabei, den Code zu ändern | [`anleitung/06_Hinweise_Quellcode.md`](anleitung/06_Hinweise_Quellcode.md) |

---

## Was hier liegt

```
baulueuet-menue/
├── README.md                         dieses Dokument
├── wrangler.toml                     Hosting-Einstellungen für Cloudflare Pages
├── frontend/                         die Webseite, genau so wie sie gehostet wird
│   ├── index.html                    Gästeseite, Menüwahl
│   ├── admin.html                    Verwaltung der Termine, nach Kurstag gruppiert
│   ├── kursblatt.html                Aushang mit QR-Code, ohne Anmeldung
│   ├── menueblatt.html               Bestellübersicht für die Küche
│   ├── konfig.js                     alle Kennungen und Adressen an einer Stelle
│   ├── auth.js                       Anmeldung an Entra ID
│   ├── graph.js                      Zugriff auf die SharePoint-Listen
│   ├── _headers                      Sicherheitsheader und CSP (Cloudflare Pages)
│   └── .nojekyll                     damit GitHub Pages `_headers` nicht wegfiltert
├── code/
│   └── serve.ps1                     kleiner Server zum lokalen Testen
├── anleitung/
│   ├── 01_Anleitung_Reception.md     Bedienung, für die Anwender
│   ├── 02_Betriebshandbuch_Support.md  Störungsbehebung, für die ICT
│   ├── 03_Technische_Dokumentation.md  Architektur, Datenmodell, Schnittstellen
│   ├── 04_Einrichtung_und_Deployment.md  Einrichten und veröffentlichen
│   ├── 05_Entscheide_und_Verlauf.md  warum es so gebaut ist, was offen ist
│   └── 06_Hinweise_Quellcode.md      Hinweise für alle, die den Code ändern
└── Vorlagen/
    ├── Menueauswahlblatt_Original_Word.docx   das alte Papierblatt als Referenz
    └── logo-bauluut.svg
```

Alle Pfadangaben in den Dokumenten sind ab diesem Wurzelverzeichnis zu lesen.

---

## Veröffentlichen

Gehostet wird bei **Cloudflare Pages**, angebunden an dieses Git-Repository:
Ein Push auf `main` veröffentlicht automatisch. Der ausgelieferte Ordner steht
in [`wrangler.toml`](wrangler.toml) und nicht in der Cloudflare-Oberfläche.

| Einstellung | Wert | Bedeutung |
|---|---|---|
| `pages_build_output_dir` | `frontend` | nur dieser Ordner geht ins Netz; `anleitung`, `code` und `Vorlagen` bleiben aussen vor |
| `name` | `baulueuet-menue` | muss gleich lauten wie das Projekt in Cloudflare Pages |
| Build command (Oberfläche) | leer | es gibt keinen Bauprozess |

Sicherheitsheader und Content Security Policy stehen bewusst **nicht** in
`wrangler.toml`, sondern in [`frontend/_headers`](frontend/_headers), samt
Begründung zu jeder einzelnen Regel. Bitte nur dort nachführen: Zwei Fassungen
derselben Richtlinie führen zu Fehlern, die kaum zu finden sind, weil der
Browser blockierte Aufrufe stillschweigend verwirft.

Der Ablauf Schritt für Schritt steht in
[`anleitung/04_Einrichtung_und_Deployment.md`](anleitung/04_Einrichtung_und_Deployment.md),
Abschnitt 4. Dort ist auch der Weg ohne Git beschrieben, das Hochladen des
Ordners `frontend` von Hand, der die Ausnahme bleiben soll.

Lokal anschauen, ohne etwas zu veröffentlichen:

```
powershell -ExecutionPolicy Bypass -File code\serve.ps1
```

Die Datei `frontend/.nojekyll` hat für Cloudflare Pages keine Bedeutung. Sie bleibt
liegen, damit der Ordner notfalls auch als Quelle für GitHub Pages taugt; ohne
sie würde Pages `_headers` wegen des Unterstrichs ignorieren.

---

## Die vier Seiten

| Adresse | Wofür | Anmeldung |
|---|---|---|
| `https://menue.campus-sursee.ch/?klasse=CODE` | Gäste wählen ihr Menü | nein |
| `https://menue.campus-sursee.ch/kursblatt.html?klasse=CODE` | Aushang mit QR-Code, darf der Kursleitung geschickt werden | nein |
| `https://menue.campus-sursee.ch/admin.html` | Verwaltung der Termine | ja |
| `https://menue.campus-sursee.ch/menueblatt.html?klasse=CODE` | Bestellübersicht für die Küche | ja |

Cloudflare Pages leitet Adressen mit `.html` auf die Fassung ohne Endung um:
Aus `/admin.html` wird `/admin`, aus `/kursblatt.html?klasse=CODE` wird
`/kursblatt?klasse=CODE`. Die Abfragezeichenfolge bleibt erhalten, alle
bestehenden Links und QR-Codes funktionieren weiterhin. Wichtig ist nur, dass
in der Entra-ID-App-Registrierung **beide** Schreibweisen als Umleitungsadresse
stehen, siehe `anleitung/04_Einrichtung_und_Deployment.md`, Abschnitt 2.2.

Jede Seite kennt `?mock=1`. Damit zeigt sie Testdaten ohne Anmeldung, praktisch zum Anschauen und Erklären.

Die Menüwahl ist am Kurstag **bis 10:00 Uhr** offen. Danach lässt sich weder
neu bestellen noch die eigene Wahl ändern; beides läuft dann über die
Réception. Die Uhrzeit steht in `frontend/konfig.js` (`annahmeschluss`) und
nochmals im Kopf von `frontend/index.html`.

---

## In drei Sätzen, wie es funktioniert

Die Webseite liegt bei Cloudflare Pages und ist reines HTML, es gibt keinen eigenen Server. Die Daten stehen in zwei SharePoint-Listen auf der Site «Reception»; die Verwaltung greift nach Anmeldung mit dem Microsoft-365-Konto direkt darauf zu, Gästeseite und Kursblatt über zwei Power-Automate-Flows, weil Kursteilnehmende und Kursleitung kein Konto haben. Die Tagesmenüs kommen von Lunchgate, abgeholt von einem dieser Flows.

---

## Zuständigkeiten

| Bereich | Konto |
|---|---|
| Power Automate Flows | powerplatform@campus-sursee.ch |
| SharePoint-Site «Reception» | ICT-Services |
| Cloudflare Pages, Domäne `menue.campus-sursee.ch` | ICT-Services |
| Entra ID App-Registrierung und Benutzerzuweisung | ICT-Services |
| Menüinhalte | Restaurant BAULÜÜT über Lunchgate |

Zugangsdaten stehen bewusst **nicht** in dieser Ablage.
