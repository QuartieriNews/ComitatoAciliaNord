// La data in cui avviene l'evento di cui parla un post, da scrivere nel titolo della notizia:
// «Passeggiata tra natura e storia sul Tevere – sabato 24 ottobre».
//
// Regole:
// - valgono solo le date scritte con il numero del giorno e il mese («sabato 24 ottobre», «13 novembre»,
//   «15/11»); «oggi», «domani» o «ogni martedì» non bastano: nei resoconti la data è già quella della notizia;
// - vale la prima data che cade fra il giorno del post e i 90 giorni dopo; quelle passate («domenica scorsa»,
//   «il 25 ottobre scorso») restano fuori da sole;
// - se il post scrive anche il giorno della settimana, deve corrispondere alla data, altrimenti la data non si usa;
// - le scadenze («entro il 10 novembre», «fino al 30 novembre») non sono la data dell'evento;
// - «dal 12 al 14 dicembre» e «8 e 9 novembre» restano così;
// - se il titolo contiene già la data, non si aggiunge.

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
// nel testo normalizzato i giorni non hanno l'accento
const GIORNI_SENZA_ACCENTO = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
const GIORNO = `(${GIORNI_SENZA_ACCENTO.join('|')})`;
const MESE = `(${MESI.join('|')})`;
const GIORNI_DOPO = 90;

const RE_DATA = new RegExp(`(?:\\b${GIORNO}\\s+)?\\b(\\d{1,2})(?:°|º)?\\s+${MESE}\\b(?:\\s+(\\d{4})\\b)?`, 'g');
const RE_BARRA = new RegExp(`(?:\\b${GIORNO}\\s+)?\\b(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}|\\d{2}))?(?![\\d/])`, 'g');
// «sabato 29.11»: con il punto solo se c'è il giorno della settimana, perché «10.30» di solito è un orario
const RE_PUNTO = new RegExp(`\\b${GIORNO}\\s+(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{4}|\\d{2}))?(?![\\d.]*\\d)`, 'g');
// subito prima della data: un intervallo («dal 12 al», «8 e») o una scadenza («entro il», «fino al»)
const RE_DAL = new RegExp(`\\b(?:dal(?:l')?|tra il|fra il)\\s+(?:${GIORNO}\\s+)?(\\d{1,2})(?:°|º)?\\s+(?:al(?:l')?|e(?:d)? il|e(?:d)? l')\\s*$`);
const RE_E = new RegExp(`\\b(?:${GIORNO}\\s+)?(\\d{1,2})(?:°|º)?\\s+e\\s+$`);
// «a partire dal 13 novembre», «dal 13 novembre» (senza la fine): l'evento comincia quel giorno
const RE_DA = /\bdal(?:l')?\s*$/;
const RE_SCADENZA = /\b(?:entro(?: e non oltre)?|fino|scade|scadenza|prima|oltre)\b[^.\n]{0,12}$/;

// minuscole, senza emoji, «lunedì» e «lunedi'» diventano «lunedi», spazi semplici
function normalizza(testo) {
  return testo
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/([aeiou])['’](?=\s|$|[.,;:!?)])/g, '$1')
    .replace(/[ìí]/g, 'i')
    .replace(/[’`]/g, "'")
    .replace(/[ \t ]+/g, ' ');
}

// Il giorno del post a Roma, come data senza ora
function giornoDelPost(pubblicato) {
  const [a, m, g] = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date(pubblicato)).split('-').map(Number);
  return Date.UTC(a, m - 1, g);
}

// La data vera (in UTC, a mezzanotte) per giorno e mese, nell'anno giusto rispetto al post; null se non torna
function risolvi(giorno, mese, anno, giornoSettimana, inizio) {
  const annoPost = new Date(inizio).getUTCFullYear();
  const anni = anno ? [anno < 100 ? 2000 + anno : anno] : [annoPost, annoPost + 1];
  for (const a of anni) {
    const data = Date.UTC(a, mese - 1, giorno);
    if (new Date(data).getUTCMonth() !== mese - 1) continue; // per esempio 31 novembre
    const dopo = (data - inizio) / 86_400_000;
    if (dopo < 0 || dopo > GIORNI_DOPO) continue;
    if (giornoSettimana !== null && new Date(data).getUTCDay() !== giornoSettimana) continue;
    return data;
  }
  return null;
}

const numeroGiorno = (nome) => (nome ? GIORNI_SENZA_ACCENTO.indexOf(nome) : null);

// La data dell'evento: { data, testo } (testo come «sabato 24 ottobre»), oppure null
export function dataEvento(testo, pubblicato) {
  if (!testo) return null;
  const t = normalizza(testo);
  const inizio = giornoDelPost(pubblicato);
  const trovate = [];
  for (const m of t.matchAll(RE_DATA)) {
    trovate.push({ pos: m.index, fine: m.index + m[0].length, giornoSett: m[1], giorno: +m[2], mese: MESI.indexOf(m[3]) + 1, anno: m[4] ? +m[4] : null });
  }
  for (const re of [RE_BARRA, RE_PUNTO]) {
    for (const m of t.matchAll(re)) {
      trovate.push({ pos: m.index, fine: m.index + m[0].length, giornoSett: m[1], giorno: +m[2], mese: +m[3], anno: m[4] ? +m[4] : null });
    }
  }
  trovate.sort((a, b) => a.pos - b.pos);

  for (const d of trovate) {
    if (d.mese < 1 || d.mese > 12 || d.giorno < 1) continue;
    const prima = t.slice(Math.max(0, d.pos - 40), d.pos);
    if (RE_SCADENZA.test(prima)) continue;
    const data = risolvi(d.giorno, d.mese, d.anno, numeroGiorno(d.giornoSett), inizio);
    if (data === null) continue;
    const mese = MESI[d.mese - 1];
    const dal = prima.match(RE_DAL);
    if (dal && +dal[2] < d.giorno) return { data, testo: `dal ${dal[2]} al ${d.giorno} ${mese}` };
    const e = prima.match(RE_E);
    if (e && +e[2] < d.giorno) return { data, testo: `${e[2]} e ${d.giorno} ${mese}` };
    const giorno = `${GIORNI[new Date(data).getUTCDay()]} ${d.giorno} ${mese}`;
    // con il giorno della settimana scritto subito dopo «dal» la regola non vale: «dal» resta fuori
    if (RE_DA.test(prima) && !d.giornoSett) return { data, testo: `da ${giorno}` };
    return { data, testo: giorno };
  }
  return null;
}

// Il titolo con la data dell'evento in fondo, se c'è e se il titolo non la dice già
export function titoloConData(titolo, testo, pubblicato, lunghezza = 90) {
  const evento = dataEvento(testo, pubblicato);
  if (!evento) return titolo;
  const t = normalizza(titolo);
  const data = new Date(evento.data);
  const giorno = data.getUTCDate();
  const giaScritta =
    new RegExp(`\\b${giorno}(?:°|º)?\\s+${MESI[data.getUTCMonth()]}\\b`).test(t) || new RegExp(`\\b${giorno}/${data.getUTCMonth() + 1}\\b`).test(t);
  if (giaScritta) return titolo;
  const spazio = lunghezza - evento.testo.length - 3;
  const base = (titolo.length > spazio ? `${titolo.slice(0, spazio).replace(/\s+\S*$/, '')}…` : titolo).replace(/[\s.,;:–-]+$/, '');
  // se il titolo ha già un trattino, la data va fra parentesi: due trattini di fila si leggono male
  return base.includes(' – ') ? `${base} (${evento.testo})` : `${base} – ${evento.testo}`;
}
