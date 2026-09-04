# Entscheide und Verlauf

**Stand:** 04.09.2026

Warum das System so gebaut ist, wie es gebaut ist. Dieses Dokument beantwortet die Fragen, die sich sonst in einem Jahr niemand mehr beantworten kann.

---

## 1. Warum überhaupt

Bisher füllten Kursteilnehmende ein Papierblatt aus, das die Réception bis 10:00 Uhr einsammelte und der Küche übergab. Das kostete Zeit, war schlecht lesbar, und Allergien gingen unter. Die digitale Fassung behält den Ablauf bei und ersetzt nur das Papier durch eine Webseite.

Das gedruckte Menüblatt für die Küche gibt es weiterhin. Es ist bewusst dem alten Word-Blatt nachempfunden, das unter `Vorlagen\Menueauswahlblatt_Original_Word.docx` beiliegt, damit sich in der Küche nichts umgewöhnen muss.

---

## 2. Warum keine Anmeldung für die Gäste

Kursteilnehmende sind externe Personen ohne Konto im Mandanten. Eine Anmeldung wäre für sie eine Hürde, die den ganzen Zweck zunichtemacht. Die Gästeseite ist deshalb anonym erreichbar und über den achtstelligen Zugangscode geschützt.

**Was das bedeutet:** Wer den Code kennt, kann bestellen. Das ist bewusst so. Bei einem Mittagsmenü ist der Schaden eines Missbrauchs gering, und der Code ist lang genug, dass er sich nicht erraten lässt.

---

## 3. Warum Power Apps abgelöst wurde

Die Verwaltung lief zunächst als Power-Apps-Canvas-App. Sie funktionierte, hatte aber aus Sicht der Betreuung mehrere Nachteile:

- Änderungen nur im Power-Apps-Studio, mit eigenen Eigenheiten und leicht verlorenen Formeln
- eine zweite Oberfläche mit eigenem Aussehen neben der bereits vorhandenen Webseite
- Lizenz- und Freigabefragen bei jeder neuen Person
- kein Quellcode, der sich versionieren, lesen oder ablegen liesse

Die Ablösung durch `admin.html` bringt: eine einzige Technologie für alles, lesbaren und ablegbaren Quellcode, dasselbe Aussehen wie die Gästeseite, und keine zusätzliche Lizenzfrage.

**Was dabei verloren ging:** nichts. Alle Funktionen der App wurden übernommen, dazu kamen die Detailliste der Bestellungen und die beiden Druckknöpfe, die vorher noch offen waren.

---

## 4. Warum Flow B trotzdem weiterlebt

Naheliegend wäre gewesen, alle Power-Automate-Flows abzuschaffen. Das geht nicht, aus zwei Gründen:

1. **Die Gästeseite braucht einen anonymen Zugang** zu den Daten. Ohne Anmeldung gibt es kein Token für Microsoft Graph. Flow B und Flow C sind dieser Zugang.
2. **Die Lunchgate-Schnittstelle lässt sich nicht aus dem Browser aufrufen.** Sie verlangt Basic Authentication und sendet keine CORS-Freigaben. Ausserdem hätten die Zugangsdaten im öffentlich lesbaren Quelltext gestanden. Flow B ist deshalb die einzige Stelle, welche die Tagesmenüs holt; auch das Menüblatt bezieht sie von dort.

Ein vierter Flow «API Bestellungen laden» war geplant und wurde **nie gebaut**. Er ist überflüssig geworden, weil `menueblatt.html` die Bestellungen direkt über Graph holt.

---

## 5. Warum das Kursblatt zuerst über Graph lief und jetzt doch über Flow B

**Bis 04.09.2026:** Kursblätter werden **im Voraus** gedruckt, oft Tage vor dem Kurs. Flow B galt als auf den laufenden Tag ausgerichtet, weil er die Tagesmenüs mitliefert. Über Graph stimmten die Klassendaten sicher für jedes Datum. Menütexte braucht das Kursblatt ohnehin keine. Der Preis war die Anmeldung: Das Kursblatt liess sich nur intern öffnen.

