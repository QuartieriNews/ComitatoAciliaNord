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
// - ogni notizia porta tutte le foto del post. Il lettore dei post di Apify ne vede al massimo cinque,
//   piccole: per le notizie nuove o modificate le foto si prendono da «Facebook Photos Scraper»,
//   tutte e alla risoluzione piena. Ogni foto si salva grande e in miniatura.
// - i post con un video (anche i reel) portano la copertina del video e l'indirizzo del video:
//   sul sito la copertina ha un ▶ e toccandola parte il lettore di Facebook.
// - le foto vanno nello spazio R2 di Cloudflare (contenitore «comitato-foto», segreti R2_ENDPOINT,
//   R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY): così il repository resta leggero. Il nome di ogni file
//   contiene un pezzo della sua impronta (news/<notizia>/1-ab12cd34.webp), quindi una foto cambiata
//   ha un indirizzo nuovo e i browser la possono tenere in memoria per sempre. Senza i segreti, o se R2
//   non risponde, le foto si salvano nel repository come prima (public/news/<notizia>/1.webp).
//
// Avvio a mano con FB_RIFAI_FOTO=1 (casella «Rifai le foto» su GitHub): non legge i post, riscarica
// tutte le foto delle notizie già pubblicate. Serve dopo un cambio nel modo di salvare le foto; con R2
// sposta anche le foto dal repository a R2.
//
// Per le prove senza Facebook: FB_FINTO=percorso/di/post.json (stesso formato della risposta di Facebook);
// FB_FINTO_FOTO=percorso/di/foto.json ({ "indirizzo del post": [{ "image": "file:///..." }] }).
// Per le prove senza Cloudflare: R2_ENDPOINT verso un server finto e R2_PUBBLICO con il suo indirizzo.

import { AwsClient } from 'aws4fetch';
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
const ATTORE_FOTO_APIFY = 'apify~facebook-photos-scraper';
const GIORNO = 24 * 60 * 60 * 1000;
const GIORNI_STORICO = 30; // al primo avvio
const GIORNI_CONTROLLO = 60; // quanto indietro si controllano modifiche e cancellazioni (API di Meta)
const GIORNI_CONTROLLO_APIFY = 1; // con Apify si rilegge solo l'ultimo giorno, per spendere poco
const GIORNI_DOPPIONI = 7;
const DOMINIO_SITO = 'comitatoacilianord.it';
const MAX_FOTO = 40; // per post: un tetto di sicurezza, i post del comitato ne hanno molte meno
const LATO_FOTO = 1600; // pixel del lato lungo della foto grande
const LATO_MINI = 640; // pixel del lato lungo della miniatura
const SOGLIA_FOTO_UGUALI = 6; // differenza massima tra le impronte di due foto «uguali»

// Lo spazio R2 di Cloudflare per le foto: il contenitore e il suo indirizzo pubblico.
// Al lancio del sito l'indirizzo pubblico diventerà un sottodominio di comitatoacilianord.it.
const R2_CONTENITORE = 'comitato-foto';
const R2_PUBBLICO = (process.env.R2_PUBBLICO || 'https://pub-1a652fc7e0ed4778866523e19f9f24bf.r2.dev').replace(/\/+$/, '');
const R2_INDIRIZZO = (process.env.R2_ENDPOINT || '').trim().replace(/\/+$/, '').replace(new RegExp(`/${R2_CONTENITORE}$`), '');
const r2 =
  R2_INDIRIZZO && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
    ? new AwsClient({
        accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
        service: 's3',
        region: 'auto',
      })
    : null;

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

// Da dove prendere tutte le foto di un post: la chiave di Apify, oppure un file di prova. Lo imposta main().
const fonteFoto = { token: null, finto: null };

// Tutte le foto di un post, alla risoluzione piena, con «Facebook Photos Scraper» di Apify
// (0,002 $ a foto più 0,001 $ a lettura). Se qualcosa va storto restituisce un elenco vuoto
// e la notizia tiene le foto del lettore dei post.
async function fotoComplete(indirizzoPost) {
  if (!indirizzoPost) return [];
  if (fonteFoto.finto) return (fonteFoto.finto[indirizzoPost] ?? []).map((v) => v.image).filter(Boolean).slice(0, MAX_FOTO);
  if (!fonteFoto.token) return [];
  try {
    const risposta = await fetch(
      `https://api.apify.com/v2/acts/${ATTORE_FOTO_APIFY}/run-sync-get-dataset-items?timeout=180&maxTotalChargeUsd=0.25`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${fonteFoto.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ startUrls: [{ url: indirizzoPost }], resultsLimit: MAX_FOTO }),
      },
    );
    const dati = await risposta.json().catch(() => null);
    if (!risposta.ok || !Array.isArray(dati)) {
      console.warn(`Foto complete non lette per ${indirizzoPost} (${risposta.status}): restano quelle del post.`);
      return [];
    }
    return dati
      .filter((v) => v && !v.error && typeof v.image === 'string')
      .map((v) => v.image)
      .slice(0, MAX_FOTO);
  } catch (errore) {
    console.warn(`Foto complete non lette per ${indirizzoPost}: ${errore.message}`);
    return [];
  }
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
    allegati = [
      {
        media_type: 'video',
        type: 'video_inline',
        url: video.url,
        media: src(video) ? { image: { src: src(video) } } : undefined,
        target: { id: video.id },
      },
    ];
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

