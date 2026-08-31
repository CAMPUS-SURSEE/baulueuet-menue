# Menüwahl Restaurant BAULÜÜT

Kursteilnehmende am Campus Sursee wählen ihr Mittagsmenü über eine Webseite statt auf einem Papierblatt. Die Réception legt pro Kurs eine Klasse an und gibt den Teilnehmenden einen Link oder ein Blatt mit QR-Code. Die Küche erhält die gesammelten Bestellungen ausgedruckt.

**Stand dieser Ablage:** 28.08.2026

---

## Wo fange ich an

| Ich bin | Ich lese |
|---|---|
| an der Réception und will das System bedienen | `01_Anleitung_Reception.md` |
| bei den ICT-Services und habe eine Störung | `02_Betriebshandbuch_Support.md` |
| bei den ICT-Services und will verstehen, wie es gebaut ist | `03_Technische_Dokumentation.md` |
| dabei, etwas zu ändern oder zu veröffentlichen | `04_Einrichtung_und_Deployment.md` |
| neu im Projekt und frage mich, warum es so ist | `05_Entscheide_und_Verlauf.md` |

---

## Was hier liegt

```
Baulüüt Menü Umfrage digital\
├── 00_README.md                      dieses Dokument
├── 01_Anleitung_Reception.md         Bedienung, für die Anwender
├── 02_Betriebshandbuch_Support.md    Störungsbehebung, für die ICT
├── 03_Technische_Dokumentation.md    Architektur, Datenmodell, Schnittstellen
├── 04_Einrichtung_und_Deployment.md  Einrichten und veröffentlichen
├── 05_Entscheide_und_Verlauf.md      warum es so gebaut ist, was offen ist
├── Quellcode\
│   ├── site\                         genau das, was auf Netlify liegt
│   ├── serve.ps1                     kleiner Server zum lokalen Testen
│   └── README_Quellcode.md           Hinweise für alle, die den Code ändern
└── Vorlagen\
    ├── Menueauswahlblatt_Original_Word.docx   das alte Papierblatt als Referenz
    └── logo-bauluut.svg
```

---

## Die vier Seiten

| Adresse | Wofür | Anmeldung |
|---|---|---|
| `https://menue.campus-sursee.ch/?klasse=CODE` | Gäste wählen ihr Menü | nein |
| `https://menue.campus-sursee.ch/admin.html` | Verwaltung der Klassen | ja |
| `https://menue.campus-sursee.ch/kursblatt.html?klasse=CODE` | Aushang mit QR-Code | ja |
| `https://menue.campus-sursee.ch/menueblatt.html?klasse=CODE` | Bestellübersicht für die Küche | ja |

Jede Seite kennt `?mock=1`. Damit zeigt sie Testdaten ohne Anmeldung, praktisch zum Anschauen und Erklären.

---

## In drei Sätzen, wie es funktioniert

Die Webseite liegt bei Netlify und ist reines HTML, es gibt keinen eigenen Server. Die Daten stehen in zwei SharePoint-Listen auf der Site «Reception»; die Verwaltung greift nach Anmeldung mit dem Microsoft-365-Konto direkt darauf zu, die Gästeseite über zwei Power-Automate-Flows, weil Kursteilnehmende kein Konto haben. Die Tagesmenüs kommen von Lunchgate, abgeholt von einem dieser Flows.

---

## Zuständigkeiten

| Bereich | Konto |
|---|---|
| Power Automate Flows | powerplatform@campus-sursee.ch |
| SharePoint-Site «Reception» | ICT-Services |
| Netlify, Domäne `menue.campus-sursee.ch` | ICT-Services |
| Entra ID App-Registrierung und Benutzerzuweisung | ICT-Services |
| Menüinhalte | Restaurant BAULÜÜT über Lunchgate |

Zugangsdaten stehen bewusst **nicht** in dieser Ablage.
