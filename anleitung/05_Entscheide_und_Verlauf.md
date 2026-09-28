# Entscheide und Verlauf

Warum die Menüwahl so gebaut ist, was bewusst offen bleibt und wie sie
entstanden ist.

**Stand:** 28.09.2026

---

## Inhalt

1. [Warum es die Menüwahl gibt](#1-warum-es-die-menüwahl-gibt)
2. [Die wichtigen Entscheide](#2-die-wichtigen-entscheide)
3. [Kleinere Entscheide](#3-kleinere-entscheide)
4. [Bekannte Schwächen und mögliche Ausbauten](#4-bekannte-schwächen-und-mögliche-ausbauten)
5. [Verlauf](#5-verlauf)

---

## 1. Warum es die Menüwahl gibt

Früher füllten Kursteilnehmende ein Papierblatt aus, das die Réception bis
10:00 Uhr einsammelte und der Küche brachte. Das kostete Zeit, war schlecht
lesbar, und Allergien gingen unter.

Die Webseite behält den Ablauf bei und ersetzt nur das Papier. Das Menüblatt
für die Küche sieht bewusst aus wie das alte Word-Blatt
([`Vorlagen/Menueauswahlblatt_Original_Word.docx`](../Vorlagen/Menueauswahlblatt_Original_Word.docx)),
damit sich in der Küche nichts ändert.

---

## 2. Die wichtigen Entscheide

### Keine Anmeldung für die Teilnehmenden

Kursteilnehmende haben kein Konto bei Campus Sursee. Eine Anmeldung wäre eine
Hürde, die den Zweck zunichtemacht. Geschützt ist die Gästeseite deshalb nur
durch den zufälligen Zugangscode.

**Preis:** Wer den Code kennt, kann bestellen. Bei einem Mittagsmenü ist der
mögliche Schaden gering, und der Code lässt sich nicht erraten.

### Webseite statt Power App

Die Verwaltung lief zuerst als Power-Apps-Canvas-App. Sie wurde am 28.08.2026
durch `admin.html` ersetzt, weil die App nur im Power-Apps-Studio änderbar war,
Formeln leicht verloren gingen, Lizenzfragen aufwarf und keinen lesbaren
Quellcode hatte. Jetzt gibt es eine einzige Technik, versionierten Code und das
gleiche Aussehen wie die Gästeseite. Verloren ging dabei nichts.

### Flow B und C bleiben

Die Seiten ohne Anmeldung brauchen einen Zugang zu den Daten, der ohne Konto
funktioniert; das sind Flow B und C. Ausserdem lässt sich Lunchgate nicht aus
dem Browser aufrufen (Zugangsdaten, keine CORS-Freigabe). Flow B ist darum auch
für das Menüblatt die Quelle der Tagesmenüs.

### Kursblatt ohne Anmeldung

Bis zum 04.09.2026 verlangte das Kursblatt eine Anmeldung. Man nahm an, Flow B
liefere nur Termine des laufenden Tages. **Nachgemessen stimmte das nicht:**
Flow B liefert jeden Termin mit seinem eigenen Datum. Seither lädt das
Kursblatt über Flow B, und die Réception kann den Link einer externen
Kursleitung schicken. Preisgegeben wird nur, was ohnehin auf dem Aushang steht.

### Die 10-Uhr-Frist prüft der Browser

Die Frist soll der Küche verlässliche Zahlen geben, nicht Missbrauch abwehren.
Wer den Code kennt, könnte ohnehin bestellen. Eine Prüfung in Flow C hätte
einen heiklen Eingriff im Power-Automate-Designer bedeutet, für wenig Nutzen.

### Die Réception darf jederzeit ändern

Bis zum 04.09.2026 galt die Frist auch für die Réception; Korrekturen landeten
von Hand auf dem gedruckten Blatt. Damit standen die Angaben an zwei Orten, und
das Blatt liess sich nicht neu drucken. Seither kann die Réception jede
Bestellung in der Verwaltung ändern, nacherfassen und löschen. Eine
verschiebbare Frist pro Termin wurde verworfen: Die Küche soll sich auf eine
feste Zeit verlassen können.

### Firmen mit dauerhaftem QR-Code

Firmen wie SORBA sind eine ganze Woche am Campus und wollten nicht jeden Tag
ein neues Blatt. Seit dem 14.09.2026 gibt es das Firmenverzeichnis.

- **Der Schlüssel hat vier Zufallszeichen** (`SORBA-K7M2` statt `SORBA`). Sonst
  liesse sich der Link jeder Firma aus ihrem Namen erraten. Darum wird das
  Verzeichnis auch nie aufgeräumt: Es ist der einzige Ort, an dem die Schlüssel
  stehen.
- **Der Termincode entsteht im Browser** aus Schlüssel und Datum. Die Flows
  blieben unverändert, und die Zeitzonenfalle im Flow (`utcNow()` ist nicht
  Ortszeit) wurde umgangen.
- **Die Bildungsregel steht zweimal im Code** (`graph.js` und `index.html`),
  weil die Gästeseite `graph.js` nicht lädt. Das ist ein bewusster Kompromiss,
  damit anonymer und angemeldeter Teil getrennt bleiben.
- **Verschiebt man einen Firmen-Termin, ändert sich sein Code.** Der Kurstag
  steckt darin. Das Datum stattdessen zu sperren hätte Löschen und Neuanlegen
  erzwungen und Bestellungen verwaist.
- **Die Menütexte werden nicht übersetzt.** Maschinelle Übersetzung von
  Gerichten und Allergenen ist nicht zuverlässig genug.

### Bibliotheken statt Eigenbau

Die erste Fassung hatte einen eigenen QR-Encoder und einen eigenen
Anmeldeablauf, zusammen rund 610 Zeilen. Auf Wunsch wurde das durch zwei
bewährte Bibliotheken ersetzt (MSAL und qrcode-generator). **Preis:** Anmeldung
und QR-Code brauchen `cdn.jsdelivr.net`. Feste Versionen und Prüfsummen sichern
gegen unbemerkt ausgetauschte Dateien.

---

## 3. Kleinere Entscheide

| Entscheid | Grund |
|---|---|
| Ganze Listen holen und im Browser filtern | Filter in SharePoint brauchen einen Index und scheitern sonst sporadisch. Bei wenigen hundert Einträgen unproblematisch. |
| Datum wird als Mittag UTC gespeichert | So landet es bei jeder Zeitzone auf dem richtigen Tag. |
| Zugangscode ohne 0, O, 1 und I | Er wird vom Papier abgetippt. |
| Beim Löschen eines Termins bleiben die Bestellungen | Ein Versehen soll nicht still Daten mitreissen. |
| Daten nach 30 Tagen löschen | Allergien sind Gesundheitsdaten; sie werden nur so lange gehalten wie nötig. |
| Wer etwas angelegt oder geändert hat, kommt aus SharePoint | Keine eigenen Spalten nötig, rückwirkend korrekt und nicht fälschbar. |
| Terminliste nach Kurstag gruppiert, Filter «Nur heute» | Eine eigene Seite «Alle Termine» (`termine.html`) wurde am selben Tag wieder aufgegeben: zwei Listen für dieselbe Frage. |
| Eine einzige Sortierrichtung für alle Tage | Eine Sonderregel für «heute» machte die Liste unlesbar. |
| Status «Bestellung offen» nicht mehr in der Oberfläche | Die 10-Uhr-Regel schliesst von selbst; vorzeitiges Schliessen kam nie vor. Die Spalte bleibt für Flow B. |
| Erwartete Teilnehmeranzahl nur als Richtwert | Wer kurzfristig dazukommt, soll trotzdem bestellen können. |
| Sprache im Link, nicht am Termin | Ein Kurs hat oft gemischte Sprachen; so gibt es mehrere Blätter pro Termin. Flow B blieb unverändert. |
| Keine Fusszeile auf den Blättern | Ruhigerer Druck. Der Satz «bis 10:00 Uhr an der Réception abgeben» passt nicht mehr, seit niemand mehr ein Blatt abgibt. |
| Cloudflare Pages statt Netlify | Wechsel am 04.09.2026. Für die Seite ohne Unterschied, ausser der Umleitung auf Adressen ohne `.html`. |

---

## 4. Bekannte Schwächen und mögliche Ausbauten

| Schwäche | Auswirkung | Möglicher Ausbau |
|---|---|---|
| Flow C prüft weder Datum noch Uhrzeit | Wer die Schnittstelle direkt aufruft, kann ausserhalb der Frist bestellen | Prüfung in Flow C, Antwort HTTP 403 |
| Suppe/Salat werden am Wort « oder » getrennt | Schreibt die Küche anders, steht alles bei «Suppe» | Lunchgate-Felder getrennt pflegen |
| Zugriff wird von Hand zugewiesen | Bei Personalwechsel leicht vergessen | Entra ID P1 mit Gruppenzuweisung |
| Abhängigkeit von `cdn.jsdelivr.net` | Bei Ausfall keine Anmeldung und kein QR-Code | Bibliotheken selbst ausliefern |
| Verwaiste Bestellungen nach dem Löschen eines Termins | Bleiben bis zu 30 Tage | Aufräum-Flow erweitern |
| Gelöschte Bestellung ist endgültig weg | Kein Rückgängig | SharePoint-Papierkorb nutzen |
| Firmen-QR-Code braucht trotzdem einen Termin pro Tag | Sonst «Kein Kurs gefunden» | Termine als Serie anlegen |
| Firmenblatt nennt keine Essenszeit | Wer sie auf Papier braucht, druckt das Kursblatt des Tages | Essenszeit je Firma hinterlegen |
| Nur ein Firmen-Termin pro Firma und Tag | Zweiter Kurs braucht einen Zufallscode | Kurskennzeichen im Code |
| Annahmeschluss und Firmencode-Regel stehen je zweimal im Code | Ändert man nur eine Stelle, passen die Seiten nicht mehr zusammen | Gemeinsame Datei, die auch die Gästeseite lädt |
| Alte Power App (`5994926d-…`) ist abgelöst | Könnte noch parallel benutzt werden | Löschen oder deaktivieren |

---

## 5. Verlauf

| Datum | Was |
|---|---|
| bis 26.08.2026 | Konzept, SharePoint-Listen, Gästeseite, Flow B und Flow C |
| 27.08.2026 | Lunchgate in Flow B, Aufräum-Flow, erste Verwaltung als Power App |
| 28.08.2026 | Gästeseite: «Auswahl bearbeiten». Kursblatt und Menüblatt. **Verwaltung als Webseite** `admin.html` mit Anmeldung über Entra ID und Zugriff über Graph. Umstellung auf Bibliotheken |
| 04.09.2026 | Alle Seiten fürs Handy optimiert. Wechsel zu Cloudflare Pages. Terminliste nach Kurstag gruppiert, mit Filter. Status aus der Oberfläche entfernt. Erwartete Teilnehmeranzahl. Kursblatt ohne Anmeldung. 10-Uhr-Frist. **Réception kann Bestellungen jederzeit ändern** |
| 08.09.2026 | Kursblatt und Gästeseite auf Französisch und Englisch. Feinschliff der Verwaltung. Menüblatt ohne Fusszeile. Unbenutzte Spalten aus «Klassen» entfernt |
| 09.09.2026 | Sprache wird beim Drucken gewählt statt am Termin. Sprachumschalter auf der Gästeseite |
| 10.09.2026 | Kürzerer Sprachzusatz im Link: `&fr` statt `&sprache=fr` (alte Links gelten weiter) |
| 14.09.2026 | **Firmenverzeichnis und dauerhafter Firmen-QR-Code.** Neue Liste «Firmen», Reiter «Firmen», Firmenblatt |
| 28.09.2026 | Dokumentation überarbeitet und gekürzt |
