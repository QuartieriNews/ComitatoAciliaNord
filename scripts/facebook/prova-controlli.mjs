// Prove di controlli.mjs: node scripts/facebook/prova-controlli.mjs (da qualsiasi cartella)
import assert from 'node:assert/strict';
import { avvisoCredito, inizioLettura, leggiGiorno, limitePost, mezzanotteRoma } from './controlli.mjs';

const ORA = 60 * 60 * 1000;
const GIORNO = 24 * ORA;

// Giorni scritti a mano
assert.equal(leggiGiorno('2026-11-11', 'Prova'), '2026-11-11');
assert.equal(leggiGiorno(' 2026/11/11 ', 'Prova'), '2026-11-11');
assert.equal(leggiGiorno('11/11/2026', 'Prova'), '2026-11-11');
assert.equal(leggiGiorno('1-2-2026', 'Prova'), '2026-02-01');
assert.equal(leggiGiorno('3.11.2026', 'Prova'), '2026-11-03');
for (const sbagliato of ['', '2026-02-31', '2026-13-01', '11/11/26', 'ieri', '2026-11']) {
  assert.throws(() => leggiGiorno(sbagliato, 'Recupera'), /^Error: Recupera: «.*» non è una data valida/);
}
assert.equal(mezzanotteRoma('2026-11-11').toISOString(), '2026-11-10T23:00:00.000Z'); // ora solare
assert.equal(mezzanotteRoma('2026-07-01').toISOString(), '2026-06-30T22:00:00.000Z'); // ora legale

// Da quando leggere
const adesso = Date.parse('2026-11-20T12:00:00Z');
const inizio = '2026-10-06T08:55:49.545Z';
const base = { adesso, inizio, giorniControllo: 1 };
const iso = ({ daQuando, controlloDa }) => [daQuando.toISOString(), controlloDa.toISOString()];

// di solito: l'ultimo giorno
assert.deepEqual(iso(inizioLettura({ ...base, ultimaRiuscita: '2026-11-20T09:00:00Z' })), [
  '2026-11-19T12:00:00.000Z',
  '2026-11-19T12:00:00.000Z',
]);
assert.deepEqual(iso(inizioLettura({ ...base, ultimaRiuscita: '' })), ['2026-11-19T12:00:00.000Z', '2026-11-19T12:00:00.000Z']);
assert.deepEqual(iso(inizioLettura({ ...base, ultimaRiuscita: 'non è una data' })), [
  '2026-11-19T12:00:00.000Z',
  '2026-11-19T12:00:00.000Z',
]);
// dopo il blocco di novembre: da un'ora prima dell'ultima corsa riuscita
assert.deepEqual(iso(inizioLettura({ ...base, ultimaRiuscita: '2026-11-11T22:07:16Z' })), [
  '2026-11-11T21:07:16.000Z',
  '2026-11-19T12:00:00.000Z',
]);
// al massimo 30 giorni indietro, e mai prima dell'inizio delle notizie
assert.equal(inizioLettura({ ...base, ultimaRiuscita: '2026-09-01T00:00:00Z' }).daQuando.toISOString(), '2026-10-21T12:00:00.000Z');
assert.equal(
  inizioLettura({ ...base, adesso: Date.parse('2026-10-20T12:00:00Z'), ultimaRiuscita: '2026-10-01T00:00:00Z' }).daQuando.toISOString(),
  inizio,
);
// con «Recupera»: la finestra più larga
const recuperaDal = mezzanotteRoma('2026-11-11');
assert.equal(inizioLettura({ ...base, ultimaRiuscita: '2026-11-20T09:00:00Z', recuperaDal }).daQuando.toISOString(), '2026-11-10T23:00:00.000Z');
assert.equal(inizioLettura({ ...base, ultimaRiuscita: '2026-11-11T22:07:16Z', recuperaDal: mezzanotteRoma('2026-11-19') }).daQuando.toISOString(), '2026-11-11T21:07:16.000Z');
assert.equal(inizioLettura({ ...base, recuperaDal: mezzanotteRoma('2026-01-01') }).daQuando.toISOString(), inizio);

// Quanti post chiedere
assert.equal(limitePost(new Date(adesso - GIORNO), adesso), 15);
assert.equal(limitePost(new Date(adesso - 3 * ORA), adesso), 15);
assert.equal(limitePost(new Date(Date.parse('2026-11-11T21:07:16Z')), adesso), 76);
assert.equal(limitePost(new Date(adesso - 30 * GIORNO), adesso), 247);
assert.equal(limitePost(new Date(adesso - 400 * GIORNO), adesso), 500);

// Credito di Apify
const ciclo = { startAt: '2026-11-12T00:00:00.000Z', endAt: '2026-12-11T23:59:59.999Z' };
const credito = (usati, massimo = 5) => ({ monthlyUsageCycle: ciclo, limits: { maxMonthlyUsageUsd: massimo }, current: { monthlyUsageUsd: usati } });
let r = avvisoCredito(credito(0.4), adesso);
assert.equal(r.riga, 'Credito di Apify: usati 0,40 $ su 5,00 $ questo mese, si rinnova il 12 dicembre.');
assert.equal(r.avviso, null);
// poco credito, ma al ritmo del mese basta fino al rinnovo: niente avviso
r = avvisoCredito(credito(4.1), Date.parse('2026-12-10T12:00:00Z'));
assert.equal(r.avviso, null);
// poco credito e non basta: avviso
r = avvisoCredito(credito(4.2), Date.parse('2026-12-01T12:00:00Z'));
assert.match(r.avviso, /^Le notizie del sito si aggiornano ancora, ma il credito di Apify sta finendo: restano 0,80 \$ dei 5,00 \$ del mese/);
assert.match(r.avviso, /bastano per circa 3 giorni\. Il credito si rinnova il 12 dicembre\./);
// credito finito
r = avvisoCredito(credito(5.3), Date.parse('2026-12-01T12:00:00Z'));
assert.match(r.avviso, /restano 0,00 \$ dei 5,00 \$ del mese, che non bastano neanche per un giorno\. Il credito/);
// risposte strane: nessun avviso
assert.equal(avvisoCredito({}, adesso).avviso, null);
assert.equal(avvisoCredito(credito(1, 0), adesso).avviso, null);
// senza le date del ciclo: avviso senza la data del rinnovo
r = avvisoCredito({ limits: { maxMonthlyUsageUsd: 5 }, current: { monthlyUsageUsd: 4.5 } }, adesso);
assert.equal(r.riga, 'Credito di Apify: usati 4,50 $ su 5,00 $ questo mese.');
assert.match(r.avviso, /restano 0,50 \$ dei 5,00 \$ del mese\. Quando finisce/);

console.log('controlli.mjs: tutte le prove sono andate bene.');