**Seit 04.09.2026 läuft es über Flow B, ohne Anmeldung.** Auslöser war der Wunsch, den Kursblatt-Link auch der Kursleitung schicken zu können, damit diese das Blatt selbst ausdruckt. Eine Weiterleitung auf `login.microsoftonline.com` ist für Personen ohne Konto im Mandanten eine Sackgasse.

**Die Annahme von damals wurde nachgemessen, nicht geglaubt.** Ein Aufruf von Flow B mit der Testklasse `TEST1234` am 04.09.2026 lieferte `"datum":"2026-08-27"`, also einen vergangenen Kurstag mit korrekten Klassendaten. Flow B ist damit **nicht** auf den laufenden Tag beschränkt; er liefert jede Klasse mit ihrem eigenen Datum. Der ursprüngliche Einwand traf schlicht nicht zu.

**Was preisgegeben wird:** Kursname, Firma, Datum und Essenszeit, und nur an jemanden, der den achtstelligen Code bereits kennt. Genau das steht ohnehin auf dem Aushang, und derselbe Code öffnet über die Gästeseite bereits mehr. Bestellungen liefert Flow B nicht, sie bleiben hinter der Anmeldung.

**Der Weg über Graph blieb bestehen**, als Rückfall für den Fall, dass Flow B nicht antwortet. Er wird aber nie von selbst eingeschlagen, sondern nur über den Knopf «Mit Konto anmelden» auf der Fehlerkarte. Deshalb muss die Umleitungsadresse für `kursblatt.html` in der App-Registrierung eingetragen bleiben, obwohl die Seite im Normalfall keine Anmeldung mehr braucht.

---

## 5a. Warum die 10-Uhr-Frist im Browser geprüft wird und nicht im Flow

Seit dem 04.09.2026 endet die Menüwahl am Kurstag um 10:00 Uhr. Das bildet nach, was auf dem Papierblatt stand und was die Küche zum Planen braucht.

Geprüft wird die Frist in `index.html`, also im Browser der Teilnehmenden. Flow C nimmt eine Bestellung weiterhin an, wenn jemand ihn von Hand aufruft. Das ist bewusst so:

- **Der Zweck ist Verlässlichkeit im Ablauf, nicht Abwehr von Missbrauch.** Es geht darum, dass die Küche ab 10:00 Uhr eine feste Zahl hat und niemand versehentlich noch etwas ändert.
- **Wer den Code kennt, könnte ohnehin bestellen.** Das ist seit Beginn so entschieden, siehe Abschnitt 2. Eine harte Sperre in Flow C würde daran nichts ändern, sondern nur eine andere Lücke schliessen als die, die offen ist.
- **Eine Änderung an Flow C ist teuer und heikel.** Der Power-Automate-Designer verliert Ausdrücke still, siehe `03_Technische_Dokumentation.md`, Abschnitt 10. Für einen Nutzen, der hier gering ist, lohnt sich dieses Risiko nicht.

Soll die Frist trotzdem hart gelten, steht der nötige Eingriff in Flow C in `03_Technische_Dokumentation.md`, Abschnitt 7.1. Die Gästeseite ist darauf vorbereitet: Antwortet Flow C mit HTTP 403, zeigt sie bereits die Karte «Bestellung geschlossen».

---

## 5b. Warum die Spur «erstellt von / geändert von» ohne neue Spalten auskommt

Die Verwaltung zeigt seit dem 04.09.2026 unter jedem Klassenkopf eine sehr kleine Zeile mit Zeitpunkt und Person des Anlegens und der letzten Änderung.

Naheliegend wäre gewesen, dafür vier Spalten in der Liste «Klassen» anzulegen und sie beim Speichern mitzuschreiben. Dagegen sprach dreierlei:

1. **SharePoint führt diese Angaben ohnehin mit**, für jeden Listeneintrag, ohne Zutun. Graph liefert sie als `createdBy`, `createdDateTime`, `lastModifiedBy` und `lastModifiedDateTime`.
2. **Keine Migration.** Bestehende Klassen hätten bei eigenen Spalten leere Werte gehabt. So stimmen sie rückwirkend.
3. **Nicht fälschbar.** Selbstgeschriebene Spalten liessen sich über die Oberfläche beliebig setzen; die Angaben von SharePoint nicht.

