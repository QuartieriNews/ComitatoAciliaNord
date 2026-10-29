// Archivio de «La Voce di Acilia Nord», dal più recente.
// pdf: percorso del PDF in public/giornalino/ quando arriva.

export type Numero = {
  numero: number;
  uscita: string;
  titolo?: string;
  sommario?: string;
  pdf?: string;
};

export const giornalino: Numero[] = [
  {
    numero: 8,
    uscita: 'giugno 2026',
    titolo: 'Il decoro del quartiere, il nostro impegno più grande',
    sommario:
      'Le pulizie con Retake e FTS, la stazione di Acilia, Piazza Capelvenere, il PRU Acilia-Dragona, gli 86 anni delle Casette Pater e il nuovo direttivo.',
  },
  {
    numero: 7,
    uscita: 'dicembre 2025',
    titolo: 'Assemblea pubblica: un nuovo patto per il quartiere',
  },
  {
    numero: 6,
    uscita: 'luglio 2025',
  },
  {
    numero: 5,
    uscita: 'aprile 2025',
    titolo: 'Alla scoperta della storia e della natura del nostro quartiere',
    sommario:
      'Gli 85 anni delle Casette Pater al Casale Raggio di Sole, il Carnevale alla stazione, nuovi alberi in via dei Monti di San Paolo e il ricordo di Lido Duranti.',
  },
  {
    numero: 4,
    uscita: 'febbraio 2025',
    titolo: 'Battaglie per le aree verdi, rifiuti e nuovi progetti',
    sommario:
      'Le aree pubbliche rimaste nel «limbo», la pinetina, il Ponte delle Calle, i lavori su via Ostiense, la donazione di sangue e il Carnevale.',
  },
  {
    numero: 2,
    uscita: 'settembre 2024',
    titolo: 'Degrado e pericoli nella pinetina dei Monti di San Paolo',
    sommario:
      "La pinetina, via Sarteano ancora chiusa, l'incontro con AMA sul decoro, la luce tornata in via di Monte Cugno e le lettere dei lettori.",
  },
  {
    numero: 1,
    uscita: 'luglio 2024',
    titolo: 'Migliora la raccolta degli abiti usati dopo il reclamo del comitato',
    sommario:
      'I cassonetti degli abiti usati, il ponticello di via delle Calle, il car sharing alla stazione e la mostra sul Sentiero Pasolini.',
  },
];
