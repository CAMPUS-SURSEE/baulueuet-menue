/* graph.js — Zugriff auf die SharePoint-Listen «Klassen» und «Bestellungen»
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

  /* 8 Zeichen, ohne 0/O/1/I, damit der Code auf Papier eindeutig lesbar ist.
     Gleiches Alphabet wie bisher in der Power App. */
  function neuerCode() {
    const zeichen = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const werte = new Uint32Array(8);
    crypto.getRandomValues(werte);
    let code = "";
    for (let i = 0; i < 8; i++) code += zeichen[werte[i] % zeichen.length];
    return code;
  }

  function gastLink(code) {
    return KONFIG.gastBasis + "?klasse=" + encodeURIComponent(code || "");
  }

  /* Das Kursblatt ist ohne Anmeldung erreichbar, damit die Réception den Link
     auch der Kursleitung schicken kann. Deshalb gibt es ihn hier genauso
     fertig zusammengesetzt wie den Gästelink. */
  function kursblattLink(code) {
    return KONFIG.gastBasis + "kursblatt.html?klasse=" + encodeURIComponent(code || "");
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
    kursblattLink: kursblattLink,
    annahmeschlussStunde: annahmeschlussStunde,
    annahmeschlussText: annahmeschlussText
  };
})();


/* ---------- Graph-Zugriff ---------- */

const Graph = (function () {

  const WURZEL = "https://graph.microsoft.com/v1.0";
  const LISTE_KLASSEN = "/sites/" + KONFIG.siteId + "/lists/" + KONFIG.listeKlassen;
  const LISTE_BESTELLUNGEN = "/sites/" + KONFIG.siteId + "/lists/" + KONFIG.listeBestellungen;

  const FELDER_KLASSE = "Title,Firma,Datum,Essenszeit,Code,Status,Teilnehmer,Suppe,Salat,Menu1,Menu2,Dessert,Bemerkung";
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
      /* Erwartete Teilnehmerzahl. 0 heisst «nicht hinterlegt»: die Spalte
         kann leer sein, und solange sie es ist, zeigt die Verwaltung nur
         die tatsächlichen Bestellungen ohne Massstab daneben. Fehlt die
         Spalte in SharePoint ganz, greift in `alleElemente` der Rückfall
         ohne Feldauswahl und der Wert bleibt hier schlicht 0. */
      erwartet:   Number(k.Teilnehmer) || 0,
      bemerkung:  k.Bemerkung || "",
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
    if (daten.bemerkung  !== undefined) felder.Bemerkung  = daten.bemerkung;
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
        erstellt:  b.erstellt
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
    bestellungen: bestellungen,
    bestellungLoeschen: bestellungLoeschen,
    zaehler: zaehler,
    klasseOeffentlich: klasseOeffentlich,
    menuetexte: menuetexte,
    ich: ich
  };
})();
