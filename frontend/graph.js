/* graph.js: Zugriff auf die SharePoint-Listen «Klassen» und «Bestellungen»
   über Microsoft Graph. Ersetzt die frühere Power-Apps-Anbindung.

   Die Berechtigung ist delegiert: das Token kann nur das, was die angemeldete
   Person in SharePoint ohnehin darf. Es ist kein Generalschlüssel.

   Setzt auth.js und konfig.js voraus. */

/* ---------- allgemeine Hilfsfunktionen ---------- */

const Hilfe = (function () {

  const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch",
                      "Donnerstag", "Freitag", "Samstag"];

  /* SharePoint liefert Datumswerte in UTC. Je nachdem, womit ein Eintrag
     angelegt wurde, steht dort «2026-08-27T22:00:00Z» oder
     «2026-08-28T12:00:00Z» für denselben Kurstag. Deshalb wird immer über
     die lokale Zeitzone in ein Datum ohne Uhrzeit umgerechnet. */
  function datumAusSp(wert) {
    if (!wert) return "";
    const d = new Date(wert);
    if (isNaN(d.getTime())) return "";
    return jahrMonatTag(d);
  }

  /* Umgekehrt: beim Schreiben wird Mittag UTC gesetzt. Damit landet der Wert
     auch bei Zeitzonenverschiebung sicher auf dem gewünschten Tag. */
  function datumFuerSp(jjjjMmTt) {
    if (!jjjjMmTt) return null;
    return jjjjMmTt + "T12:00:00Z";
  }

  function jahrMonatTag(d) {
    return d.getFullYear() + "-"
      + String(d.getMonth() + 1).padStart(2, "0") + "-"
      + String(d.getDate()).padStart(2, "0");
  }

  function heute() {
    return jahrMonatTag(new Date());
  }

  /* «2026-08-28» -> «Freitag, 28.08.2026» */
  function datumText(jjjjMmTt) {
    if (!jjjjMmTt) return "";
    const t = jjjjMmTt.split("-");
    if (t.length !== 3) return jjjjMmTt;
    const d = new Date(Number(t[0]), Number(t[1]) - 1, Number(t[2]));
    if (isNaN(d.getTime())) return jjjjMmTt;
    return WOCHENTAGE[d.getDay()] + ", " + t[2] + "." + t[1] + "." + t[0];
  }

  /* «2026-08-28» -> «28.08.2026» */
  function datumKurz(jjjjMmTt) {
    if (!jjjjMmTt) return "";
    const t = jjjjMmTt.split("-");
    return t.length === 3 ? t[2] + "." + t[1] + "." + t[0] : jjjjMmTt;
  }

  /* Voller Zeitstempel aus SharePoint -> «28.08.2026, 14:23».
     Für die Nachvollziehbarkeit in der Verwaltung: dort zählt neben dem Tag
     auch die Uhrzeit. Gerechnet wird in der lokalen Zeitzone, weil Graph die
     Werte in UTC liefert. */
  function zeitstempelKurz(wert) {
    if (!wert) return "";
    const d = new Date(wert);
    if (isNaN(d.getTime())) return "";
    return String(d.getDate()).padStart(2, "0") + "."
      + String(d.getMonth() + 1).padStart(2, "0") + "."
      + d.getFullYear() + ", "
      + String(d.getHours()).padStart(2, "0") + ":"
      + String(d.getMinutes()).padStart(2, "0");
  }

  /* Ohne 0/O/1/I, damit ein Code auf Papier eindeutig lesbar ist.
     Gleiches Alphabet wie bisher in der Power App. */
  const CODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function zufallsText(laenge) {
    const werte = new Uint32Array(laenge);
    crypto.getRandomValues(werte);
    let text = "";
    for (let i = 0; i < laenge; i++) text += CODE_ZEICHEN[werte[i] % CODE_ZEICHEN.length];
    return text;
  }

  /* 8 Zeichen für einen einmaligen Termin. Ein solcher Code enthält nie einen
     Bindestrich; daran erkennt `istFirmenCode()` den Unterschied. */
  function neuerCode() {
    return zufallsText(8);
  }

  function gastLink(code) {
    return KONFIG.gastBasis + "?klasse=" + encodeURIComponent(code || "");
  }

  /* ---------- Firmenverzeichnis und dauerhafter Firmen-QR-Code ----------
     Eine Firma bekommt einmal einen Schlüssel («SORBA-K7M2») und damit einen
     QR-Code, der sich aufkleben lässt und dauerhaft gilt. Der Termincode eines
     Firmen-Termins entsteht daraus und aus dem Kurstag:

         Schluessel + "-" + JJMMTT      z. B. «SORBA-K7M2-260914»

     ACHTUNG: Diese Bildungsregel steht bewusst ein zweites Mal im Kopf von
     `index.html`. Die Gästeseite lädt `graph.js` nicht, weil sie ohne
     Anmeldung auskommt; sie muss aus `?firma=SORBA-K7M2` selbst den Code des
     heutigen Tages bilden. Wird die Regel hier geändert, ist sie dort
     mitzuziehen. Gleiches Muster wie beim Annahmeschluss. */

  /* Firmenname -> Rumpf des Schlüssels: Grossbuchstaben, Umlaute aufgelöst,
     alles übrige entfernt, höchstens 10 Zeichen. «Müller AG» -> «MUELLERAG». */
  function firmenSlug(name) {
    let text = String(name || "").toUpperCase();
    text = text.replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE");
    /* Das scharfe s macht toUpperCase() von selbst zu SS. Alles übrige mit
       Akzent (É, È, Ê, Ç und so fort) wird zerlegt: aus É wird E und ein
       eigenes Akzentzeichen. Der Akzent fällt gleich darauf mit allem
       anderen weg, was kein A-Z und keine Ziffer ist. */
    if (text.normalize) text = text.normalize("NFD");
    text = text.replace(/[^A-Z0-9]/g, "");
    return text ? text.slice(0, 10) : "FIRMA";
  }

  /* Schlüssel einer neuen Firma. Die vier Zufallszeichen verhindern, dass
     zwei gleichnamige Firmen denselben QR-Code bekommen, und machen den
     Schlüssel unratbar. */
  function neuerFirmenSchluessel(name) {
    return firmenSlug(name) + "-" + zufallsText(4);
  }

  /* Derselbe Schlüssel darf im Verzeichnis nur einmal vorkommen: zwei Firmen
     mit demselben Schlüssel hätten denselben QR-Code und am selben Kurstag
     denselben Termincode. Bei rund einer Million Möglichkeiten je
     Namensrumpf ist das unwahrscheinlich, bei zwei gleichnamigen Firmen aber
     nicht ausgeschlossen. Darum wird gewürfelt, bis der Schlüssel frei ist.
     `bestehende` ist die Liste der bereits vergebenen Schlüssel; kommt nichts
     Freies heraus, gibt es "" zurück, und der Aufruf bricht mit einer
     Meldung ab, statt eine Doppelvergabe zu schreiben. */
  function freierFirmenSchluessel(name, bestehende) {
    const belegt = (bestehende || []).map(s => String(s || "").toUpperCase());
    for (let versuch = 0; versuch < 20; versuch++) {
      const schluessel = neuerFirmenSchluessel(name);
      if (belegt.indexOf(schluessel.toUpperCase()) < 0) return schluessel;
    }
    return "";
  }

  /* Schlüssel + Kurstag -> Termincode. Das Datum kommt als «JJJJ-MM-TT» aus
     dem Formular, also bereits in Ortszeit; es wird nicht über Date
     umgerechnet, sonst verschöbe die Zeitzone den Tag. */
  function firmenCode(schluessel, isoDatum) {
    const s = String(schluessel || "").trim().toUpperCase();
    const teile = String(isoDatum || "").slice(0, 10).split("-");
    if (!s || teile.length !== 3 || !teile[0] || !teile[1] || !teile[2]) return "";
    return s + "-" + teile[0].slice(2) + teile[1] + teile[2];
  }

  /* Ein Schlüssel aus einem Link. Erlaubt sind nur Grossbuchstaben, Ziffern
     und Bindestrich; alles andere gilt als ungültiger Link. Kleingeschrieben
     abgetippt wird er angehoben, damit ein von Hand eingegebener Link
     trotzdem trägt. Dieselbe Prüfung steht noch einmal in `index.html`, das
     graph.js nicht lädt. */
  function firmaNormieren(wert) {
    const s = String(wert || "").trim().toUpperCase();
    return /^[A-Z0-9-]+$/.test(s) ? s : "";
  }

  /* Erkennungsmerkmal: ein Firmencode enthält einen Bindestrich, ein
     Zufallscode nie. */
  function istFirmenCode(code) {
    return String(code || "").indexOf("-") >= 0;
  }

  /* Alles vor dem letzten Bindestrich ist der Schlüssel; der Teil danach ist
     der Tag. Der Schlüssel selbst enthält einen Bindestrich, darum der
     letzte und nicht der erste. */
  function firmenSchluesselAusCode(code) {
    const text = String(code || "");
    const stelle = text.lastIndexOf("-");
    return stelle > 0 ? text.slice(0, stelle) : "";
  }

  /* Der dauerhafte Gästelink einer Firma. Er zeigt nicht auf einen Termin,
     sondern auf die Firma; die Gästeseite sucht damit den Termin des
     heutigen Tages. */
  function firmenLink(schluessel, sprache) {
    return KONFIG.gastBasis + "?firma=" + encodeURIComponent(schluessel || "")
      + spracheZusatz(sprache);
  }

  /* Das Firmenblatt zeigt denselben QR-Code zum Aufhängen. Der Firmenname
     reist im Link mit, weil `kursblatt.html` ohne Anmeldung läuft und das
     Verzeichnis deshalb nicht lesen kann. */
  function firmenblattLink(schluessel, name, sprache) {
    return "kursblatt.html?firma=" + encodeURIComponent(schluessel || "")
      + "&name=" + encodeURIComponent(name || "")
      + spracheZusatz(sprache);
  }

  /* ---------- Sprache ----------
     Kursblatt und Gästeseite gibt es auf Deutsch, Französisch und Englisch;
     das Menüblatt für die Küche bleibt deutsch. Die Sprache hängt nicht am
     Termin: die Réception wählt sie beim Öffnen des Kursblatts, und die
     Teilnehmenden können sie auf der Gästeseite selbst umstellen. Sie wird
     nirgends gespeichert, sondern reist nur als zweibuchstabiger Code im
     Link mit. Alles, was nicht fr oder en ist, gilt als Deutsch. */
  const SPRACHEN = { de: "Deutsch", fr: "Französisch", en: "Englisch" };

  function spracheNormieren(wert) {
    const s = String(wert || "").trim().toLowerCase().slice(0, 2);
    return SPRACHEN[s] ? s : "de";
  }

  function spracheName(wert) {
    return SPRACHEN[spracheNormieren(wert)];
  }

  /* Anhängsel für Links auf Kursblatt und Gästeseite. Die Sprache reist
     im Link mit, damit der QR-Code eines französischen Kursblatts auch die
     französische Gästeseite öffnet. Bewusst nur `&fr` oder `&en`, ohne
     Wert, damit der Link und damit der QR-Code so kurz wie möglich bleiben.
     Für Deutsch fällt der Zusatz ganz weg. */
  function spracheZusatz(wert) {
    const s = spracheNormieren(wert);
    return s === "de" ? "" : "&" + s;
  }

  function gastLinkMitSprache(code, sprache) {
    return gastLink(code) + spracheZusatz(sprache);
  }

  /* Annahmeschluss: am Kurstag bis KONFIG.annahmeschluss (Stunde, lokal).
     Danach ist die Menüwahl geschlossen und Änderungen laufen über die
     Réception. Die Zeit steht in konfig.js, damit sie sich an einer Stelle
     ändern lässt. `index.html` kennt konfig.js nicht und trägt denselben Wert
     nochmals; wird er hier geändert, ist er dort mitzuziehen. */
  function annahmeschlussStunde() {
    const wert = (typeof KONFIG !== "undefined" && KONFIG.annahmeschluss);
    return (typeof wert === "number") ? wert : 10;
  }

  function annahmeschlussText() {
    return String(annahmeschlussStunde()).padStart(2, "0") + ":00";
  }

  return {
    datumAusSp: datumAusSp,
    datumFuerSp: datumFuerSp,
    datumText: datumText,
    datumKurz: datumKurz,
    zeitstempelKurz: zeitstempelKurz,
    heute: heute,
    neuerCode: neuerCode,
    gastLink: gastLink,
    gastLinkMitSprache: gastLinkMitSprache,
    firmenSlug: firmenSlug,
    neuerFirmenSchluessel: neuerFirmenSchluessel,
    freierFirmenSchluessel: freierFirmenSchluessel,
    firmenCode: firmenCode,
    firmaNormieren: firmaNormieren,
    istFirmenCode: istFirmenCode,
    firmenSchluesselAusCode: firmenSchluesselAusCode,
    firmenLink: firmenLink,
    firmenblattLink: firmenblattLink,
    spracheNormieren: spracheNormieren,
    spracheName: spracheName,
    spracheZusatz: spracheZusatz,
    annahmeschlussStunde: annahmeschlussStunde,
    annahmeschlussText: annahmeschlussText
  };
})();


