// Legge i post della pagina Facebook del comitato e li trasforma in notizie del sito.
// Gira da solo su GitHub ogni mezz'ora: vedi .github/workflows/notizie-facebook.yml.
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
const GIORNO = 24 * 60 * 60 * 1000;
const GIORNI_STORICO = 30; // al primo avvio
const GIORNI_CONTROLLO = 60; // quanto indietro si controllano modifiche e cancellazioni
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
  if (!u) return null;
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

const EMOJI = /[\p{Extended_Pictographic}️‍]/gu;

// Le frasi del post, senza link, hashtag ed emoji
function frasi(testo) {
  return testo
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .split('\n')
    .map((r) => r.replace(EMOJI, '').replace(/\s+/g, ' ').trim())
    .filter((r) => /[\p{L}\p{N}]/u.test(r))
    .flatMap((r) => r.split(/(?<=[.!?…])\s+/))
    .map((f) => f.replace(/\s*\S+:$/, '').trim()) // toglie le etichette rimaste sole, come «Info:»
    .filter((f) => /[\p{L}\p{N}]/u.test(f));
}

const accorcia = (t, max) => (t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, '')}…` : t);

function primaFrase(testo) {
  const frase = (frasi(testo)[0] ?? '').replace(/[.:;,\s]+$/, '');
  return frase ? accorcia(frase, 90) : 'Notizia dalla pagina Facebook del comitato';
}

function sommarioProvvisorio(testo) {
  const resto = frasi(testo).slice(1).join(' ');
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
  if (link) {
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
  const ordine = ['title', 'date', 'category', 'summary', 'image', 'imageAlt', 'facebook', 'facebook_id', 'aggiornato', 'ai', 'firma'];
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
      aggiornato: p.updated_time,
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
  notizia.dati.aggiornato = p.updated_time;
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
  const finto = process.env.FB_FINTO;
  if (!token && !finto) {
    console.log('Il codice di accesso a Facebook non è ancora configurato: per ora non faccio niente.');
    return;
  }

  const adesso = Date.now();
  const stato = await leggiStato();
  stato.inizio ??= new Date(adesso - GIORNI_STORICO * GIORNO).toISOString();
  const daQuando = new Date(Math.max(new Date(stato.inizio).getTime(), adesso - GIORNI_CONTROLLO * GIORNO));

  const post = finto ? JSON.parse(await readFile(finto, 'utf8')).data : await leggiPost(token, daQuando);
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
      stato.saltati[p.id] = { motivo, data: p.created_time, aggiornato: p.updated_time };
      continue;
    }

    if (esistente) {
      if (esistente.dati.aggiornato !== p.updated_time) {
        await aggiornaNotizia(esistente, p, testo);
        conta.aggiornate++;
        console.log(`Aggiornata: ${esistente.slug}`);
      }
      continue;
    }

    if (new Date(p.created_time) < new Date(stato.inizio)) continue; // pubblicato prima dell'avvio
    const giaSaltato = stato.saltati[p.id];
    if (giaSaltato && giaSaltato.aggiornato === p.updated_time) continue;

    const foto = await preparaFoto(p);
    const firma = { testo: improntaTesto(testo), foto: foto[0]?.impronta ?? null, link: linkEsterno(p) };
    const doppione = trovaDoppione(firma, p.created_time, notizie.elenco);
    if (doppione) {
      stato.saltati[p.id] = { motivo: `uguale a ${doppione.slug}`, data: p.created_time, aggiornato: p.updated_time };
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