// L'impronta della prima foto del post, per riconoscere i doppioni prima di scaricare tutto
async function improntaPrimaFoto(p) {
  const fonte = fontiFoto(p)[0];
  if (!fonte) return null;
  try {
    return await improntaFoto(await scarica(fonte));
  } catch {
    return null;
  }
}

// Scarica le foto: per ognuna una versione grande e una miniatura, con le misure
async function scaricaFoto(fonti, chi) {
  const foto = [];
  for (const fonte of fonti.slice(0, MAX_FOTO)) {
    try {
      const originale = sharp(await scarica(fonte)).rotate();
      const grande = await originale
        .clone()
        .resize({ width: LATO_FOTO, height: LATO_FOTO, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer({ resolveWithObject: true });
      const mini = await originale
        .clone()
        .resize({ width: LATO_MINI, height: LATO_MINI, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer();
      foto.push({ buffer: grande.data, mini, w: grande.info.width, h: grande.info.height });
    } catch (errore) {
      console.warn(`Una foto di ${chi} non è stata scaricata: ${errore.message}`);
    }
  }
  return foto;
}

// Le foto di una notizia: tutte quelle del post se si riesce a leggerle, altrimenti quelle del lettore dei post
async function preparaFoto(p) {
  const delPost = fontiFoto(p);
  if (!delPost.length) return [];
  const tutte = eVideo(p) ? [] : await fotoComplete(p.permalink_url);
  const foto = tutte.length >= delPost.length ? await scaricaFoto(tutte, `${p.id}`) : [];
  return foto.length ? foto : scaricaFoto(delPost, `${p.id}`);
}

// ---------- Dove stanno le foto ----------

async function caricaSuR2(chiave, dati) {
  const risposta = await r2.fetch(`${R2_INDIRIZZO}/${R2_CONTENITORE}/${chiave}`, {
    method: 'PUT',
    body: dati,
    headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' },
  });
  if (!risposta.ok) throw new Error(`R2 ha risposto ${risposta.status}: ${(await risposta.text()).slice(0, 200)}`);
}

// Quante notizie hanno dovuto tenere le foto nel repository perché R2 non rispondeva: finisce nel
// messaggio del caricamento, così si vede dall'elenco delle modifiche su GitHub.
let ripieghiR2 = 0;
const notaR2 = () => (ripieghiR2 ? ` (foto nel repository: R2 non ha risposto per ${ripieghiR2})` : '');

// Le chiavi su R2 delle foto di una notizia, ricavate dagli indirizzi scritti nella notizia
function chiaviSuR2(elenco = []) {
  return elenco
    .flatMap((f) => [f.src, f.mini])
    .filter((indirizzo) => typeof indirizzo === 'string' && indirizzo.startsWith(`${R2_PUBBLICO}/`))
    .map((indirizzo) => indirizzo.slice(R2_PUBBLICO.length + 1));
}

// Toglie da R2 le foto che non servono più. Se non ci riesce restano lì: occupano poco e non si vedono.
async function togliDaR2(chiavi) {
  if (!r2) return;
  for (const chiave of chiavi) {
    try {
      await r2.fetch(`${R2_INDIRIZZO}/${R2_CONTENITORE}/${chiave}`, { method: 'DELETE' });
    } catch (errore) {
      console.warn(`Non ho tolto ${chiave} da R2: ${errore.message}`);
    }
  }
}

// Salva le foto di una notizia e restituisce come la notizia le indica ({ src, mini, w, h }).
// «prima» sono le foto che la notizia aveva: quelle su R2 che non servono più si tolgono.
async function salvaFoto(slug, foto, prima = []) {
  const cartella = path.join(CARTELLA_FOTO, slug);
  await rm(cartella, { recursive: true, force: true });
  if (r2 && foto.length) {
    try {
      const elenco = [];
      for (const [i, f] of foto.entries()) {
        const impronta = createHash('sha256').update(f.buffer).digest('hex').slice(0, 8);
        const nome = `news/${slug}/${i + 1}-${impronta}`;
        await caricaSuR2(`${nome}.webp`, f.buffer);
        await caricaSuR2(`${nome}-mini.webp`, f.mini);
        elenco.push({ src: `${R2_PUBBLICO}/${nome}.webp`, mini: `${R2_PUBBLICO}/${nome}-mini.webp`, w: f.w, h: f.h });
      }
      const nuove = new Set(chiaviSuR2(elenco));
      await togliDaR2(chiaviSuR2(prima).filter((chiave) => !nuove.has(chiave)));
      return elenco;
    } catch (errore) {
      console.warn(`Le foto di ${slug} non sono andate su R2 (${errore.message}): le salvo nel repository.`);
      ripieghiR2++;
    }
  }
  await togliDaR2(chiaviSuR2(prima));
  if (!foto.length) return [];
  await mkdir(cartella, { recursive: true });
  await Promise.all(
    foto.flatMap((f, i) => [
      writeFile(path.join(cartella, `${i + 1}.webp`), f.buffer),
      writeFile(path.join(cartella, `${i + 1}-mini.webp`), f.mini),
    ]),
  );
  return foto.map((f, i) => ({ src: `/news/${slug}/${i + 1}.webp`, mini: `/news/${slug}/${i + 1}-mini.webp`, w: f.w, h: f.h }));
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

// Il testo della notizia. Le foto non stanno qui: sono nell'intestazione («foto») e la pagina le mostra.
function corpoNotizia(p, testo) {
  const parti = [testoInMarkdown(testo)];
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
  const ordine = ['title', 'date', 'category', 'summary', 'image', 'imageAlt', 'foto', 'video', 'facebook', 'facebook_id', 'versione', 'ai', 'firma'];
  const dati = Object.fromEntries(ordine.filter((k) => notizia.dati[k] !== undefined).map((k) => [k, notizia.dati[k]]));
  await writeFile(notizia.file, `---\n${YAML.stringify(dati, { lineWidth: 0 })}---\n\n${corpo}`);
}

// Le foto nell'intestazione della notizia (come le restituisce salvaFoto): la prima fa da copertina
function mettiFoto(notizia, elenco) {
  notizia.dati.image = elenco.length ? elenco[0].src : undefined;
  notizia.dati.imageAlt = elenco.length ? (notizia.dati.imageAlt ?? '') : undefined;
  notizia.dati.foto = elenco.length ? elenco : undefined;
}

// I post con un video: la notizia mostra la copertina del video, e toccandola parte il lettore
// di Facebook (vedi src/components/VideoNotizia.astro). «verticale» vale per i reel.
function mettiVideo(notizia, p) {
  if (!eVideo(p)) {
    notizia.dati.video = undefined;
    return;
  }
  const url = allegato(p)?.url || p.permalink_url;
  const copertina = notizia.dati.foto?.[0];
  const verticale = copertina?.w && copertina?.h ? copertina.h > copertina.w : /\/reel\//.test(url);
  notizia.dati.video = { url, verticale };
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
      facebook: p.permalink_url,
      facebook_id: p.id,
      versione: versioneDelPost(p),
      ai: false,
      firma,
    },
  };
  mettiFoto(notizia, await salvaFoto(slug, foto));
  mettiVideo(notizia, p);
  await scriviNotizia(notizia, corpoNotizia(p, testo));
  return notizia;
}

async function aggiornaNotizia(notizia, p, testo) {
  const foto = await preparaFoto(p);
  const firma = { testo: improntaTesto(testo), foto: await improntaPrimaFoto(p), link: linkEsterno(p) };
  const testoCambiato = firma.testo !== notizia.dati.firma?.testo;
  if (testoCambiato) {
    // Il testo è cambiato: titolo e sommario tornano provvisori e l'AI li riscrive
    const titolo = primaFrase(testo);
    notizia.dati.title = titolo;
    notizia.dati.summary = sommarioProvvisorio(testo);
    notizia.dati.ai = false;
  }
  mettiFoto(notizia, await salvaFoto(notizia.slug, foto, notizia.dati.foto));
  mettiVideo(notizia, p);
  notizia.dati.facebook = p.permalink_url;
  notizia.dati.versione = versioneDelPost(p);
  notizia.dati.firma = firma;
  await scriviNotizia(notizia, corpoNotizia(p, testo));
}

// «Rifai le foto»: riscarica tutte le foto delle notizie già pubblicate, senza leggere i post.
// Le notizie dei video tengono l'anteprima che hanno.
async function rifaiFoto(notizie) {
  let rifatte = 0;
  for (const notizia of notizie.elenco) {
    if (!notizia.dati.image || !notizia.dati.facebook) continue;
    const contenuto = await readFile(notizia.file, 'utf8');
    const corpo = contenuto.replace(/^---\n[\s\S]*?\n---\n*/, '');
    if (notizia.dati.video || corpo.includes('[Guarda il video su Facebook]')) continue;
    const fonti = await fotoComplete(notizia.dati.facebook);
    const foto = fonti.length ? await scaricaFoto(fonti, notizia.slug) : [];
    if (!foto.length) {
      console.warn(`Foto non rifatte per ${notizia.slug}: restano quelle di prima.`);
      continue;
    }
    mettiFoto(notizia, await salvaFoto(notizia.slug, foto, notizia.dati.foto));
    // Le foto in fondo al testo, come le salvava la versione precedente, ora stanno nella galleria
    const senzaFoto = corpo.replace(/\n*!\[\]\(\/news\/[^)\s]+\/\d+\.webp\)/g, '').trimEnd();
    await scriviNotizia(notizia, `${senzaFoto}\n`);
    rifatte++;
    console.log(`Foto rifatte: ${notizia.slug} (${foto.length})`);
  }
  return rifatte;
}

async function togliNotizia(notizia) {
  await rm(notizia.file, { force: true });
  await rm(path.join(CARTELLA_FOTO, notizia.slug), { recursive: true, force: true });
  await togliDaR2(chiaviSuR2(notizia.dati.foto));
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
  if (!token && !tokenApify && !finto && !fintoApify && !process.env.FB_FINTO_FOTO) {
    console.log('Nessun collegamento con Facebook configurato (APIFY_TOKEN o FB_PAGE_TOKEN): per ora non faccio niente.');
    return;
  }
  const conApify = !token && Boolean(tokenApify || fintoApify);
  fonteFoto.token = tokenApify || null;
  console.log(r2 ? `Foto: nello spazio R2 di Cloudflare (${R2_CONTENITORE}).` : 'Foto: nel repository (i segreti R2 non ci sono).');
  if (process.env.FB_FINTO_FOTO) fonteFoto.finto = JSON.parse(await readFile(process.env.FB_FINTO_FOTO, 'utf8'));

  if (process.env.FB_RIFAI_FOTO) {
    const rifatte = await rifaiFoto(await leggiNotizie());
    const messaggio = `Notizie da Facebook: tutte le foto in ${rifatte} ${rifatte === 1 ? 'notizia' : 'notizie'}${notaR2()}`;
    await writeFile(FILE_MESSAGGIO, messaggio);
    console.log(messaggio);
    return;
  }

  const adesso = Date.now();
  const stato = await leggiStato();
  const saltatiPrima = JSON.stringify(stato.saltati);
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

    const firma = { testo: improntaTesto(testo), foto: await improntaPrimaFoto(p), link: linkEsterno(p) };
    const doppione = trovaDoppione(firma, p.created_time, notizie.elenco);
    if (doppione) {
      stato.saltati[p.id] = { motivo: `uguale a ${doppione.slug}`, data: p.created_time, versione: versioneDelPost(p) };
      console.log(`Saltato il post ${p.id}: uguale a ${doppione.slug}`);
      continue;
    }

    const foto = await preparaFoto(p); // tutte, solo per i post che diventano notizie
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

  // Lo stato si riscrive solo se è successo qualcosa: altrimenti ogni lettura senza novità
  // diventerebbe una modifica su GitHub (e una pubblicazione su Cloudflare) solo per la data dell'ultima lettura.
  const daSalvare = primoAvvio || conta.nuove || conta.aggiornate || conta.tolte || JSON.stringify(stato.saltati) !== saltatiPrima;
  if (daSalvare) {
    // Lo stato tiene solo i post saltati ancora dentro la finestra di controllo
    for (const [id, voce] of Object.entries(stato.saltati)) {
      if (new Date(voce.data) < daQuando) delete stato.saltati[id];
    }
    stato.ultimaLettura = new Date(adesso).toISOString();
    await writeFile(FILE_STATO, `${JSON.stringify(stato, null, 2)}\n`);
  }

  const parti = [];
  if (conta.nuove) parti.push(`${conta.nuove} ${conta.nuove === 1 ? 'nuova' : 'nuove'}`);
  if (conta.aggiornate) parti.push(`${conta.aggiornate} ${conta.aggiornate === 1 ? 'aggiornata' : 'aggiornate'}`);
  if (conta.tolte) parti.push(`${conta.tolte} ${conta.tolte === 1 ? 'tolta' : 'tolte'}`);
  const messaggio = (parti.length ? `Notizie da Facebook: ${parti.join(', ')}` : 'Notizie da Facebook: nessuna novità') + notaR2();
  await writeFile(FILE_MESSAGGIO, messaggio);
  console.log(messaggio);
}

main().catch((errore) => {
  console.error(errore.message);
  process.exit(errore.scaduto ? 2 : 1);
});