Der Preis ist ein grösseres `$select` auf jeder Abfrage. Sollte Graph das je verweigern, greift der bestehende Rückfall auf die knappe Auswahl: Die Seiten laden weiter, nur die Spur fehlt dann.

---

## 5c. Warum «Alle Termine» wieder in die Verwaltung zurückgeholt wurde

Das Restaurant wollte eine Vorschau auf die anstehenden Termine. Weil die Verwaltung links eine Klasse pro Zeile zeigte, absteigend nach Datum und ohne Zusammenzug pro Tag, entstand dafür die eigene Seite `termine.html`. Sie wurde noch am selben Tag wieder aufgegeben, bevor die Réception überhaupt damit gearbeitet hatte.

**Was dagegen sprach, sobald sie in Gebrauch war:**

- **Zwei Listen für dieselbe Frage.** Die Réception schaute für «Was läuft heute?» in die Verwaltung und für «Was kommt nächste Woche?» in einen zweiten Tab. Beide zeigten dieselben Daten in verschiedener Form, und nur in der einen liess sich etwas anklicken.
- **Der Umschalter «Vergangene anzeigen» beantwortete die falsche Frage.** Er kannte nur zwei Zustände, entweder alles Kommende oder alles Vergangene. Gefragt war fast immer: der heutige Tag.
- **Der zusätzliche Eintrag in der App-Registrierung**, ohne den die Seite mit `AADSTS50011` scheiterte.

**Was stattdessen gebaut wurde.** Die linke Spalte von `admin.html` gruppiert die Termine jetzt selbst nach Kurstag, mit dem Datum als Überschrift über jeder Gruppe. Der Umschalter ist einem **Filter** gewichen: Von Haus aus stehen dort nur die heutigen Termine, zwei Kästchen blenden «Zukünftige Termine» und «Vergangene Termine» dazu. Die heutigen bleiben in jedem Fall sichtbar, und der heutige Tag steht immer zuoberst — danach die kommenden Tage aufsteigend, danach die vergangenen absteigend.

**Was dabei verloren ging:** der Ausdruck der Tagesübersicht fürs Restaurant und der Zusammenzug «Tage / Kurse / Bestellungen / Menü 1 / Menü 2» über den ganzen Zeitraum. Beides war an die eigene Seite gebunden. Wird es wieder gebraucht, ist es in der linken Spalte nicht sinnvoll unterzubringen; dann braucht es die eigene Seite erneut.

**Der Grundsatz «eine Seite, eine Aufgabe» gilt weiterhin.** Er hat hier nur nicht getragen, weil es gar nicht zwei Aufgaben waren: Terminliste und Terminübersicht sind dieselbe Aufgabe in zwei Auflösungen.

---

## 5d. Warum «Bestellung offen» aus der Verwaltung verschwunden ist

Die Liste «Klassen» hat eine Spalte `Status` mit den Werten `offen` und `geschlossen`. Die Verwaltung zeigte sie an zwei Stellen: als orangen Punkt in jeder Listenzeile und als Marke «Bestellung offen» im Kopf der Details. Im Formular liess sie sich umstellen.

Gebraucht wurde das nie. Die 10-Uhr-Regel schliesst die Menüwahl von selbst, und einen Kurs schon vorher dichtzumachen kam in der Praxis nicht vor. Übrig blieben ein Punkt, der in jeder Zeile Platz und Aufmerksamkeit kostete, und ein Wahlfeld, das man beim Bearbeiten jedes Mal überlesen musste.

Seit dem 04.09.2026 sind Punkt, Marke und Wahlfeld entfernt. Die Spalte selbst bleibt:

