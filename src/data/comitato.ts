// Dati del comitato usati in tutto il sito. Fonte: documento "dati-comitato" del progetto.

export const comitato = {
  nome: 'Comitato di Quartiere Acilia Nord',
  nomeStatuto: 'Comitato Acilia Nord 2018',
  fondazione: '13 gennaio 2018',
  zone: 'Monti di San Paolo e Poggio di Acilia',
  email: 'info@comitatoacilianord.it',
  telefono: '340 263 0623',
  telefonoLink: '+393402630623',
  codiceFiscale: '97965840586',
  sede: {
    nome: 'La sede del comitato',
    indirizzo: 'Via dei Monti di San Paolo 40',
    citta: '00126 Roma',
    riferimento: "di fronte all'Ufficio Postale",
    // Link che apre Google Maps (sul telefono, l'app) con il segnaposto sulla sede
    mappa: 'https://www.google.com/maps/search/?api=1&query=Via%20dei%20Monti%20di%20San%20Paolo%2040%2C%2000126%20Roma',
    // Mappa di Google incorporata nella pagina Contatti
    mappaIncorporata: 'https://maps.google.com/maps?q=Via%20dei%20Monti%20di%20San%20Paolo%2040%2C%2000126%20Roma&z=17&hl=it&output=embed',
  },
  apertura: {
    giorno: 'martedì',
    orario: 'dalle 18:30 alle 20',
  },
  facebook: 'https://www.facebook.com/ComitatoAciliaNord/',
  whatsapp: {
    nome: 'Radio Acilia Nord',
    link: 'https://chat.whatsapp.com/5R1JSYp9uuXCKyXXPN45rc',
  },
  mappaQuartiere: 'https://www.openstreetmap.org/#map=15/41.7899/12.3570',
};

// L'indirizzo dentro una frase: «Ci trovi in via dei Monti di San Paolo 40, di fronte all'Ufficio Postale».
export const doveSiamo = `${comitato.sede.indirizzo.replace(/^Via /, 'via ')}, ${comitato.sede.riferimento}`;

export const direttivo = {
  eletto: "l'11 e il 12 aprile 2026",
  cariche: [
    { ruolo: 'Presidente', nome: 'Massimo Facchini' },
    { ruolo: 'Vicepresidente', nome: 'Roberto Casuccio' },
    { ruolo: 'Tesoriere', nome: 'Maurizio Ciottilli' },
    { ruolo: 'Segretaria', nome: 'Annie Illuzzi' },
  ],
  consiglieri: [
    'Riccardo Benvenuti',
    'Davide Ceccarini',
    'Vincenzo Fabbri',
    'Stefania Ferramola',
    'Stefano Gasbarro',
    'Fabio Gerlando',
    'Giada Nardacci',
    'Liliana Pozzi',
    'Fabiola Vicari',
  ],
};

export const donazioni = {
  iban: 'IT93 E020 0832 9740 0157 0990 909',
  beneficiario: 'Massimo Facchini',
  paypal: 'info@comitatoacilianord.it',
  whatsapp: '338 851 8023',
};

// I loghi arriveranno: per ora mostriamo i nomi.
export const sostenitori = [
  { nome: 'Rotostampa', link: 'https://rotostampa.com/' },
  { nome: 'Serra Madre', link: 'http://www.serramadre.it/' },
  { nome: 'Per dirsi ciao' },
  { nome: 'Adomar' },
  { nome: 'Todis' },
];

export const linkUtili = [
  { nome: 'Municipio Roma X – bandi e avvisi', link: 'https://www.comune.roma.it/web/it/bandi-e-concorsi.page?mun=municipio_x' },
  { nome: 'Retake Roma', link: 'https://www.retakeroma.org/' },
];
