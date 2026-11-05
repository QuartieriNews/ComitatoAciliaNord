// Dati del comitato usati in tutto il sito. Fonte: documento "dati-comitato" del progetto.

export const comitato = {
  // Denominazione da usare ovunque (unica eccezione: il centro dell'intestazione della home)
  nome: 'Comitato di Quartiere Acilia Nord 2018',
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
    // Link che apre Google Maps (sul telefono, l'app) sulla scheda della sede, «Comitato Acilia Nord 2018»
    mappa: 'https://www.google.com/maps/search/?api=1&query=Comitato%20Acilia%20Nord%202018&query_place_id=ChIJldMrdADzJRMRqeTSa2DEV0s',
    // Mappa di Google incorporata nella pagina Contatti: cercando il nome della scheda, il segnalino
    // cade sulla sede (con il nome), non sul numero civico
    mappaIncorporata:
      'https://maps.google.com/maps?q=Comitato%20Acilia%20Nord%202018%2C%20Via%20dei%20Monti%20di%20San%20Paolo%2040%2C%2000126%20Roma&z=18&hl=it&output=embed',
  },
  apertura: {
    giorno: 'martedì',
    orario: 'dalle 18 alle 19:30',
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

// Il direttivo. Ogni persona può avere una foto: file quadrato in public/direttivo/,
// per esempio foto: '/direttivo/massimo-facchini.webp'. Senza foto si vede la figura del logo.
export type Persona = { nome: string; ruolo?: string; foto?: string };

export const direttivo: { eletto: string; cariche: Persona[]; consiglieri: Persona[] } = {
  eletto: "l'11 e il 12 aprile 2026",
  cariche: [
    { ruolo: 'Presidente', nome: 'Massimo Facchini', foto: '/direttivo/massimo-facchini.webp' },
    { ruolo: 'Vicepresidente', nome: 'Roberto Casuccio', foto: '/direttivo/roberto-casuccio.webp' },
    { ruolo: 'Tesoriere', nome: 'Maurizio Ciottilli', foto: '/direttivo/maurizio-ciottilli.webp' },
    { ruolo: 'Segretaria', nome: 'Annie Illuzzi', foto: '/direttivo/annie-illuzzi.webp' },
  ],
  // Consiglieri in ordine alfabetico per nome; in fondo Fabio e Vincenzo, che non hanno ancora la foto.
  consiglieri: [
    { nome: 'Davide Ceccarini', foto: '/direttivo/davide-ceccarini.webp' },
    { nome: 'Fabiola Vicari', foto: '/direttivo/fabiola-vicari.webp' },
    { nome: 'Giada Nardacci', foto: '/direttivo/giada-nardacci.webp' },
    { nome: 'Liliana Pozzi', foto: '/direttivo/liliana-pozzi.webp' },
    { nome: 'Riccardo Benvenuti', foto: '/direttivo/riccardo-benvenuti.webp' },
    { nome: 'Stefania Ferramola', foto: '/direttivo/stefania-ferramola.webp' },
    { nome: 'Stefano Gasbarro', foto: '/direttivo/stefano-gasbarro.webp' },
    { nome: 'Fabio Gerlando' },
    { nome: 'Vincenzo Fabbri' },
  ],
};

// Donazioni: per ora solo bonifico (o di persona agli eventi). PayPal tolto su richiesta di Riccardo
// il 5 novembre 2026, perché il comitato non lo usa: non rimetterlo dai testi del vecchio sito.
export const donazioni = {
  iban: 'IT93 E020 0832 9740 0157 0990 909',
  beneficiario: 'Massimo Facchini',
  whatsapp: '338 851 8023',
};

// Chi sostiene il comitato: logo in public/sostenitori/ e sito, quando c'è.
export const sostenitori: { nome: string; logo: string; link?: string }[] = [
  { nome: 'Rotostampa', logo: '/sostenitori/rotostampa.webp', link: 'https://rotostampa.com/' },
  { nome: 'Todis', logo: '/sostenitori/todis.webp' },
  { nome: 'Per dirsi ciao', logo: '/sostenitori/per-dirsi-ciao.webp' },
  { nome: 'Serra Madre', logo: '/sostenitori/serra-madre.webp', link: 'http://www.serramadre.it/' },
];

export const linkUtili = [
  { nome: 'Municipio Roma X – bandi e avvisi', link: 'https://www.comune.roma.it/web/it/bandi-e-concorsi.page?mun=municipio_x' },
  { nome: 'Retake Roma', link: 'https://www.retakeroma.org/' },
];
