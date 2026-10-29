// Legge i post della pagina Facebook del comitato e li trasforma in notizie del sito.
// Gira da solo su GitHub più volte al giorno: vedi .github/workflows/notizie-facebook.yml.
//
// Due modi per leggere la pagina:
// - APIFY_TOKEN: con «Facebook Posts Scraper» di Apify, che legge la pagina pubblica (pochi centesimi a lettura);
// - FB_PAGE_TOKEN: con le API ufficiali di Meta, se un giorno l'app di Meta sarà pronta (gratis).
// Se ci sono tutti e due, si usano le API di Meta.
//
// Regole decise con il comitato:
// - ogni post diventa una notizia, tranne:
//   · i post che contengono #nosito;
//   · i post senza un testo nostro (per esempio le condivisioni di altre pagine senza commento);
//   · i post che rimandano a un articolo già pubblicato sul sito;
//   · i post uguali a una notizia uscita nei 7 giorni prima: stesso testo, stessa foto o stesso link.
//     Dopo 7 giorni, lo stesso contenuto ripubblicato diventa una notizia nuova.
// - se un post viene modificato su Facebook la notizia si aggiorna; se viene cancellato, sparisce.
// - al primo avvio si importa l'ultimo mese di post.
// - titolo, sommario e categoria sono provvisori (la prima frase del post): poi li riscrive l'AI,
//   che cerca le notizie con «ai: false».
//
// Per le prove senza Facebook: FB_FINTO=percorso/di/post.json (stesso formato della risposta di Facebook).

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import YAML from 'yaml';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CARTELLA_NOTIZIE = path.join(RADICE, 'src/content/news');
const CARTELLA_FOTO = path.join(RADICE, 'public/news');
const FILE_STATO = path.join(RADICE, 'scripts/facebook/stato.json');
const FILE_MESSAGGIO = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'messaggio-facebook.txt');

const VERSIONE_API = process.env.FB_VERSIONE_API || 'v26.0';
const PAGINA_FACEBOOK = 'https://www.facebook.com/ComitatoAciliaNord/';
const ATTORE_APIFY = 'apify~facebook-posts-scraper';
const GIORNO = 24 * 60 * 60 * 1000;
const GIORNI_STORICO = 30; // al primo avvio
const GIORNI_CONTROLLO = 60; // quanto indietro si controllano modifiche e cancellazioni (API di Meta)
const GIORNI_CONTROLLO_APIFY = 1; // con Apify si rilegge solo l'ultimo giorno, per spendere poco
const GIORNI_DOPPIONI = 7;
const DOMINIO_SITO = 'comitatoacilianord.it';
const MAX_FOTO = 10;
const SOGLIA_FOTO_UGUALI = 6; // differenza massima tra le impronte di due foto «uguali»

class ErroreFacebook extends Error {
  constructor(errore) {
    const scaduto = errore?.code === 190;
    super(
      scaduto
        ? 'Il codice di accesso a Facebook non è più valido: va rinnovato.'
        : `Facebook ha risposto con un errore: ${errore?.message ?? 'sconosciuto'}`,
    );
    this.scaduto = scaduto;
  }
}

// ---------- Facebook ----------

const CAMPI = [
  'id',
  'message',
  'created_time',
  'updated_time',
  'permalink_url',
  'status_type',
  'full_picture',
  'attachments{media_type,type,url,unshimmed_url,title,description,media{image{src,width,height}},target{id,url},subattachments.limit(20){media_type,type,url,media{image{src,width,height}},target{id,url}}}',
].join(',');

async function leggiPost(token, daQuando) {
  const parametri = new URLSearchParams({
    fields: CAMPI,
    since: String(Math.floor(daQuando.getTime() / 1000)),
    limit: '25',
    access_token: token,
  });
  let indirizzo = `https://graph.facebook.com/${VERSIONE_API}/me/posts?${parametri}`;
  const tutti = [];
  for (let pagina = 0; indirizzo && pagina < 40; pagina++) {
    const risposta = await fetch(indirizzo);
    const dati = await risposta.json().catch(() => ({}));
    if (!risposta.ok || dati.error) throw new ErroreFacebook(dati.error);
    tutti.push(...(dati.data ?? []));
    indirizzo = dati.paging?.next;
  }
  return tutti;
}

class ErroreApify extends Error {}

