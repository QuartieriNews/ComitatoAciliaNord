// Archivio de «La voce di Acilia Nord», il giornalino del comitato, dal numero più recente.
// pdf e copertina stanno in public/giornalino/. Per aggiungere un numero:
// PDF alleggerito come la-voce-di-acilia-nord-NN-mese-anno.pdf e copertina copertina-NN.webp.
// Il numero 3 non esiste: dopo il 2 è uscito il 4 per un errore di numerazione.

import { statSync } from 'node:fs';

export const nomeGiornalino = 'La voce di Acilia Nord';

export type Numero = {
  numero: number;
  uscita: string;
  titolo?: string;
  sommario?: string;
  pdf?: string;
  copertina?: string;
};

export const giornalino: Numero[] = [
  {
    numero: 8,
    uscita: 'giugno 2026',
    titolo: 'Il decoro del quartiere, il nostro impegno più grande',
    sommario:
      'Le pulizie con Retake e FTS, la stazione di Acilia, Piazza Capelvenere, il PRU Acilia-Dragona, gli 86 anni delle Casette Pater e il nuovo direttivo.',
    pdf: '/giornalino/la-voce-di-acilia-nord-08-giugno-2026.pdf',
    copertina: '/giornalino/copertina-08.webp',
  },
  {
    numero: 7,
    uscita: 'dicembre 2025',
    titolo: 'Assemblea pubblica: un nuovo patto per il quartiere',
    sommario:
      'Un anno di cura del quartiere, Piazza Capelvenere, il punto sugli «Articoli 11» del PRU, sicurezza e viabilità, bonifiche e centro di raccolta, e il Natale alla sede del comitato.',
    pdf: '/giornalino/la-voce-di-acilia-nord-07-dicembre-2025.pdf',
    copertina: '/giornalino/copertina-07.webp',
  },
  {
    numero: 6,
    uscita: 'luglio 2025',
    titolo: 'Storia, memoria e natura al Casale Raggio di Sole',
    sommario:
      "L'85° anniversario delle Casette Pater e l'omaggio a Michele Mattei, le pulizie dei volontari, la sede del comitato aperta ai cittadini, la sicurezza di via della Salvia e le novità su via di Sarteano, il Ponte delle Calle e Piazza Capelvenere.",
    pdf: '/giornalino/la-voce-di-acilia-nord-06-luglio-2025.pdf',
    copertina: '/giornalino/copertina-06.webp',
  },
  {
    numero: 5,
    uscita: 'aprile 2025',
    titolo: 'Alla scoperta della storia e della natura del nostro quartiere',
    sommario:
      'Gli 85 anni delle Casette Pater al Casale Raggio di Sole, il Carnevale alla stazione, nuovi alberi in via dei Monti di San Paolo e il ricordo di Lido Duranti.',
    pdf: '/giornalino/la-voce-di-acilia-nord-05-aprile-2025.pdf',
    copertina: '/giornalino/copertina-05.webp',
  },
  {
    numero: 4,
    uscita: 'febbraio 2025',
    titolo: 'Battaglie per le aree verdi, gestione dei rifiuti e nuovi progetti',
    sommario:
      'Le aree pubbliche rimaste nel «limbo», la pinetina, il Ponte delle Calle, i lavori su via Ostiense, la donazione di sangue e il Carnevale.',
    pdf: '/giornalino/la-voce-di-acilia-nord-04-febbraio-2025.pdf',
    copertina: '/giornalino/copertina-04.webp',
  },
  {
    numero: 2,
    uscita: 'settembre 2024',
    titolo: 'Degrado e pericoli nella pinetina dei Monti di San Paolo',
    sommario:
      "La pinetina, via Sarteano ancora chiusa, l'incontro con AMA sul decoro, la luce tornata in via di Monte Cugno e le lettere dei lettori.",
    pdf: '/giornalino/la-voce-di-acilia-nord-02-settembre-2024.pdf',
    copertina: '/giornalino/copertina-02.webp',
  },
  {
    numero: 1,
    uscita: 'luglio 2024',
    titolo: 'Migliora il servizio di raccolta dopo il reclamo del comitato',
    sommario:
      'I cassonetti degli abiti usati, il ponticello di via delle Calle, il car sharing alla stazione e la mostra sul Sentiero Pasolini.',
    pdf: '/giornalino/la-voce-di-acilia-nord-01-luglio-2024.pdf',
    copertina: '/giornalino/copertina-01.webp',
  },
];

// Peso del PDF in MB, per avvisare chi legge dal telefono.
// Viene letto dal file in public/ quando si costruisce il sito.
export function pesoPdf(pdf: string) {
  const byte = statSync(`public${pdf}`).size;
  return `${(byte / 1_000_000).toLocaleString('it-IT', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
}