/* ---------- Graph-Zugriff ---------- */

const Graph = (function () {

  const WURZEL = "https://graph.microsoft.com/v1.0";
  const LISTE_KLASSEN = "/sites/" + KONFIG.siteId + "/lists/" + KONFIG.listeKlassen;
  const LISTE_BESTELLUNGEN = "/sites/" + KONFIG.siteId + "/lists/" + KONFIG.listeBestellungen;

  const FELDER_KLASSE = "Title,Firma,Datum,Essenszeit,Code,Status,Teilnehmer,Suppe,Salat,Menu1,Menu2,Dessert";
  const FELDER_BESTELLUNG = "Title,KlasseID,KlasseCode,Vorname,Nachname,Vorspeise,Hauptgang,Bemerkung";

  async function anfrage(pfad, optionen) {
    optionen = optionen || {};
    const zugriff = await Auth.token();
    const kopf = Object.assign({
      "Authorization": "Bearer " + zugriff,
      "Accept": "application/json"
    }, optionen.headers || {});
    if (optionen.body) kopf["Content-Type"] = "application/json";

    const antwort = await fetch(pfad.indexOf("http") === 0 ? pfad : WURZEL + pfad, {
      method: optionen.method || "GET",
      headers: kopf,
      body: optionen.body ? JSON.stringify(optionen.body) : undefined
    });

    if (antwort.status === 204) return null;
    const daten = await antwort.json().catch(() => null);

    if (!antwort.ok) {
      const fehler = new Error(lesbarerFehler(antwort.status, daten));
      fehler.status = antwort.status;
      fehler.rohdaten = daten;
      throw fehler;
    }
    return daten;
  }

  function lesbarerFehler(status, daten) {
    const meldung = daten && daten.error && (daten.error.message || daten.error.code);
    if (status === 401) return "Die Anmeldung ist abgelaufen. Bitte die Seite neu laden.";
    if (status === 403) return "Keine Berechtigung für diese Liste. "
      + "Bitte prüfen, ob das Konto Zugriff auf die SharePoint-Site «Reception» hat.";
    if (status === 404) return "Liste oder Eintrag nicht gefunden. Bitte die IDs in konfig.js prüfen.";
    if (status === 429) return "Zu viele Anfragen. Bitte einen Moment warten und neu laden.";
    return meldung || ("Fehler von Microsoft Graph (HTTP " + status + ")");
  }

  /* Holt alle Einträge einer Liste, inklusive Folgeseiten.
     Wenn die Feldauswahl scheitert (etwa weil eine Spalte umbenannt wurde),
     wird ohne Auswahl erneut versucht. */
  async function alleElemente(listenPfad, felder) {
    async function holen(mitAuswahl) {
      const auswahl = mitAuswahl
        ? "$expand=fields($select=" + felder + ")"
        : "$expand=fields";
      /* Wer wann angelegt und zuletzt geändert hat, führt SharePoint von
         selbst mit. Es braucht dafür keine eigenen Listenspalten, und die
         Werte lassen sich über die Oberfläche auch nicht fälschen. Im
         Rückfall ohne Feldauswahl wird nur das Nötigste geholt, damit eine
         Seite auch dann noch lädt, wenn Graph diese Auswahl verweigert. */
      const spur = mitAuswahl
        ? "id,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy"
        : "id,createdDateTime";
      let url = listenPfad + "/items?$select=" + spur + "&" + auswahl + "&$top=999";
      const treffer = [];
      while (url) {
        const seite = await anfrage(url);
        for (const el of (seite.value || [])) treffer.push(flach(el));
        url = seite["@odata.nextLink"] || null;
      }
      return treffer;
    }
    try {
      return await holen(true);
    } catch (e) {
      if (e.status === 400) return await holen(false);
      throw e;
    }
  }

  /* Graph verschachtelt die Listenspalten unter «fields». Für die Seiten ist
     ein flaches Objekt bequemer. */
  function flach(element) {
    const f = element.fields || {};
    const satz = Object.assign({}, f);
    satz.id = element.id;
    satz.erstellt = element.createdDateTime || f.Created || null;
    satz.geaendert = element.lastModifiedDateTime || f.Modified || null;
    satz.erstelltVon = personenName(element.createdBy);
    satz.geaendertVon = personenName(element.lastModifiedBy);
    return satz;
  }

  /* Graph liefert Urheber als «identitySet»: ein Objekt mit user, application
     oder device. Für die Verwaltung genügt der Anzeigename der Person; wurde
     ein Eintrag von einem Flow geschrieben, steht dort dessen Name. */
  function personenName(identitaet) {
    const wer = identitaet && (identitaet.user || identitaet.application);
    if (!wer) return "";
    return wer.displayName || wer.email || "";
  }

  /* ---------- Klassen ---------- */

  async function klassen() {
    const roh = await alleElemente(LISTE_KLASSEN, FELDER_KLASSE);
    return roh.map(k => ({
      id:         k.id,
      titel:      k.Title || "",
      firma:      k.Firma || "",
      datum:      Hilfe.datumAusSp(k.Datum),
      essenszeit: k.Essenszeit || "",
      code:       k.Code || "",
      status:     k.Status || "offen",
      /* Erwartete Teilnehmeranzahl. 0 heisst «nicht hinterlegt»: die Spalte
         kann leer sein, und solange sie es ist, zeigt die Verwaltung nur
         die tatsächlichen Bestellungen ohne Massstab daneben. Fehlt die
         Spalte in SharePoint ganz, greift in `alleElemente` der Rückfall
         ohne Feldauswahl und der Wert bleibt hier schlicht 0. */
      erwartet:   Number(k.Teilnehmer) || 0,
      erstellt:      k.erstellt,
      erstelltVon:   k.erstelltVon || "",
      geaendert:     k.geaendert,
      geaendertVon:  k.geaendertVon || ""
    })).sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
  }

  async function klasseNachCode(code) {
    const suche = (code || "").trim().toUpperCase();
    if (!suche) return null;
    const alle = await klassen();
    return alle.find(k => (k.code || "").toUpperCase() === suche) || null;
  }

  function felderAusKlasse(daten) {
    const felder = {};
    if (daten.titel      !== undefined) felder.Title      = daten.titel;
    if (daten.firma      !== undefined) felder.Firma      = daten.firma;
    if (daten.datum      !== undefined) felder.Datum      = Hilfe.datumFuerSp(daten.datum);
    if (daten.essenszeit !== undefined) felder.Essenszeit = daten.essenszeit;
    if (daten.code       !== undefined) felder.Code       = daten.code;
    if (daten.status     !== undefined) felder.Status     = daten.status;
    /* null räumt die Zahlenspalte wieder aus. Das ist nicht dasselbe wie 0:
       leer heisst «noch nicht bekannt», 0 hiesse «niemand wird erwartet». */
    if (daten.erwartet   !== undefined) {
      felder.Teilnehmer = (daten.erwartet === null || daten.erwartet === "")
        ? null : Number(daten.erwartet);
    }
    return felder;
  }

  async function klasseAnlegen(daten) {
    const antwort = await anfrage(LISTE_KLASSEN + "/items", {
      method: "POST",
      body: { fields: felderAusKlasse(daten) }
    });
    return antwort ? antwort.id : null;
  }

  async function klasseAendern(id, daten) {
    return anfrage(LISTE_KLASSEN + "/items/" + id + "/fields", {
      method: "PATCH",
      body: felderAusKlasse(daten)
    });
  }

  async function klasseLoeschen(id) {
    return anfrage(LISTE_KLASSEN + "/items/" + id, { method: "DELETE" });
  }

  /* ---------- Firmen ----------
     Das Firmenverzeichnis ist die jüngste der drei Listen und kann auf einer
     Site fehlen, die noch nach der alten Einrichtung läuft. Deshalb wird sie
     nicht wie die beiden anderen fest über eine ID in `konfig.js`
     angesprochen, sondern notfalls über ihren Anzeigenamen gesucht; fehlt sie
     ganz, liefern die Lesefunktionen eine leere Liste statt eines Fehlers,
     und die Verwaltung bietet an, sie anzulegen. */

  const FELDER_FIRMA = "Title,Schluessel";

  let firmenListenId = null;      // Zwischenspeicher für die gefundene ID
  let firmenListeGesucht = false; // damit nicht bei jedem Aufruf gesucht wird

  function firmenPfad(id) {
    return "/sites/" + KONFIG.siteId + "/lists/" + id;
  }

  /* Liefert die Listen-ID oder null, wenn es die Liste auf der Site nicht
     gibt. Vorrang hat die ID aus `konfig.js`.

     Gesucht wird ohne `$filter`: auf Listen wäre er zwar erlaubt, aber die
     Site trägt nur eine überschaubare Zahl Listen, und im Browser zu
     vergleichen erspart eine weitere Eigenheit der Abfragesprache. Gelesen
     werden alle Seiten, falls Graph die Aufzählung aufteilt. */
  async function firmenListeErmitteln() {
    if (KONFIG.listeFirmen) return KONFIG.listeFirmen;
    if (firmenListeGesucht) return firmenListenId;
    let url = "/sites/" + KONFIG.siteId + "/lists?$select=id,displayName&$top=200";
    let gefunden = null;
    while (url && !gefunden) {
      const seite = await anfrage(url);
      gefunden = ((seite && seite.value) || []).find(l => l.displayName === "Firmen");
      url = (seite && seite["@odata.nextLink"]) || null;
    }
    firmenListenId = gefunden ? gefunden.id : null;
    firmenListeGesucht = true;
    return firmenListenId;
  }

  /* Legt die Liste «Firmen» mit ihrer einzigen eigenen Spalte an. `Title`
     bringt SharePoint von selbst mit und trägt den Firmennamen. */
  async function firmenListeAnlegen() {
    const antwort = await anfrage("/sites/" + KONFIG.siteId + "/lists", {
      method: "POST",
      body: {
        displayName: "Firmen",
        list: { template: "genericList" },
        columns: [{ name: "Schluessel", text: {} }]
      }
    });
    firmenListenId = antwort ? antwort.id : null;
    firmenListeGesucht = true;
    return firmenListenId;
  }

  /* Wirft eine verständliche Meldung, wenn geschrieben werden soll, die Liste
     aber fehlt. Beim Lesen wird das oben abgefangen. */
  async function firmenListeNoetig() {
    const id = await firmenListeErmitteln();
    if (!id) {
      throw new Error("Die Liste «Firmen» ist auf der SharePoint-Site noch nicht "
        + "vorhanden. Sie lässt sich im Bereich «Firmen» anlegen.");
    }
    return id;
  }

  /* Alle Firmen, im Browser nach Namen sortiert. Ohne Liste eine leere
     Auswahl: die Terminverwaltung soll auch dann benutzbar bleiben. */
  async function firmenLaden() {
    const id = await firmenListeErmitteln();
    if (!id) return [];
    const roh = await alleElemente(firmenPfad(id), FELDER_FIRMA);
    /* Wer den Eintrag angelegt hat, führt SharePoint zwar mit, das
       Verzeichnis zeigt es aber nirgends: eine Firma hat keine Vorgeschichte,
       die an der Réception zählte. Darum nur Name und Schlüssel. */
    return roh.map(f => ({
      id:         f.id,
      name:       f.Title || "",
      schluessel: f.Schluessel || ""
    })).sort((a, b) => (a.name || "").localeCompare(b.name || "", "de-CH"));
  }

  async function firmaAnlegen(daten) {
    const id = await firmenListeNoetig();
    const antwort = await anfrage(firmenPfad(id) + "/items", {
      method: "POST",
      body: { fields: { Title: daten.name || "", Schluessel: daten.schluessel || "" } }
    });
    return antwort ? antwort.id : null;
  }

  /* Nur der Name lässt sich ändern. Der Schlüssel bleibt, wie er ist: an ihm
     hängt der gedruckte QR-Code, und die bereits angelegten Termine tragen
     ihn in ihrem eigenen Code. */
  async function firmaAendern(eintragId, daten) {
    const id = await firmenListeNoetig();
    const felder = {};
    if (daten.name !== undefined) felder.Title = daten.name;
    return anfrage(firmenPfad(id) + "/items/" + eintragId + "/fields", {
      method: "PATCH",
      body: felder
    });
  }

  /* Löscht nur den Verzeichniseintrag. Bestehende Termine bleiben unberührt:
     sie tragen Firmenname und Code als eigene Kopie. */
  async function firmaLoeschen(eintragId) {
    const id = await firmenListeNoetig();
    return anfrage(firmenPfad(id) + "/items/" + eintragId, { method: "DELETE" });
  }

  /* ---------- Bestellungen ---------- */

  /* Ohne Argument: alle Bestellungen. Mit klasseId: nur die einer Klasse.
     Gefiltert wird bewusst im Browser. Serverseitige Filter auf
     Listenspalten setzen in SharePoint einen Index voraus und schlagen
     sonst sporadisch fehl; dank der 30-Tage-Aufräumung sind es ohnehin
     wenige hundert Einträge. */
  async function bestellungen(klasseId) {
    const roh = await alleElemente(LISTE_BESTELLUNGEN, FELDER_BESTELLUNG);
    return roh
      .filter(b => klasseId === undefined || String(b.KlasseID) === String(klasseId))
      .map(b => ({
        id:        b.id,
        klasseId:  b.KlasseID,
        klasseCode: b.KlasseCode || "",
        vorname:   b.Vorname || "",
        nachname:  b.Nachname || "",
        vorspeise: wert(b.Vorspeise),
        hauptgang: wert(b.Hauptgang),
        bemerkung: b.Bemerkung || "",
        /* Wie bei den Klassen führt SharePoint mit, wer den Eintrag angelegt
           und wer ihn zuletzt angefasst hat. Seit die Réception Bestellungen
           nachträglich korrigieren kann, zählt das: sonst wäre nicht mehr
           erkennbar, ob eine Angabe von der teilnehmenden Person stammt oder
           an der Réception geändert wurde. */
        erstellt:      b.erstellt,
        erstelltVon:   b.erstelltVon || "",
        geaendert:     b.geaendert,
        geaendertVon:  b.geaendertVon || ""
      }))
      .sort((a, b) => (a.nachname || "").localeCompare(b.nachname || "", "de-CH")
                   || (a.vorname  || "").localeCompare(b.vorname  || "", "de-CH"));
  }

  /* Auswahlspalten kommen je nach Konfiguration als Text oder als Objekt. */
  function wert(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return v.Value || v.value || "";
    return String(v);
  }

  /* Umgekehrter Weg: aus den Feldern der Verwaltung wird ein Satz für die
     Liste. Wie bei den Klassen wird nur geschrieben, was auch übergeben
     wurde; alles andere bleibt in SharePoint unangetastet. */
  function felderAusBestellung(daten) {
    const felder = {};
    if (daten.klasseId   !== undefined) felder.KlasseID   = Number(daten.klasseId);
    if (daten.klasseCode !== undefined) felder.KlasseCode = daten.klasseCode;
    if (daten.vorname    !== undefined) felder.Vorname    = daten.vorname;
    if (daten.nachname   !== undefined) felder.Nachname   = daten.nachname;
    if (daten.vorspeise  !== undefined) felder.Vorspeise  = daten.vorspeise;
    if (daten.hauptgang  !== undefined) felder.Hauptgang  = daten.hauptgang;
    if (daten.bemerkung  !== undefined) felder.Bemerkung  = daten.bemerkung;
    return felder;
  }

  /* Eine Bestellung, welche die Réception selbst erfasst: jemand hat den
     Annahmeschluss verpasst oder meldet sich erst am Schalter. Der Weg der
     Gästeseite über Flow C bleibt davon unberührt.

     `Title` ist in SharePoint die Pflichtspalte jeder Liste und inhaltlich
     ohne Bedeutung. Damit ein von Hand erfasster Eintrag in der
     SharePoint-Listenansicht trotzdem lesbar ist, steht dort der Name. Beim
     Ändern wird die Spalte bewusst nicht angefasst: was Flow C dort
     hineingeschrieben hat, soll stehen bleiben. */
  async function bestellungAnlegen(daten) {
    const felder = felderAusBestellung(daten);
    felder.Title = ((daten.nachname || "") + " " + (daten.vorname || "")).trim()
      || "Bestellung";
    const antwort = await anfrage(LISTE_BESTELLUNGEN + "/items", {
      method: "POST",
      body: { fields: felder }
    });
    return antwort ? antwort.id : null;
  }

  /* Korrektur einer bestehenden Bestellung durch die Réception, etwa wenn
     sich jemand im Namen vertippt oder das falsche Menü angetippt hat.
     Bewusst ohne Frist: die Menüwahl der Gästeseite schliesst um
     KONFIG.annahmeschluss, die Réception soll danach weiterhin eingreifen
     können. */
  async function bestellungAendern(id, daten) {
    return anfrage(LISTE_BESTELLUNGEN + "/items/" + id + "/fields", {
      method: "PATCH",
      body: felderAusBestellung(daten)
    });
  }

  async function bestellungLoeschen(id) {
    return anfrage(LISTE_BESTELLUNGEN + "/items/" + id, { method: "DELETE" });
  }

  /* Zählt Vorspeisen und Hauptgänge für die Übersicht. */
  function zaehler(liste) {
    const z = { total: liste.length, suppe: 0, salat: 0, keine: 0, menu1: 0, menu2: 0 };
    for (const b of liste) {
      if (b.vorspeise === "Suppe") z.suppe++;
      else if (b.vorspeise === "Salat") z.salat++;
      else z.keine++;
      if (b.hauptgang.indexOf("1") >= 0) z.menu1++;
      else if (b.hauptgang.indexOf("2") >= 0) z.menu2++;
    }
    return z;
  }

  /* ---------- Klasse ohne Anmeldung ---------- */

  /* Dieselbe Quelle wie die Gästeseite: Flow B, anonym erreichbar. Damit
     kommt das Kursblatt ohne Anmeldung aus und die Réception kann seinen
     Link auch der Kursleitung schicken. Liefert null, wenn der Code nicht
     passt oder der Flow nicht erreichbar ist; die aufrufende Seite bietet
     dann den Weg über die Anmeldung an. */
  async function klasseOeffentlich(code) {
    const suche = (code || "").trim();
    if (!suche) return null;
    try {
      const antwort = await fetch(KONFIG.flowKlasseUrl + "&code=" + encodeURIComponent(suche));
      if (!antwort.ok) return null;
      const d = await antwort.json();
      if (!d || d.ok === false) return null;
      return {
        titel:      d.klasse || "",
        firma:      d.firma  || "",
        datum:      d.datum  || "",
        essenszeit: d.essenszeit || "",
        code:       suche,
        status:     d.offen === false ? "geschlossen" : "offen"
      };
    } catch (e) {
      return null;
    }
  }

  /* ---------- Menütexte ---------- */

  /* Die Tagesmenüs kommen weiterhin aus Flow B, weil dort die
     Lunchgate-Anbindung sitzt. Der Flow ist anonym erreichbar, es braucht
     also kein Token. Fällt der Aufruf aus, wird auf die SharePoint-Spalten
     der Klasse zurückgegriffen. */
  async function menuetexte(code) {
    try {
      const antwort = await fetch(KONFIG.flowKlasseUrl + "&code=" + encodeURIComponent(code));
      if (!antwort.ok) return null;
      const d = await antwort.json();
      if (!d || d.ok === false) return null;
      return {
        suppe:   d.suppe   || "",
        salat:   d.salat   || "",
        menu1:   d.menu1   || "",
        menu2:   d.menu2   || "",
        dessert: d.dessert || ""
      };
    } catch (e) {
      return null;
    }
  }

  /* ---------- angemeldete Person ---------- */

  async function ich() {
    return anfrage("/me?$select=displayName,mail,userPrincipalName");
  }

  return {
    klassen: klassen,
    klasseNachCode: klasseNachCode,
    klasseAnlegen: klasseAnlegen,
    klasseAendern: klasseAendern,
    klasseLoeschen: klasseLoeschen,
    firmenListeErmitteln: firmenListeErmitteln,
    firmenListeAnlegen: firmenListeAnlegen,
    firmenLaden: firmenLaden,
    firmaAnlegen: firmaAnlegen,
    firmaAendern: firmaAendern,
    firmaLoeschen: firmaLoeschen,
    bestellungen: bestellungen,
    bestellungAnlegen: bestellungAnlegen,
    bestellungAendern: bestellungAendern,
    bestellungLoeschen: bestellungLoeschen,
    zaehler: zaehler,
    klasseOeffentlich: klasseOeffentlich,
    menuetexte: menuetexte,
    ich: ich
  };
})();