async function leggiPostApify(token, daQuando, limite) {
  const risposta = await fetch(`https://api.apify.com/v2/acts/${ATTORE_APIFY}/run-sync-get-dataset-items?timeout=280`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      startUrls: [{ url: PAGINA_FACEBOOK }],
      resultsLimit: limite,
      onlyPostsNewerThan: daQuando.toISOString().slice(0, 19),
    }),
  });
  const dati = await risposta.json().catch(() => null);
  if (!risposta.ok || !Array.isArray(dati)) {
    throw new ErroreApify(`Apify ha risposto con un errore (${risposta.status}): ${JSON.stringify(dati)?.slice(0, 300)}`);
  }
  return dati.filter((voce) => voce && voce.postId && !voce.error).map(daApify);
}

// Trasforma un post letto da Apify nella stessa forma delle API di Meta
function daApify(voce) {
  const media = Array.isArray(voce.media) ? voce.media : [];
  const src = (m) => m.image?.uri || m.photo_image?.uri || m.thumbnail;
  const foto = media.filter((m) => (m.__typename === 'Photo' || m.__isMedia === 'Photo') && src(m));
  const video = media.find((m) => m.__typename === 'Video' || m.__isMedia === 'Video' || m.is_playable === true);
  const linkMedia = media
    .map((m) => m.story_attachment_link_renderer?.attachment?.web_link?.url || m.story_attachment_link_renderer?.attachment?.url)
    .find(Boolean);
  const link = voce.link || linkMedia;

  let allegati;
  if (video) {
    allegati = [{ media_type: 'video', type: 'video_inline', media: src(video) ? { image: { src: src(video) } } : undefined, target: { id: video.id } }];
  } else if (foto.length > 1) {
    allegati = [
      {
        media_type: 'album',
        type: 'album',
        subattachments: { data: foto.map((m) => ({ media_type: 'photo', type: 'photo', media: { image: { src: src(m) } }, target: { id: m.id } })) },
      },
    ];
  } else if (foto.length === 1) {
    allegati = [{ media_type: 'photo', type: 'photo', media: { image: { src: src(foto[0]) } }, target: { id: foto[0].id } }];
  } else if (link) {
    const titolo = media.map((m) => m.title_with_entities?.text).find(Boolean);
    allegati = [{ media_type: 'link', type: 'share', url: link, title: titolo }];
  }

  return {
    id: String(voce.postId),
    message: voce.text ?? '',
    created_time: voce.time,
    permalink_url: voce.url,
    status_type: video ? 'added_video' : foto.length ? 'added_photos' : link ? 'shared_story' : 'mobile_status_update',
    attachments: allegati ? { data: allegati } : undefined,
  };
}

// Un'impronta del contenuto del post: se cambia, il post è stato modificato su Facebook
function versioneDelPost(p) {
  const a = allegato(p);
  const id = [a?.target?.id, ...(a?.subattachments?.data ?? []).map((s) => s.target?.id)].filter(Boolean);
  return createHash('sha1').update(`${p.message ?? ''}|${id.join(',')}`).digest('hex').slice(0, 12);
}

async function scarica(indirizzo) {
  if (indirizzo.startsWith('file://')) return readFile(fileURLToPath(indirizzo));
  const risposta = await fetch(indirizzo);
  if (!risposta.ok) throw new Error(`Foto non scaricata (${risposta.status})`);
  return Buffer.from(await risposta.arrayBuffer());
}

// ---------- Lettura dei post ----------

const allegato = (p) => p.attachments?.data?.[0];

function testoDelPost(p) {
  const testo = (p.message ?? '').trim();
  if (testo) return testo;
  // Gli eventi creati dalla pagina hanno il testo nell'allegato
  const a = allegato(p);
  if (p.status_type === 'created_event' && a) return [a.title, a.description].filter(Boolean).join('\n\n').trim();
  return '';
}

function eVideo(p) {
  const a = allegato(p);
  return p.status_type === 'added_video' || /video/.test(a?.media_type ?? '') || /video/.test(a?.type ?? '');
}

function eLink(p) {
  const a = allegato(p);
  return a && (a.media_type === 'link' || a.type === 'share');
}