- **Flow B liest sie weiterhin** und meldet der Gästeseite `offen: false`, wenn dort `geschlossen` steht. Die Gästeseite zeigt dann unverändert «Bestellung geschlossen».
- **Beim Anlegen** schreibt die Verwaltung deshalb weiterhin `offen` hinein. Bliebe die Spalte leer, hielte Flow B den Termin für geschlossen und niemand könnte bestellen.
- **Beim Ändern** fasst die Verwaltung die Spalte nicht mehr an. Was in SharePoint steht, bleibt stehen.

Wer einen Termin vorzeitig schliessen will, setzt den Wert direkt in der SharePoint-Liste. Das ist selten genug, dass es keinen eigenen Handgriff in der Oberfläche rechtfertigt.

---

## 5e. Warum die erwartete Teilnehmerzahl nur ein Massstab ist

Die Réception fragte: «Fehlen noch Bestellungen?» Bisher liess sich das nur beantworten, wenn man die Teilnehmerzahl des Kurses im Kopf hatte. Seit dem 04.09.2026 lässt sie sich am Termin hinterlegen, und die Liste zeigt «5 / 18 Best.».

Die Zahl **schränkt nichts ein**. Sie ist keine Obergrenze, kein Kontingent und keine Pflichtangabe:

- Es dürfen mehr Leute bestellen als erwartet. Wer im Kurs kurzfristig dazukommt, soll nicht abgewiesen werden, nur weil eine Zahl nicht nachgeführt wurde.
- Das Feld darf leer bleiben. Dann zeigt die Verwaltung schlicht keinen Massstab. Eine erzwungene Angabe hätte nur Platzhalterzahlen erzeugt, die niemand pflegt.
- **Leer und `0` sind nicht dasselbe.** Leer heisst «noch nicht bekannt», `0` hiesse «niemand wird erwartet». Ein geleertes Feld schreibt deshalb `null` in die Spalte, nicht `0`.

Die Alternative wäre gewesen, die Teilnehmenden vorab namentlich zu erfassen. Das ist der Ablauf, den das Papierblatt hatte, und genau den sollte die Webseite ablösen.

---

## 6. Warum zuerst alles selbst gebaut und dann auf Bibliotheken umgestellt wurde

Die erste Fassung enthielt einen selbst geschriebenen QR-Encoder (rund 380 Zeilen) und einen selbst geschriebenen OAuth-Ablauf mit PKCE (rund 230 Zeilen). Der Gedanke dahinter: keine Abhängigkeit von fremden Servern, eine sehr enge Content Security Policy, nichts, was zusätzlich ausgeliefert werden muss.

Auf ausdrücklichen Wunsch wurde das umgestellt auf **so wenig selbstgebauten Code wie möglich**. Heute übernehmen `@azure/msal-browser` die Anmeldung und `qrcode-generator` den QR-Code, beide per CDN.

**Abwägung, ehrlich benannt:**

| | Eigenbau | Bibliothek vom CDN |
|---|---|---|
| Abhängigkeit von Dritten | keine | `cdn.jsdelivr.net` muss erreichbar sein |
| Code, den jemand warten muss | rund 610 Zeilen mehr | rund 610 Zeilen weniger |
| Sicherheitslücken | müssen selbst gefunden werden | werden vom Hersteller behoben, Version muss aber nachgeführt werden |
| Content Security Policy | sehr eng | eine zusätzliche Quelle erlaubt |

Abgesichert ist die Abhängigkeit durch feste Versionen und `integrity`-Prüfsummen: Eine unbemerkt ausgetauschte Datei würde vom Browser abgelehnt. Fällt der CDN aus, melden die Seiten das im Klartext, statt leer zu bleiben.

Der alte QR-Encoder liegt nicht mehr im Quellcode. Der Testordner `qr-test` im Arbeitsverzeichnis ist damit gegenstandslos.

---

## 7. Kleinere Entscheide

**Ganze Listen holen und im Browser filtern.** Serverseitige `$filter` auf SharePoint-Listenspalten setzen einen Spaltenindex voraus und scheitern sonst sporadisch. Bei höchstens ein paar hundert Einträgen ist das Filtern im Browser einfacher und zuverlässiger.

