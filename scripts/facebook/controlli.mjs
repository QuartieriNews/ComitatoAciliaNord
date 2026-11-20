// Controlli dell'automazione delle notizie, separati da importa.mjs per poterli provare da soli
// (node scripts/facebook/prova-controlli.mjs):
// - leggiGiorno e mezzanotteRoma: i giorni scritti a mano nei campi dell'avvio a mano;
// - inizioLettura e limitePost: da quando rileggere i post, anche dopo un blocco, e quanti chiederne;
// - avvisoCredito: se il credito del mese su Apify sta per finire.

const GIORNO = 24 * 60 * 60 * 1000;
const GIORNI_RIPRESA = 30; // dopo un blocco si rilegge al massimo l'ultimo mese
const MARGINE_RIPRESA = 60 * 60 * 1000; // e si riparte da un'ora prima dell'ultima corsa riuscita
const SOGLIA_CREDITO = 0.2; // si avvisa quando resta meno di un quinto del credito del mese

// Un giorno scritto a mano: 2026-11-11, ma anche 2026/11/11, 11/11/2026, 11-11-2026 o 11.11.2026
// (con l'anno in fondo, prima il giorno e poi il mese, come si scrive in Italia). Restituisce AAAA-MM-GG.
export function leggiGiorno(testo, campo) {
  const t = String(testo ?? '').trim();
  let anno, mese, giorno;
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) [, anno, mese, giorno] = m;
  else if ((m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [, giorno, mese, anno] = m;
  const iso = m ? `${anno}-${mese.padStart(2, '0')}-${giorno.padStart(2, '0')}` : '';
  const data = new Date(`${iso}T00:00:00Z`);
  if (!iso || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso) {
    throw new Error(`${campo}: «${t}» non è una data valida (scrivi per esempio 2026-11-11).`);
  }
  return iso;
}

// Mezzanotte a Roma del giorno indicato (AAAA-MM-GG)
export function mezzanotteRoma(giorno) {
  const utc = new Date(`${giorno}T00:00:00Z`);
  const ora = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(utc));
  return new Date(utc.getTime() - ora * 60 * 60 * 1000);
}

// Da quando rileggere i post. Di solito gli ultimi «giorniControllo». Dopo un blocco (corse non riuscite
// per giorni, come dal 12 al 20 novembre 2026, quando su Apify era finito il credito) si riparte da un'ora
// prima dell'ultima corsa riuscita, al massimo 30 giorni indietro, così i post usciti nel frattempo non
// si perdono. Con il campo «Recupera» dell'avvio a mano si rilegge anche dal giorno scritto lì. Vale
// sempre la finestra più larga, ma mai prima dell'inizio delle notizie.
// Restituisce daQuando (da dove leggere) e controlloDa (da dove vale la finestra di sempre).
export function inizioLettura({ adesso, inizio, giorniControllo, ultimaRiuscita, recuperaDal }) {
  const controllo = adesso - giorniControllo * GIORNO;
  let da = controllo;
  const ultima = Date.parse(ultimaRiuscita ?? '');
  if (Number.isFinite(ultima)) da = Math.min(da, Math.max(ultima - MARGINE_RIPRESA, adesso - GIORNI_RIPRESA * GIORNO));
  if (recuperaDal) da = Math.min(da, recuperaDal.getTime());
  const primo = new Date(inizio).getTime();
  return { daQuando: new Date(Math.max(primo, da)), controlloDa: new Date(Math.max(primo, controllo)) };
}

// Quanti post chiedere ad Apify: 15 per l'ultimo giorno (la pagina ne pubblica uno o due al giorno),
// 8 in più per ogni giorno in più. Apify fa pagare solo i post che legge davvero.
export function limitePost(daQuando, adesso) {
  const giorni = (adesso - daQuando.getTime()) / GIORNO;
  return Math.min(500, 15 + Math.ceil(Math.max(0, giorni - 1) * 8));
}

const dollari = (x) => `${x.toFixed(2).replace('.', ',')} $`;
const giornoMese = (t) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' }).format(new Date(t));

// Il credito del mese su Apify, dalla risposta di https://api.apify.com/v2/users/me/limits (il campo «data»).
// Restituisce una riga per il registro e, se il credito sta finendo e al ritmo del mese non basta fino
// al rinnovo, il testo dell'avviso per Riccardo.
export function avvisoCredito(dati, adesso) {
  const massimo = Number(dati?.limits?.maxMonthlyUsageUsd);
  const usati = Number(dati?.current?.monthlyUsageUsd);
  if (!(massimo > 0) || !Number.isFinite(usati)) return { riga: 'Credito di Apify: la risposta non dice quanto ne resta.', avviso: null };
  const restano = Math.max(0, massimo - usati);
  const inizio = Date.parse(dati.monthlyUsageCycle?.startAt ?? '');
  const rinnovo = Date.parse(dati.monthlyUsageCycle?.endAt ?? '') + 1; // la fine del ciclo è alle 23:59:59,999
  const alGiorno = Number.isFinite(inizio) ? usati / Math.max(1, (adesso - inizio) / GIORNO) : NaN;
  const riga =
    `Credito di Apify: usati ${dollari(usati)} su ${dollari(massimo)} questo mese` +
    (Number.isFinite(rinnovo) ? `, si rinnova il ${giornoMese(rinnovo)}.` : '.');
  if (restano >= massimo * SOGLIA_CREDITO) return { riga, avviso: null };
  if (Number.isFinite(rinnovo) && Number.isFinite(alGiorno) && alGiorno * Math.max(0, (rinnovo - adesso) / GIORNO) <= restano) {
    return { riga, avviso: null }; // poco, ma basta fino al rinnovo
  }
  const giorni = alGiorno > 0 ? Math.floor(restano / alGiorno) : null;
  let quanto = '';
  if (giorni === 0) quanto = ', che non bastano neanche per un giorno';
  else if (giorni !== null) quanto = `, che al ritmo di questo mese bastano per circa ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`;
  const avviso =
    `Le notizie del sito si aggiornano ancora, ma il credito di Apify sta finendo: restano ${dollari(restano)} ` +
    `dei ${dollari(massimo)} del mese${quanto}` +
    (Number.isFinite(rinnovo) ? `. Il credito si rinnova il ${giornoMese(rinnovo)}.` : '.') +
    ' Quando finisce, le notizie si fermano: prima di allora ricarica il credito su Apify o passa a un piano più grande.';
  return { riga, avviso };
}
