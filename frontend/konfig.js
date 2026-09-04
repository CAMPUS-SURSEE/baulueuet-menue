/* konfig.js: zentrale Einstellungen für die Admin-Seiten des Menüwahl-Systems.
   Diese Datei enthält KEINE Geheimnisse. Mandanten- und Client-ID sind bei
   Single-Page-Applications öffentlich; der Schutz kommt aus der Anmeldung
   und aus der Benutzerzuweisung in Entra ID. */

const KONFIG = {

  /* ---- Entra ID (Microsoft 365) ---- */
  // Mandant Campus Sursee
  mandantId: "2553fb74-5dcc-4072-8bb5-399d18f72af9",

  // Anwendungs-ID (Client-ID) der App-Registrierung «Menuewahl BAULUUT Admin».
  // Keine Geheimhaltung nötig, siehe ANLEITUNG_ANMELDUNG.md.
  clientId: "9d344eb0-8af8-44d1-ad64-916d564e5975",

  /* ---- SharePoint (Site «Reception», hot-reze) ---- */
  siteId: "campussursee.sharepoint.com,141d7dcf-e2f2-4273-8b14-af04a092ccb8,ac91aebb-2f75-4dd3-bdc4-6b26858f1d2b",
  listeKlassen: "966a62ea-0ec5-4054-80a2-9a52d7b32483",
  listeBestellungen: "19bef1ed-a806-4a5b-bdb5-c869f7d2a582",

  /* ---- Gästeseite ---- */
  gastBasis: "https://menue.campus-sursee.ch/",

  /* ---- Annahmeschluss ----
     Volle Stunde in Ortszeit, bis zu der die Teilnehmenden am Kurstag wählen
     und ihre Wahl ändern dürfen. Danach übernimmt die Réception.
     ACHTUNG: `index.html` lädt konfig.js nicht, weil die Gästeseite ohne
     Anmeldung auskommt und deshalb keine der Admin-Dateien einbindet. Dort
     steht derselbe Wert nochmals als Konstante ANNAHMESCHLUSS im Kopf des
     Skripts. Wird er hier geändert, ist er dort mitzuziehen. */
  annahmeschluss: 10,

  /* ---- Power Automate Flow B «API Klasse laden» ----
     Wird weiterhin gebraucht, weil dort die Lunchgate-Anbindung sitzt
     (Tagesmenüs). Der Flow ist bewusst anonym, damit die Gästeseite ohne
     Anmeldung funktioniert. */
  flowKlasseUrl: "https://default2553fb745dcc40728bb5399d18f72a.f9.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/25/workflows/a1871aeb66df48378bc381039d6d0bee/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=b81V67dqbTZntfasDrX-Ijn64wRp0Fa6egLC8ZV3w-s"
};