**Datum beim Schreiben auf Mittag UTC setzen.** So landet der Wert auch bei Zeitzonenverschiebung sicher auf dem gewünschten Tag. Beim Lesen wird immer über die lokale Zeitzone umgerechnet, damit auch die von der alten Power App angelegten Einträge richtig erscheinen.

**Zugangscode ohne 0, O, 1 und I.** Der Code steht auf einem gedruckten Blatt und wird von Hand abgetippt. Verwechselbare Zeichen sind dort ein echtes Ärgernis.

**Bestellungen bleiben beim Löschen einer Klasse stehen.** Bewusst so: Ein versehentliches Löschen soll nicht stillschweigend die Bestellungen mitreissen. Die Rückfrage weist ausdrücklich darauf hin. Der Aufräum-Flow entfernt die verwaisten Einträge nach 30 Tagen.

**Aufbewahrung 30 Tage.** Es sind Namen mit Angaben zu Allergien, also Gesundheitsdaten. Sie werden nur so lange behalten, wie sie für den Betrieb gebraucht werden.

**Keine Fusszeile auf den Seiten.** Auf Wunsch entfernt, damit die Blätter im Druck ruhiger wirken.

**Hosting bei Cloudflare Pages statt bei Netlify.** Am 04.09.2026 gewechselt. An der Webseite selbst ändert das nichts: Beide Anbieter liefern den Ordner `frontend` unverändert aus und werten `frontend\_headers` gleich aus. Aus `netlify.toml` wurde `wrangler.toml`. Ein einziger Unterschied ist zu beachten: Cloudflare Pages leitet `/admin.html` auf `/admin` um. Die Seiten melden sich damit auf der Adresse ohne Endung an, weshalb in Entra ID beide Schreibweisen als Umleitungsadresse hinterlegt sind.

---

## 8. Bekannte Schwächen

Diese Punkte sind bekannt und bewusst in Kauf genommen. Sie gehören auf die Liste, falls das System einmal ausgebaut wird.

| Schwäche | Auswirkung | Möglicher Ausbau |
|---|---|---|
| Flow C prüft das Datum nicht serverseitig | Wer die Schnittstelle direkt aufruft, könnte am falschen Tag bestellen | Datumsprüfung in Flow C ergänzen |
| Aufteilung der Vorspeisenzeile am Wort « oder » | Schreibt die Küche die Zeile anders, landet alles im Feld Suppe | Lunchgate-Felder sauberer trennen, oder in SharePoint pflegen |
| Zugriff auf die Verwaltung wird von Hand zugewiesen | Bei Personalwechsel leicht vergessen | Entra ID P1 und Gruppenzuweisung |
| Abhängigkeit von `cdn.jsdelivr.net` | Bei Ausfall keine Anmeldung und kein QR-Code | Bibliotheken lokal mit ausliefern |
| Veröffentlichung von Hand per Datei-Upload | Kein Verlauf, kein Rückschritt auf eine frühere Fassung | Git-Anbindung an Cloudflare Pages |
| Verwaiste Bestellungen nach dem Löschen einer Klasse | Bleiben bis zu 30 Tage in der Liste | Aufräum-Flow um verwaiste Einträge erweitern |

---

## 9. Verlauf

| Datum | Was |
|---|---|
| bis 26.08.2026 | Konzept, SharePoint-Listen, Gästeseite `index.html`, Flow B und Flow C |
| 27.08.2026 | Lunchgate-Anbindung direkt in Flow B, Aufräum-Flow, erste Fassung der Power-Apps-Verwaltung |
| 28.08.2026, Vormittag | Gästeseite: Knopf «Auswahl bearbeiten» und Merken der eigenen Bestellung im Browser. Druckblätter `kursblatt.html` und `menueblatt.html` |
| 28.08.2026, Mittag | **Ablösung von Power Apps.** Neue Verwaltung `admin.html`, Anmeldung an Entra ID, Zugriff auf SharePoint über Microsoft Graph. Flow D wird gegenstandslos |
| 28.08.2026, Nachmittag | Umstellung auf Bibliotheken vom CDN (MSAL, qrcode-generator), Fusszeilen entfernt, vollständige Dokumentation |
| 04.09.2026, Vormittag | Alle Seiten durchgehend auf schmale Bildschirme ausgelegt: überlappende Spalten in der Verwaltung behoben, Tabellen auf dem Telefon als Karten, seitliche Ränder und Schriftgrössen wachsen mit der Fensterbreite. Terminübersicht `termine.html` als eigene Seite |
| 04.09.2026, Nachmittag | **Umbau der Verwaltung.** `termine.html` wieder entfernt und die linke Spalte von `admin.html` nach Kurstag gruppiert; Umschalter «Vergangene anzeigen» durch einen Filter ersetzt, der von Haus aus nur den heutigen Tag zeigt. «Neuer Termin» ganz nach oben. Status «Bestellung offen» aus der Oberfläche entfernt. Neue Spalte `Teilnehmer` für die erwartete Teilnehmerzahl, in der Liste als «5 / 18 Best.» |