// Il link a cui rimanda il post, senza il passaggio da Facebook e i parametri di tracciamento
function linkPulito(p) {
  const a = allegato(p);
  if (!eLink(p)) return null;
  const grezzo = a.unshimmed_url || a.url;
  if (!grezzo) return null;
  try {
    let u = new URL(grezzo);
    if (/(^|\.)facebook\.com$/.test(u.hostname) && u.pathname === '/l.php' && u.searchParams.get('u')) {
      u = new URL(u.searchParams.get('u'));
    }
    for (const chiave of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid$|mibextid$|ref$)/.test(chiave)) u.searchParams.delete(chiave);
    }
    return u;
  } catch {
    return null;
  }
}

// Lo stesso link in forma breve, per riconoscerlo anche se scritto in modo diverso
function linkEsterno(p) {
  const u = linkPulito(p);
  if (!u || /(^|\.)facebook\.com$/.test(u.hostname)) return null;
  return `${u.hostname.replace(/^www\./, '').toLowerCase()}${u.pathname.replace(/\/+$/, '')}${u.search}`;
}

function motivoPerSaltare(p, testo) {
  if (/#nosito\b/i.test(p.message ?? '')) return 'contiene #nosito';
  if (!testo) return 'senza un testo nostro';
  const link = linkEsterno(p);
  if (link && link.startsWith(DOMINIO_SITO)) return 'rimanda a un articolo del sito';
  return null;
}

// ---------- Impronte per riconoscere i doppioni ----------

// Il testo ridotto all'osso (minuscole, senza link, hashtag, emoji e punteggiatura):
// due post con quasi le stesse parole sono «lo stesso testo».
function improntaTesto(testo) {
  const pulito = testo
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (pulito.split(' ').length < 6) return null; // testi troppo brevi («Buongiorno!») non bastano
  return pulito.length > 400 ? pulito.slice(0, 400).replace(/\s+\S*$/, '') : pulito;
}

function stessoTesto(a, b) {
  const parole = (t) => new Set(t.split(' ').filter((p) => p.length >= 3));
  const pa = parole(a);
  const pb = parole(b);
  if (pa.size < 5 || pb.size < 5) return a === b;
  let comuni = 0;
  for (const p of pa) if (pb.has(p)) comuni++;
  return comuni / Math.min(pa.size, pb.size) >= 0.85;
}

// dHash: 64 bit che descrivono la foto; foto quasi identiche hanno impronte vicine
async function improntaFoto(buffer) {
  const pixel = await sharp(buffer).grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bit = 0n;
  for (let riga = 0; riga < 8; riga++) {
    for (let col = 0; col < 8; col++) {
      bit = (bit << 1n) | (pixel[riga * 9 + col] > pixel[riga * 9 + col + 1] ? 1n : 0n);
    }
  }
  return bit.toString(16).padStart(16, '0');
}

function distanza(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

function trovaDoppione(firma, creato, elenco) {
  const t = new Date(creato).getTime();
  return elenco.find((n) => {
    const d = new Date(n.dati.date).getTime();
    if (!(d <= t && t - d <= GIORNI_DOPPIONI * GIORNO)) return false;
    const f = n.dati.firma ?? {};
    return (
      (firma.testo && f.testo && stessoTesto(firma.testo, f.testo)) ||
      (firma.link && f.link === firma.link) ||
      (firma.foto && f.foto && distanza(firma.foto, f.foto) <= SOGLIA_FOTO_UGUALI)
    );
  });
}

// ---------- Foto ----------

function fontiFoto(p) {
  if (eLink(p)) return []; // l'anteprima di un link esterno non è una foto nostra
  const a = allegato(p);
  const fonti = [];
  const sotto = a?.subattachments?.data ?? [];
  for (const s of sotto) if (s.media?.image?.src) fonti.push(s.media.image.src);
  if (!fonti.length && a?.media?.image?.src) fonti.push(a.media.image.src);
  if (!fonti.length && p.full_picture) fonti.push(p.full_picture);
  return fonti.slice(0, MAX_FOTO);
}

async function preparaFoto(p) {
  const foto = [];
  for (const fonte of fontiFoto(p)) {
    try {
      const originale = await scarica(fonte);
      const buffer = await sharp(originale).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      foto.push({ buffer, impronta: foto.length === 0 ? await improntaFoto(originale) : null });
    } catch (errore) {
      console.warn(`Una foto del post ${p.id} non è stata scaricata: ${errore.message}`);
    }
  }
  return foto;
}

// ---------- Testi provvisori ----------

const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u{FE0F}\u{200D}\u{20E3}]/gu;

// Nomi da lasciare con la maiuscola quando un titolo scritto TUTTO MAIUSCOLO diventa normale
const NOMI_PROPRI = [
  'Acilia', 'Nord', 'Monti', 'San', 'Paolo', 'Poggio', 'Todis', 'AMA', 'ATAC', 'Cotral', 'Roma', 'Municipio', 'X',
  'Capelvenere', 'Ficana', 'Pater', 'Casette', 'Retake', 'FTS', 'PRU', 'Dragona', 'Ostia', 'Ostiense', 'Tevere',
  'Pasolini', 'Natale', 'Pasqua', 'Carnevale', 'Calle', 'Lido', 'Duranti', 'Raggio', 'Sole', 'Cugno', 'Labsus', 'Lazio',
];
const MAPPA_NOMI = new Map(NOMI_PROPRI.map((n) => [n.toLowerCase(), n]));

function minuscoleConNomi(testo) {
  const t = testo.toLowerCase().replace(/\p{L}+/gu, (parola) => MAPPA_NOMI.get(parola) ?? parola);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Toglie link, hashtag in fondo alle righe ed emoji; gli hashtag dentro la frase restano come parole
function pulisci(testo) {
  return testo
    .replace(/https?:\/\/\S+/g, '')
    .replace(/(\s*#[\p{L}\p{N}_]+)+\s*$/gmu, '')
    .replace(/#([\p{L}\p{N}_]+)/gu, '$1')
    .replace(EMOJI, ' ');
}

// I post del comitato spesso iniziano con un titolo TUTTO MAIUSCOLO: «INSIEME PER IL DECORO AL POGGIO 💁 …».
// Se c'è, diventa il titolo (con le minuscole) e il resto del post fa da sommario.
function separaTitolo(testo) {
  const righe = pulisci(testo).split('\n');
  const parole = righe[0].split(/\s+/).filter(Boolean);
  const prese = [];
  let i = 0;
  for (; i < parole.length; i++) {
    const lettere = parole[i].replace(/[^\p{L}]/gu, '');
    if (lettere ? lettere !== lettere.toUpperCase() : !/^[\d;:,.!?'’"()–-]+$/.test(parole[i])) break;
    prese.push(parole[i]);
  }
  let titolo = prese.join(' ');
  let avanzo = '';
  const taglio = titolo.search(/\s*[;:]/);
  if (taglio > 0) {
    avanzo = titolo.slice(taglio).replace(/^\s*[;:]\s*/, '');
    titolo = titolo.slice(0, taglio);
  }
  titolo = titolo.replace(/[\s.,;:!?–-]+$/, '');
  if (titolo.split(/\s+/).filter((p) => /\p{L}{2,}/u.test(p)).length < 2) return null;
  const resto = [avanzo ? minuscoleConNomi(avanzo) : '', parole.slice(i).join(' '), ...righe.slice(1)].filter(Boolean).join('\n');
  return { titolo: minuscoleConNomi(titolo), resto };
}

// Le frasi di un testo già ripulito
function frasi(testo) {
  return pulisci(testo)
    .split('\n')
    .map((r) => r.replace(/\s+/g, ' ').trim())
    .filter((r) => /[\p{L}\p{N}]/u.test(r))
    .flatMap((r) => r.split(/(?<=[.!?…])\s+/))
    .map((f) => f.replace(/\s*\S+:$/, '').trim()) // toglie le etichette rimaste sole, come «Info:»
    .filter((f) => /[\p{L}\p{N}]/u.test(f));
}

const accorcia = (t, max) => (t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, '')}…` : t);

function primaFrase(testo) {
  const separato = separaTitolo(testo);
  if (separato) return accorcia(separato.titolo, 90);
  const frase = (frasi(testo)[0] ?? '').replace(/[.:;,\s]+$/, '');
  return frase ? accorcia(frase, 90) : 'Notizia dal comitato';
}

function sommarioProvvisorio(testo) {
  const separato = separaTitolo(testo);
  const resto = separato ? frasi(separato.resto).join(' ') : frasi(testo).slice(1).join(' ');
  return resto ? accorcia(resto, 170) : undefined;
}

const PAROLE_CATEGORIE = {
  decoro: ['pulizia', 'pulito', 'rifiuti', 'decoro', 'retake', 'ama', 'spazzatura', 'degrado', 'cassonett', 'graffit', 'sporc'],
  segnalazioni: ['segnalazion', 'segnala', 'buca', 'buche', 'lampion', 'illuminazion', 'guasto', 'pericol', 'perdita', 'allagament'],
  mobilita: ['strada', 'strade', 'traffico', 'autobus', 'atac', 'stazione', 'treno', 'roma-lido', 'parcheggi', 'viabilità', 'marciapied', 'ciclabil', 'semafor', 'cotral', 'ponte'],
  verde: ['parco', 'verd', 'alber', 'pinetina', 'giardin', 'potatur', 'pru', 'piantumazion', 'prato', 'riserva'],
  eventi: ['festa', 'evento', 'concerto', 'carnevale', 'natale', 'torneo', 'burraco', 'mostra', 'spettacolo', 'laboratorio', 'vi aspettiamo', 'ti aspettiamo', 'cinema'],
  storia: ['storia', 'casette pater', 'anniversario', 'memoria', 'lido duranti', 'ficana', 'ricord', 'pietra d'],
  comitato: ['assemblea', 'direttivo', 'soci', 'tesseramento', 'giornalino', 'elezioni', 'casetta'],
};

function categoriaProvvisoria(testo) {
  const t = testo.toLowerCase();
  let migliore = 'comitato';
  let punti = 0;
  for (const [categoria, parole] of Object.entries(PAROLE_CATEGORIE)) {
    const n = parole.reduce((somma, parola) => somma + (t.split(parola).length - 1), 0);
    if (n > punti) {
      migliore = categoria;
      punti = n;
    }
  }
  return migliore;
}

// ---------- Markdown ----------

function proteggi(testo) {
  return testo
    .replace(/([\\`*_[\]<>#|~])/g, '\\$1')
    .replace(/^(\d+)([.)])(\s)/, '$1\\$2$3')
    .replace(/^([-+])(\s)/, '\\$1$2');
}

const LINK = /https?:\/\/[^\s<>]+[^\s<>.,;:!?'"»)\]]/g;

function testoInMarkdown(testo) {
  return testo
    .split(/\n\s*\n/)
    .map((paragrafo) =>
      paragrafo
        .split('\n')
        .map((riga) => {
          riga = riga.trim();
          let fuori = '';
          let ultimo = 0;
          for (const m of riga.matchAll(LINK)) {
            fuori += `${proteggi(riga.slice(ultimo, m.index))}<${m[0]}>`;
            ultimo = m.index + m[0].length;
          }
          return fuori + proteggi(riga.slice(ultimo));
        })
        .filter(Boolean)
        .join('\\\n'),
    )
    .filter(Boolean)
    .join('\n\n');
}

function corpoNotizia(p, testo, foto, slug) {
  const parti = [testoInMarkdown(testo)];
  for (let i = 1; i < foto.length; i++) parti.push(`![](/news/${slug}/${i + 1}.webp)`);
  if (eVideo(p) && p.permalink_url) parti.push(`[Guarda il video su Facebook](${p.permalink_url})`);
  const link = linkPulito(p);
  if (link && !/(^|\.)facebook\.com$/.test(link.hostname)) {
    const etichetta = (allegato(p).title || link.hostname.replace(/^www\./, '')).trim();
    parti.push(`[${proteggi(etichetta)}](<${link.href}>)`);
  }
  return `${parti.join('\n\n')}\n`;
}

// ---------- File delle notizie ----------

const dataRoma = (data) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date(data));

function slugDa(titolo) {
  return titolo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 6)
    .join('-')
    .slice(0, 60)
    .replace(/-+$/, '');
}

async function leggiNotizie() {
  const elenco = [];
  if (existsSync(CARTELLA_NOTIZIE)) {
    for (const nome of await readdir(CARTELLA_NOTIZIE)) {
      if (!nome.endsWith('.md')) continue;
      const file = path.join(CARTELLA_NOTIZIE, nome);
      const contenuto = await readFile(file, 'utf8');
      const m = contenuto.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (!m) continue;
      elenco.push({ file, slug: nome.slice(0, -3), dati: YAML.parse(m[1]) ?? {} });
    }
  }
  const perId = new Map(elenco.filter((n) => n.dati.facebook_id).map((n) => [String(n.dati.facebook_id), n]));
  return { elenco, perId };
}

async function scriviNotizia(notizia, corpo) {
  const ordine = ['title', 'date', 'category', 'summary', 'image', 'imageAlt', 'facebook', 'facebook_id', 'versione', 'ai', 'firma'];
  const dati = Object.fromEntries(ordine.filter((k) => notizia.dati[k] !== undefined).map((k) => [k, notizia.dati[k]]));
  await writeFile(notizia.file, `---\n${YAML.stringify(dati, { lineWidth: 0 })}---\n\n${corpo}`);
}

async function salvaFoto(slug, foto) {
  const cartella = path.join(CARTELLA_FOTO, slug);
  await rm(cartella, { recursive: true, force: true });
  if (!foto.length) return;
  await mkdir(cartella, { recursive: true });
  await Promise.all(foto.map((f, i) => writeFile(path.join(cartella, `${i + 1}.webp`), f.buffer)));
}

async function creaNotizia(p, testo, foto, firma, slugEsistenti) {
  const titolo = primaFrase(testo);
  const base = `${dataRoma(p.created_time)}-${slugDa(titolo) || 'notizia'}`;
  let slug = base;
  for (let n = 2; slugEsistenti.has(slug); n++) slug = `${base}-${n}`;
  slugEsistenti.add(slug);

  const notizia = {
    file: path.join(CARTELLA_NOTIZIE, `${slug}.md`),
    slug,
    dati: {
      title: titolo,
      date: new Date(p.created_time).toISOString(),
      category: categoriaProvvisoria(testo),
      summary: sommarioProvvisorio(testo),
      image: foto.length ? `/news/${slug}/1.webp` : undefined,
      imageAlt: foto.length ? '' : undefined,
      facebook: p.permalink_url,
      facebook_id: p.id,
      versione: versioneDelPost(p),
      ai: false,
      firma,
    },
  };
  await salvaFoto(slug, foto);
  await scriviNotizia(notizia, corpoNotizia(p, testo, foto, slug));
  return notizia;
}

async function aggiornaNotizia(notizia, p, testo) {
  const foto = await preparaFoto(p);
  const firma = { testo: improntaTesto(testo), foto: foto[0]?.impronta ?? null, link: linkEsterno(p) };
  const testoCambiato = firma.testo !== notizia.dati.firma?.testo;
  if (testoCambiato) {
    // Il testo è cambiato: titolo e sommario tornano provvisori e l'AI li riscrive
    const titolo = primaFrase(testo);
    notizia.dati.title = titolo;
    notizia.dati.summary = sommarioProvvisorio(testo);
    notizia.dati.ai = false;
  }
  notizia.dati.image = foto.length ? `/news/${notizia.slug}/1.webp` : undefined;
  if (!foto.length) notizia.dati.imageAlt = undefined;
  notizia.dati.facebook = p.permalink_url;
  notizia.dati.versione = versioneDelPost(p);
  notizia.dati.firma = firma;
  await salvaFoto(notizia.slug, foto);
  await scriviNotizia(notizia, corpoNotizia(p, testo, foto, notizia.slug));
}

async function togliNotizia(notizia) {
  await rm(notizia.file, { force: true });
  await rm(path.join(CARTELLA_FOTO, notizia.slug), { recursive: true, force: true });
}

// ---------- Stato ----------

async function leggiStato() {
  try {
    return { saltati: {}, ...JSON.parse(await readFile(FILE_STATO, 'utf8')) };
  } catch {
    return { saltati: {} };
  }
}

// ---------- Programma ----------

async function main() {
  const token = process.env.FB_PAGE_TOKEN;
  const tokenApify = process.env.APIFY_TOKEN;
  const finto = process.env.FB_FINTO;
  const fintoApify = process.env.FB_FINTO_APIFY;
  if (!token && !tokenApify && !finto && !fintoApify) {
    console.log('Nessun collegamento con Facebook configurato (APIFY_TOKEN o FB_PAGE_TOKEN): per ora non faccio niente.');
    return;
  }
  const conApify = !token && Boolean(tokenApify || fintoApify);

  const adesso = Date.now();
  const stato = await leggiStato();
  stato.inizio ??= new Date(adesso - GIORNI_STORICO * GIORNO).toISOString();
  const primoAvvio = !stato.ultimaLettura;
  const giorniControllo = conApify && !primoAvvio ? GIORNI_CONTROLLO_APIFY : GIORNI_CONTROLLO;
  const daQuando = new Date(Math.max(new Date(stato.inizio).getTime(), adesso - giorniControllo * GIORNO));

  let post;
  if (finto) post = JSON.parse(await readFile(finto, 'utf8')).data;
  else if (fintoApify) post = JSON.parse(await readFile(fintoApify, 'utf8')).map(daApify);
  else if (token) post = await leggiPost(token, daQuando);
  else post = await leggiPostApify(tokenApify, daQuando, primoAvvio ? 80 : 15);
  for (const p of post) p.updated_time ??= p.created_time;
  post.sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

  await mkdir(CARTELLA_NOTIZIE, { recursive: true });
  const notizie = await leggiNotizie();
  const slugEsistenti = new Set(notizie.elenco.map((n) => n.slug));
  const conta = { nuove: 0, aggiornate: 0, tolte: 0 };
  const visti = new Set();

  for (const p of post) {
    visti.add(p.id);
    const esistente = notizie.perId.get(p.id);
    const testo = testoDelPost(p);
    const motivo = motivoPerSaltare(p, testo);

    if (motivo) {
      if (esistente) {
        await togliNotizia(esistente);
        notizie.elenco.splice(notizie.elenco.indexOf(esistente), 1);
        conta.tolte++;
        console.log(`Tolta: ${esistente.slug} (${motivo})`);
      }
      stato.saltati[p.id] = { motivo, data: p.created_time, versione: versioneDelPost(p) };
      continue;
    }

    if (esistente) {
      if (esistente.dati.versione !== versioneDelPost(p)) {
        await aggiornaNotizia(esistente, p, testo);
        conta.aggiornate++;
        console.log(`Aggiornata: ${esistente.slug}`);
      }
      continue;
    }

    if (new Date(p.created_time) < new Date(stato.inizio)) continue; // pubblicato prima dell'avvio
    const giaSaltato = stato.saltati[p.id];
    if (giaSaltato && giaSaltato.versione === versioneDelPost(p)) continue;

    const foto = await preparaFoto(p);
    const firma = { testo: improntaTesto(testo), foto: foto[0]?.impronta ?? null, link: linkEsterno(p) };
    const doppione = trovaDoppione(firma, p.created_time, notizie.elenco);
    if (doppione) {
      stato.saltati[p.id] = { motivo: `uguale a ${doppione.slug}`, data: p.created_time, versione: versioneDelPost(p) };
      console.log(`Saltato il post ${p.id}: uguale a ${doppione.slug}`);
      continue;
    }

    const nuova = await creaNotizia(p, testo, foto, firma, slugEsistenti);
    notizie.elenco.push(nuova);
    notizie.perId.set(p.id, nuova);
    delete stato.saltati[p.id];
    conta.nuove++;
    console.log(`Nuova: ${nuova.slug}`);
  }

  // Post cancellati su Facebook: le notizie recenti il cui post non c'è più spariscono.
  // Se Facebook non ha restituito nessun post, per prudenza non si cancella niente.
  if (post.length > 0) {
    for (const n of [...notizie.elenco]) {
      const id = n.dati.facebook_id && String(n.dati.facebook_id);
      if (!id || visti.has(id) || new Date(n.dati.date) < daQuando) continue;
      await togliNotizia(n);
      notizie.elenco.splice(notizie.elenco.indexOf(n), 1);
      conta.tolte++;
      console.log(`Tolta: ${n.slug} (cancellata su Facebook)`);
    }
  }

  // Lo stato tiene solo i post saltati ancora dentro la finestra di controllo
  for (const [id, voce] of Object.entries(stato.saltati)) {
    if (new Date(voce.data) < daQuando) delete stato.saltati[id];
  }
  stato.ultimaLettura = new Date(adesso).toISOString();
  await writeFile(FILE_STATO, `${JSON.stringify(stato, null, 2)}\n`);

  const parti = [];
  if (conta.nuove) parti.push(`${conta.nuove} ${conta.nuove === 1 ? 'nuova' : 'nuove'}`);
  if (conta.aggiornate) parti.push(`${conta.aggiornate} ${conta.aggiornate === 1 ? 'aggiornata' : 'aggiornate'}`);
  if (conta.tolte) parti.push(`${conta.tolte} ${conta.tolte === 1 ? 'tolta' : 'tolte'}`);
  const messaggio = parti.length ? `Notizie da Facebook: ${parti.join(', ')}` : 'Notizie da Facebook: nessuna novità';
  await writeFile(FILE_MESSAGGIO, messaggio);
  console.log(messaggio);
}

main().catch((errore) => {
  console.error(errore.message);
  process.exit(errore.scaduto ? 2 : 1);
});
