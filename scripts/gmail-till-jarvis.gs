/**
 * Gmail till Jarvis. Körs i ditt eget Google-konto (script.google.com), gratis.
 * Var 15:e minut: hittar nya mejl från Vinted, Plick och Doorzo och skickar dem till Jarvis
 * godkännandekö. Behandlade mejl får etiketten "Jarvis". Inget bokförs förrän du godkänner i appen.
 *
 * Installera: klistra in allt, fyll i NYCKEL, välj funktionen "installera" och tryck Kör.
 */
const JARVIS_URL = 'https://vyvzsurwnjuiwdmdccir.supabase.co/functions/v1/ingest-mail';
const NYCKEL = 'KLISTRA_IN_NYCKELN_HÄR';
const SÖK = '(from:vinted OR from:plick OR from:doorzo) newer_than:14d -label:Jarvis';

function hamtaMejl() {
  const etikett = GmailApp.getUserLabelByName('Jarvis') || GmailApp.createLabel('Jarvis');
  const trådar = GmailApp.search(SÖK, 0, 30);
  for (const tråd of trådar) {
    for (const m of tråd.getMessages()) {
      const svar = UrlFetchApp.fetch(JARVIS_URL, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-jarvis-token': NYCKEL },
        payload: JSON.stringify({
          id: m.getId(),
          from: m.getFrom(),
          subject: m.getSubject(),
          date: m.getDate().toISOString(),
          body: m.getPlainBody().slice(0, 20000),
        }),
        muteHttpExceptions: true,
      });
      if (svar.getResponseCode() >= 300) throw new Error('Jarvis svarade ' + svar.getResponseCode() + ': ' + svar.getContentText());
    }
    tråd.addLabel(etikett);
  }
}

/** Kör en gång: startar automatiken (var 15:e minut) och hämtar direkt. */
function installera() {
  for (const t of ScriptApp.getProjectTriggers()) if (t.getHandlerFunction() === 'hamtaMejl') ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger('hamtaMejl').timeBased().everyMinutes(15).create();
  hamtaMejl();
}