**Beim Umbau gefundene und behobene Fehler**, festgehalten, weil sie sich wiederholen könnten:

- Eine Race Condition beim Speichern: Der abschliessende Zweig setzte die Knopfbeschriftung nachträglich wieder zurück, nachdem die Ansicht schon gewechselt hatte.
- Ein horizontaler Überlauf der Kopfzeile auf Bildschirmen unter etwa 520 Pixeln Breite.
- Überlappende Spalten in der Verwaltung: Die Klassenliste stand in einer Rasterspalte fester Breite, das Rasterfeld darin durfte aber nicht schmaler werden als der längste Kurstitel. Eine Zeile mit langem Titel schob sich deshalb über die Detailspalte und verdeckte dort Beschriftungen und Schaltflächen. Behoben mit `minmax(0, ...)` für beide Spalten und `min-width: 0` für die Abschnitte darin; erst dadurch greift das Kürzen des Titels.
- Ein fehlender Ruhezonenrand am QR-Code nach dem Wechsel auf die Bibliothek. Ursache war, dass `margin` in SVG-Einheiten zählt und nicht in Modulen.

---

## 10. Was geprüft wurde und was nicht

Auf dem Arbeitsplatz sind weder Node noch Python installiert, geprüft wurde deshalb im Browser gegen den lokalen Server.

**Geprüft:**

- Datumsumrechnung für beide in SharePoint vorkommenden Schreibweisen
- Zugangscode über 500 Läufe, nur erlaubte Zeichen
- Verwaltung im Testmodus vollständig: Liste, Suche, Umschalter, Anlegen, Bearbeiten, Löschen, Link kopieren, Zähler gegen die Bestelltabelle nachgerechnet
- Beide Druckblätter im Testmodus, Sortierung und Zähler stimmig
- QR-Code mit **jsQR**, einem fremden Decoder, zurückgelesen: vier Gästelinks kamen zeichengleich zurück. Ruhezone genau vier Module, Symbol 62.8 mm im Rahmen von 78 mm
- MSAL lädt vom CDN mit intakter Prüfsumme und initialisiert mit der echten Client-ID
- Content Security Policy gegen eine Kopie der Gästeseite, keine Verletzungen

**Nicht geprüft, offen:**

- der Zugriff auf SharePoint über Graph gegen echte Daten. Am ehesten stolpert man über die Schreibweise der Auswahlwerte in der Spalte `Status`
- die Anmeldung mit einem echten Konto. Ob Umleitungsadressen, Graph-Berechtigung und Benutzerzuweisung stimmen, zeigt der erste Login auf einen Schlag
- der QR-Code mit einer echten Handykamera. Technisch ist er gegen die Norm belegt, der Praxistest dauert zehn Sekunden und sollte einmal gemacht werden

> Ein Hinweis zur Redlichkeit: Während der Arbeit wurde versucht, die registrierten Umleitungsadressen zu prüfen, indem der Anmeldeendpunkt aufgerufen wurde. Dieser Test taugt nicht. Eine absichtlich falsche Adresse liefert dieselbe Anmeldemaske, der Fehler erscheint erst nach der Anmeldung. Wer das künftig prüfen will, muss sich tatsächlich anmelden.
