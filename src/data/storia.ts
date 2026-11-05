// «La nostra storia» (/storia/): il racconto del quartiere in otto capitoli, uno per epoca.
// Testo approvato dal comitato il 5 novembre 2026 (Claude Doc «La storia del quartiere ·
// testo e struttura della pagina»). Fatti, date e fonti: documento «storia-quartiere» del progetto.
//
// Ogni capitolo ha un colore dell'arcobaleno del logo:
// - vivo: il colore pieno, per righe, punti e bordi;
// - scuro: la versione scura, per titoli e testi su fondo bianco o chiaro (contrasto almeno 5:1);
// - chiaro: la tinta leggera dei riquadri;
// - fondo e suFondo: il bottone acceso nella linea del tempo e il bollino del capitolo.
//
// Le foto sono in public/storia/ in due larghezze (800 e 1600 pixel; le più piccole in una sola).
// Le didascalie riprendono quelle originali della mostra.

export type FotoStoria = {
  nome: string; // file public/storia/<nome>-<larghezza>.webp
  larghezze: number[]; // larghezze disponibili, dalla più piccola
  w: number; // misure della più piccola
  h: number;
  didascalia: string;
  alt: string;
};

export type Capitolo = {
  id: string;
  numero: number;
  periodo: string;
  anno: string; // etichetta breve nella linea del tempo
  breve: string; // titolo breve nella linea del tempo
  titolo: string;
  vivo: string;
  scuro: string;
  chiaro: string;
  fondo: string;
  suFondo: string;
  inBreve: string;
  paragrafi: string[];
  dove: string;
  sapevi: string;
  foto: FotoStoria[];
};

const foto = (
  nome: string,
  larghezze: number[],
  w: number,
  h: number,
  didascalia: string,
  alt: string,
): FotoStoria => ({ nome, larghezze, w, h, didascalia, alt });

export const apertura = {
  titolo: 'La nostra storia',
  sottotitolo:
    'Da Ficana alle Casette Pater, da Lido Duranti al Sentiero Pasolini: il quartiere raccontato da chi ci vive.',
  paragrafi: [
    "Conoscere la storia del luogo in cui viviamo aiuta a sentirlo più nostro. Per questo, dal 2018, noi del comitato raccogliamo fotografie, documenti e ricordi delle famiglie di Acilia Nord. Sono diventati una mostra, che abbiamo portato in piazza Capelvenere, al Casale Raggio di Sole, lungo il Tevere e nella nostra sede.",
    "Questa pagina mette in fila quei ricordi, dal Monte Cugno dell'antica Ficana fino a oggi. È la storia di un pezzo di campagna romana diventato quartiere. Ci sono le Casette Pater e le famiglie che ci vennero a vivere, piazza Capelvenere, la stazione con il trenino. C'è un ragazzo del quartiere ucciso alle Fosse Ardeatine. E ci sono il fiume e i campi che ci stanno intorno.",
    "È una storia fatta di persone, e non è finita. Se avete una foto in un cassetto o un ricordo da raccontare, passate in sede il martedì: la storia di Acilia Nord la scriviamo insieme.",
  ],
};

export const capitoli: Capitolo[] = [
  {
    id: 'ficana',
    numero: 1,
    periodo: 'antichità',
    anno: 'antichità',
    breve: 'Ficana',
    titolo: 'Ficana e il Tevere',
    vivo: '#ef1828',
    scuro: '#cd0e1c',
    chiaro: '#feeced',
    fondo: '#cd0e1c',
    suFondo: '#ffffff',
    inBreve:
      'Più di tremila anni fa, sul Monte Cugno che guarda il Tevere, nacque Ficana: prima un villaggio, poi una città dei Latini con il suo porto sul fiume.',
    paragrafi: [
      "Dietro casa nostra, oltre i campi, c'è una collina che guarda il Tevere: il Monte Cugno. Lì, tra l'XI e il X secolo avanti Cristo, alla fine dell'età del bronzo, nacque un villaggio. Nei secoli diventò Ficana, una città dei Latini.",
      "Nell'VIII secolo a.C. Ficana si difendeva con un terrapieno. Alla fine del VII occupava una decina di ettari: accanto alle capanne sorgevano le prime case con le fondamenta di tufo e il tetto di tegole. Aveva un approdo sul Tevere, a poca distanza dalla foce, dove c'erano le saline.",
      "Gli antichi la collocavano «all'undicesimo miglio» della via Ostiense, circa sedici chilometri da Roma. Secondo la tradizione, nella seconda metà del VII secolo il re di Roma Anco Marzio la conquistò e ne portò gli abitanti a Roma. Poco dopo, sempre secondo la tradizione, fondò Ostia alla foce del fiume.",
      'Gli scavi però raccontano che Ficana non finì lì: nel VI secolo crebbe ancora, e alla fine del IV ebbe mura di tufo. Solo nel III secolo a.C. tornò campagna. Lo sappiamo grazie agli scavi cominciati nel 1975 dalla Soprintendenza di Ostia con gli istituti di Danimarca, Svezia, Norvegia e Finlandia a Roma.',
      "Sul pianoro è tornata alla luce la casa di una famiglia aristocratica, forse la dimora di un capo, con i resti di un banchetto del VII secolo. E la necropoli, la città dei morti, era qui, ai Monti di San Paolo: una quarantina di tombe. In una, la numero 21, riposava un guerriero con lancia, spada, spiedi di ferro e ventotto vasi.",
      "Chi ci ha fatto innamorare di Ficana, le nostre origini latine, è stato Michele Mattei, archeologo e divulgatore, nostro carissimo amico. L'ha raccontata nelle scuole di Acilia, nelle nostre passeggiate e nei suoi libri: il romanzo «Ficana. L'ultimo banchetto» e il fumetto «Ficana. L'alba dei latini». Michele ci ha lasciati alla fine del 2024, e continuiamo a camminare sulle sue orme.",
    ],
    dove: "Il Monte Cugno si vede bene dagli argini del Tevere, lungo il Sentiero Pasolini. L'antica Ficana è uno dei luoghi della Riserva Naturale Statale del Litorale Romano.",
    sapevi:
      'Secondo la tradizione il nome Acilia viene dalla famiglia romana degli Acilii, che qui aveva delle terre. Ed era già in uso nel Medioevo: un documento del 1300 parla dei «prati di Acilia».',
    foto: [
      foto(
        'ficana-casa-principesca',
        [800, 1600],
        800,
        665,
        'Gli scavi della casa di una famiglia principesca di Ficana, sul pianoro (seconda metà del VII – VI secolo a.C.).',
        'Foto in bianco e nero degli scavi: le fondamenta di una grande casa rettangolare nel terreno scavato.',
      ),
      foto(
        'ficana-anfora-tomba-21',
        [800, 1600],
        800,
        1067,
        'Anfora laziale di impasto bruno dalla necropoli, tomba 21 (625–600 a.C.).',
        "Un'anfora di terracotta bruna con due anse alte e sottili.",
      ),
      foto(
        'ficana-vasi-capanne',
        [800],
        800,
        440,
        'Vasi trovati nella zona delle capanne (VII secolo a.C.).',
        'Tre vasi antichi di terracotta: una ciotola chiara, una brocca e una tazza scura con due anse.',
      ),
    ],
  },
  {
    id: 'bonifica',
    numero: 2,
    periodo: 'dal Medioevo al primo Novecento',
    anno: '1884',
    breve: 'La bonifica',
    titolo: 'Campagna, palude e bonifica',
    vivo: '#ff8e18',
    scuro: '#9f5100',
    chiaro: '#fff4e8',
    fondo: '#ff8e18',
    suFondo: '#1f2a24',
    inBreve:
      'Per secoli qui ci furono pascoli, grano e malaria. Poi, nel novembre del 1884, arrivarono da Ravenna i braccianti che prosciugarono lo stagno di Ostia.',
    paragrafi: [
      "Finita l'epoca di Ficana, per secoli queste colline furono campagna romana: pascoli, campi di grano, qualche casale isolato. Verso il mare c'era lo stagno di Ostia, una palude dove la malaria rendeva la vita durissima.",
      "Le terre avevano padroni lontani. Secondo lo storico Piero Labbadia, dal Medioevo i monaci della basilica di San Paolo fuori le Mura avevano qui una grande tenuta: per questo si parlava dei «Monti e Prati di San Paolo». Poi le terre passarono alla famiglia Altieri e, alla fine dell'Ottocento, agli Ascoli.",
      'Il 24 novembre 1884 partì da Ravenna un treno di braccianti riuniti in cooperativa. La sera dopo erano a Fiumicino: venivano a bonificare lo stagno di Ostia. Erano alcune centinaia, con le loro «azdore», le donne che cucinavano per tutti.',
      'Lavorarono con pale e carriole, nel fango e tra le zanzare. Negli anni della bonifica la malaria uccise centinaia di braccianti. Con la loro fatica la palude diventò terra da coltivare. Molti romagnoli restarono, e altri ne arrivarono: nel Borgo Acilio, come racconta il prossimo capitolo, vennero a vivere 48 famiglie romagnole. Viene da pensare a loro ogni volta che si percorre via dei Romagnoli.',
      "Ai Monti di San Paolo, intanto, sorgevano le case coloniche dell'Agro romano. Una di queste, restaurata dal Comune, nel 2014 è rinata come Casale Raggio di Sole: un centro diurno per ragazzi con disabilità, dove ci ritroviamo anche per le nostre assemblee.",
    ],
    dove: 'Il Casale Raggio di Sole, in via di Monte Cugno 10. E nella Riserva del Litorale Romano il «paesaggio della bonifica» è uno dei luoghi segnalati.',
    sapevi:
      "In romagnolo l'«azdora» è la donna che regge la casa. Le azdore partirono con i braccianti e ne divisero la fatica, giorno per giorno.",
    foto: [
      foto(
        'casa-colonica-anni-50',
        [800, 1600],
        800,
        535,
        'Una casa colonica in via dei Monti di San Paolo, negli anni Cinquanta.',
        'Foto in bianco e nero di una piccola casa colonica tra i pini, con il terrazzo sul tetto.',
      ),
      foto(
        'casa-colonica-anni-20-30',
        [800, 1600],
        800,
        562,
        "Una casa colonica dell'Agro romano degli anni Venti–Trenta, su via dei Monti di San Paolo.",
        'Una casa colonica a due piani dietro una recinzione, in una foto recente.',
      ),
      foto(
        'casale-raggio-di-sole',
        [800, 1600],
        800,
        529,
        'La casa colonica restaurata che oggi è il Casale Raggio di Sole.',
        'Un edificio chiaro a due piani tra i pini, con un prato e un vialetto davanti.',
      ),
    ],
  },
  {
    id: 'borgo-acilio',
    numero: 3,
    periodo: '1914–1930',
    anno: '1915',
    breve: 'Il Borgo Acilio',
    titolo: 'Il treno, la via del Mare e il Borgo Acilio',
    vivo: '#f5d90a',
    scuro: '#736605',
    chiaro: '#fefbe6',
    fondo: '#f5d90a',
    suFondo: '#1f2a24',
    inBreve:
      "All'inizio del Novecento Roma decide di arrivare fino al mare: lungo la via Ostiense nascono il Borgo Acilio, la ferrovia per Ostia e la via del Mare.",
    paragrafi: [
      "L'ingegnere Paolo Orlando sognava una Roma affacciata sul mare. Fu assessore all'Agro romano dal 1914 al 1919, poi presidente dell'ente per lo sviluppo marittimo e industriale di Roma fino al 1923. Spinse perché la campagna tra la città e Ostia venisse bonificata, abitata e collegata.",
      "Tra il 1915 e il 1918, sulla via Ostiense, il Comune di Roma costruì il Borgo Acilio: dodici case coloniche a due piani, ognuna con quattro appartamenti. Ci vennero a vivere 48 famiglie di braccianti e mezzadri di origine romagnola. La vita era dura: mancava l'acqua per irrigare e i poderi erano troppo piccoli.",
      "Dal 1919 il borgo passò all'ente di Orlando, che ci sistemò anche i ferrovieri della nuova linea per Ostia. Intorno, su tre lati, c'era la grande tenuta dei Monti di San Paolo: lo stesso nome che oggi portano la nostra via principale e il nostro quartiere.",
      'Il 10 agosto 1924 fu inaugurata la ferrovia Roma–Lido, e Acilia ebbe la sua stazione. Nel 1928 arrivò la via del Mare, la strada veloce per Ostia che ancora oggi attraversa Acilia. Gli abitanti di Acilia crescevano in fretta: 178 nel 1921, 735 nel 1926, circa tremila nel 1935.',
      'Una targa di marmo del 6 aprile 1930 ricorda Orlando come colui che «edificò il Borgo Acilio e lo collegò per ferrovia alla città e al mare». La volle la società «Sua Cuique Domus»: secondo la targa, nel 1928 aveva allargato il borgo con un quartiere nuovo.',
    ],
    dove: 'La stazione di Acilia, sulla linea Roma–Lido che dal 2022 si chiama Metromare, e la via del Mare.',
    sapevi:
      '«Sua cuique domus» è latino e vuol dire «a ciascuno la sua casa». E il nostro trenino ha compiuto cento anni il 10 agosto 2024.',
    foto: [
      foto(
        'stazione-acilia',
        [800, 1600],
        800,
        566,
        'La stazione di Acilia, sulla ferrovia Roma–Lido.',
        "Foto in bianco e nero del cartello «Acilia» alla stazione, all'ombra di un grande pino.",
      ),
      foto(
        'paolo-orlando',
        [567],
        567,
        782,
        'Paolo Orlando, che «edificò il borgo Acilio e avvicinò Roma al mare».',
        'Ritratto inciso di un uomo anziano con la barba bianca e la giacca scura.',
      ),
      foto(
        'targa-paolo-orlando-1930',
        [800, 1600],
        800,
        540,
        'La targa di marmo del 6 aprile 1930 in ricordo di Paolo Orlando.',
        "Una targa di marmo con una lunga iscrizione in maiuscolo, su un muro bianco.",
      ),
    ],
  },
  {
    id: 'casette-pater',
    numero: 4,
    periodo: '1940',
    anno: '1940',
    breve: 'Le Casette Pater',
    titolo: 'Le Casette Pater',
    vivo: '#26aa3c',
    scuro: '#1a762a',
    chiaro: '#ebf7ed',
    fondo: '#1a762a',
    suFondo: '#ffffff',
    inBreve:
      'Nella primavera del 1940 nacque il villaggio delle Casette Pater, per le famiglie numerose: è il cuore da cui è cresciuto il nostro quartiere.',
    paragrafi: [
      "Nel novembre del 1939 il Governatorato di Roma affidò alla ditta Pater la costruzione di un villaggio dall'altra parte della via Ostiense, di fronte al vecchio Borgo Acilio. Le case presero il nome del loro inventore, l'ingegnere Dario Pater. Erano «case rapide», con le pareti di pannelli di trucioli di legno e calce: in paese le chiamavano «case di cartone».",
      'Erano 250 casette a un piano, ognuna con un orto di circa mille metri quadrati. Il regime le destinò alle famiglie numerose, come premio della sua campagna per le nascite. Nel settembre 1940 ci vivevano 195 famiglie, quasi duemila persone: quasi tre famiglie su quattro avevano tra i nove e gli undici componenti.',
      "Venivano da Roma e dal Lazio, ma anche dalla Puglia, dall'Abruzzo, dalle Marche, dalla Campania e dalla Sicilia. E dalla Toscana, come la famiglia di Lido Duranti.",
      'Mussolini inaugurò il villaggio nel pomeriggio del 20 aprile 1940, alla vigilia del Natale di Roma: visitò la chiesa appena costruita ed entrò in una delle casette. La propaganda lo chiamò «la borgata delle famiglie numerose» e scelse come data ufficiale il 21 aprile. Per questo il 21 aprile è rimasto il compleanno delle Casette Pater.',
      'La prima chiesa del villaggio era la cappella della Sacra Famiglia, in piazza Capelvenere: nel 1940 vi si celebrò il primo battesimo. A maggio era nato il primo bambino del villaggio.',
      "La vita era semplice e faticosa. L'acqua mancava spesso, e le fognature nuove furono approvate solo nel 1950. Alle finestre si misero le zanzariere, perché qui la malaria era di casa. Ma gli orti erano curati con amore, aiutati dai duemila alberi da frutto distribuiti dal Governatorato nel 1941.",
      "Per andare a Roma c'era il trenino fino a Porta San Paolo, mezz'ora di viaggio; qualche papà ci andava in bicicletta. Chi ci è cresciuto, intervistato molti anni dopo, ricordava una vita all'aperto in cui «non mancava niente».",
    ],
    dove: "Qualche Casetta Pater c'è ancora tra le nostre vie. Nel 2012 se ne contavano in via delle Case Basse, via della Salvia, via della Verbena e via Leonardi.",
    sapevi:
      "Nel 1945, caduto il fascismo, le strade del villaggio dedicate ai «martiri» del regime presero i nomi delle piante. Largo Manfredi Trombetta diventò largo del Capelvenere, una piccola felce che ama l'acqua; via Mario Catena diventò via della Salvia, via Carlo Grella via della Verbena.",
    foto: [
      foto(
        'borgata-dall-alto-anni-40',
        [800],
        800,
        536,
        "La borgata vista dall'alto negli anni Quaranta.",
        'Foto aerea in bianco e nero: file ordinate di casette tra i campi, accanto alla ferrovia e alla strada.',
      ),
      foto(
        'famiglie-inaugurazione-1940',
        [800, 1600],
        800,
        510,
        "Le mamme e le famiglie il giorno dell'inaugurazione, nell'aprile del 1940.",
        'Foto in bianco e nero: una folla di donne e bambini stretti intorno ad alcuni uomini in divisa.',
      ),
      foto(
        'chiesa-sacra-famiglia-1940',
        [800],
        800,
        598,
        "La chiesa della Sacra Famiglia nel 1940, dove oggi c'è piazza Capelvenere.",
        'Foto in bianco e nero di una piccola chiesa con il campanile e un portico laterale.',
      ),
      foto(
        'pianta-borgata-pater',
        [800],
        800,
        501,
        'La pianta della «Borgata Pater in Acilia».',
        'Un disegno tecnico: file di piccoli rettangoli, le casette, lungo le strade del villaggio.',
      ),
    ],
  },
  {
    id: 'lido-duranti',
    numero: 5,
    periodo: '1943–1944',
    anno: '1944',
    breve: 'Lido Duranti',
    titolo: 'La guerra e Lido Duranti',
    vivo: '#27afed',
    scuro: '#0d6d9a',
    chiaro: '#eaf6fc',
    fondo: '#27afed',
    suFondo: '#1f2a24',
    inBreve:
      'Lido Duranti viveva in una Casetta Pater. Partigiano a 24 anni, fu arrestato dalle SS e ucciso alle Fosse Ardeatine il 24 marzo 1944.',
    paragrafi: [
      'Lido Duranti era nato il 7 aprile 1919 a Orentano, una frazione di Castelfranco di Sotto, in provincia di Pisa. Era figlio di Iacopo e di Amelia Sevieri. La famiglia arrivò a Roma nel 1936 e nel 1940 prese casa ad Acilia, nella Casetta Pater numero 361.',
      "Prima della guerra Lido faceva il pasticciere. Prestò servizio militare in Africa, poi lavorò come operaio alla Pirelli. Dopo l'8 settembre 1943, con Roma occupata dai nazisti, entrò nella Resistenza. Il suo attestato di partigiano combattente, esposto nella nostra mostra, va dal 10 settembre 1943 al 24 marzo 1944.",
      "La guerra entrò anche nel villaggio. Il 4 febbraio 1944 i tedeschi ordinarono di sgomberare le casette in ventiquattr'ore, e le famiglie dovettero andarsene. Quando tornarono, molte case erano danneggiate.",
      "Secondo le fonti locali, Lido guidava con il fratello Nello la banda partigiana di Acilia: settantacinque persone, quasi tutte di Acilia. Il 27 febbraio 1944 fu arrestato dalle SS e rinchiuso a Regina Coeli. La famiglia racconta che, al momento dell'arresto, riuscì a ingoiare la lista dei suoi compagni per non tradirli.",
      'Il 23 marzo, in via Rasella, i partigiani attaccarono un reparto di polizia tedesco. Il giorno dopo, per rappresaglia, i nazisti uccisero 335 persone alle Fosse Ardeatine. Tra loro c\'era Lido: aveva 24 anni, e il 7 aprile ne avrebbe compiuti 25. Il 4 giugno 1944 gli Alleati entrarono a Roma.',
      "Lido riposa nel Mausoleo delle Fosse Ardeatine. In piazza Capelvenere c'è la lapide posta dalla comunità dell'allora XIII Municipio, che lo ricorda come medaglia d'argento al valor militare. Dal gennaio 2024, davanti alla casa dove viveva, c'è anche una pietra d'inciampo: la prima del Municipio X.",
      "Il 24 marzo 2025, in piazza Capelvenere, cittadini e istituzioni lo hanno ricordato con una cerimonia promossa dal Municipio X, deponendo una corona d'alloro sotto la lapide. Ricordare Lido significa difendere i valori per cui ha dato la vita: libertà, giustizia, democrazia.",
    ],
    dove: "La lapide in piazza Capelvenere. La pietra d'inciampo in via Giampietro Ferrari 46. Il suo volto nel murale accanto alla stazione di Lido Nord, dipinto nel 2019.",
    sapevi:
      "Anche il paese dove era nato non lo ha dimenticato: a Orentano c'è una via che porta il suo nome.",
    foto: [
      foto(
        'pietra-inciampo-lido-duranti',
        [714],
        714,
        714,
        "La pietra d'inciampo davanti alla casa dove viveva Lido, posata nel gennaio 2024.",
        "Una piccola targa d'ottone nel selciato: «Qui abitava Lido Duranti, nato 1919, arrestato 27.2.1944, assassinato 24.3.1944, Fosse Ardeatine».",
      ),
      foto(
        'lapide-lido-duranti-municipio',
        [398],
        398,
        283,
        'La lapide della comunità del XIII Municipio in piazza Capelvenere.',
        "Una lapide di marmo: «Lido Duranti, martire dell'eccidio delle Fosse Ardeatine, medaglia d'argento al valor militare».",
      ),
      foto(
        'attestato-lido-duranti',
        [635],
        635,
        576,
        "L'attestato di partigiano combattente di Lido Duranti: dal 10 settembre 1943 al 24 marzo 1944.",
        'Un vecchio modulo scritto a macchina: «Partigiano combattente caduto», con i dati di Lido Duranti.',
      ),
      foto(
        'murale-lido-duranti',
        [720],
        720,
        576,
        'Il volto di Lido nel murale accanto alla stazione di Lido Nord, dipinto nel 2019.',
        'Un murale a linee nere su fondo bianco: il volto di un giovane con i baffi, dietro una ringhiera blu.',
      ),
    ],
  },
  {
    id: 'borgata',
    numero: 6,
    periodo: 'anni Quaranta–Sessanta',
    anno: 'anni ’50',
    breve: 'La borgata',
    titolo: 'La vita di borgata',
    vivo: '#2d6fb7',
    scuro: '#2a68ab',
    chiaro: '#ecf2f9',
    fondo: '#2a68ab',
    suFondo: '#ffffff',
    inBreve:
      'Gli orti delle casette, il bar in piazza, il trenino per Roma: negli anni Cinquanta Acilia Nord era quasi un paese, dove tutti si conoscevano.',
    paragrafi: [
      'Finita la guerra, la vita ripartì. Le foto che le famiglie ci hanno prestato per la mostra raccontano una borgata piccola e piena di vita: gli orti delle Casette Pater, i matrimoni, i bambini in braccio, le amiche in posa per la strada.',
      "Il cuore era piazza Capelvenere. Negli anni Cinquanta c'era il bar di Salvatore Giuffrida, che tutti chiamavano Turiddu; nel 1954 Salvatore sposò Maria Brilli. In via dei Monti di San Paolo, all'angolo con via della Salvia, c'era un altro bar, con gli avventori seduti davanti.",
      "Poco più in là c'era la fontana di via della Salvia, all'angolo con via della Verbena. Quando alla fine degli anni Cinquanta fu sistemata, gli abitanti si misero in posa davanti per una foto ricordo.",
      "Intorno c'era ancora campagna, con i contadini dei Monti di San Paolo e le loro case coloniche. In via dei Monti di San Paolo c'erano la casa delle suore francescane e, negli anni Sessanta, l'asilo delle suore. Gli ex combattenti avevano la loro associazione, fotografata alla fine degli anni Cinquanta.",
      "Per andare a Roma o al mare c'era il trenino della Roma–Lido: nella mostra c'è un biglietto di terza classe degli anni Cinquanta. Davanti alla stazione partivano gli autobus che, lungo via dei Romagnoli, portavano a Ostia. Un ponte univa Acilia Nord e Acilia Sud, tra via Ostiense e via dei Romagnoli.",
      "Erano gli anni della Vespa e della moto con il sidecar. Nelle foto c'è la famiglia Morresi in sidecar, c'è Elena Lupi con la figlia e il fratello, ci sono Giulia Viola e Silvana Francucci con le amiche, nel 1953.",
    ],
    dove: 'La stazione di Acilia. E le vie delle foto: via Lorenzo Nerucci, via delle Alghe, via delle Case Basse, via della Salvia, via della Verbena. Provate a riconoscere gli angoli di allora.',
    sapevi:
      "L'attore e scrittore Marco Baliani ha passato la sua infanzia ad Acilia e l'ha raccontata nel romanzo «Nel regno di Acilia» (2004). Lui stesso ha detto che nel libro è quasi tutto vero.",
    foto: [
      foto(
        'fontana-via-della-salvia',
        [800],
        800,
        527,
        "Gli abitanti dei Monti di San Paolo in posa dopo la sistemazione della fontana di via della Salvia, all'angolo con via della Verbena (anni Cinquanta).",
        'Foto in bianco e nero: un gruppo di uomini e un bambino in posa davanti a una fontana di pietra.',
      ),
      foto(
        'ponte-acilia-anni-50',
        [800, 1600],
        800,
        564,
        'Il ponte tra Acilia Sud e Acilia Nord, tra via Ostiense e via dei Romagnoli, negli anni Cinquanta.',
        "Foto in bianco e nero dall'alto: una strada che sale su un ponte in curva, con case basse e campagna intorno.",
      ),
      foto(
        'stazione-autobus',
        [800, 1600],
        800,
        527,
        'La stazione di Acilia, con un autobus fermo davanti.',
        'Foto in bianco e nero di un edificio a due piani tra gli alberi, con un vecchio autobus parcheggiato davanti.',
      ),
    ],
  },
  {
    id: 'il-quartiere-cresce',
    numero: 7,
    periodo: 'anni Settanta–Novanta',
    anno: 'anni ’70',
    breve: 'Il quartiere cresce',
    titolo: 'Il quartiere cresce',
    vivo: '#9246b9',
    scuro: '#8e44b3',
    chiaro: '#f5eef9',
    fondo: '#8e44b3',
    suFondo: '#ffffff',
    inBreve:
      'Le casette diventano villini e palazzine, piazza Capelvenere si riempie di negozi, arrivano la Riserva e una piazza nuova: il quartiere cambia faccia.',
    paragrafi: [
      "Dal 1954 chi abitava nelle Casette Pater poté comprare casa e terreno. Molte casette, costruite per durare una decina d'anni, lasciarono il posto a villini e piccole palazzine. Intanto cresceva tutta Acilia, spesso senza un piano: nel 1950 il Villaggio San Francesco, negli anni Sessanta le case INA-Casa di Casal Bernocchi.",
      "Negli anni Settanta piazza Capelvenere era un centro commerciale all'aperto, vivace e frequentato: il chiosco degli alimentari, i negozi, la sede dell'associazione delle Casette Pater. In via dei Monti di San Paolo aprivano le prime attività, come quella della famiglia Macellari.",
      'Le foto della mostra ricordano anche un personaggio speciale: Attilio Serino, sacrestano, fotografo, ebanista e filosofo. Negli anni Settanta viveva in una casa tutta sua, ricavata da quello che restava della vecchia chiesa della Sacra Famiglia.',
      'Nel 1978 nacque la parrocchia di San Maurizio Martire, al Poggio di Acilia. Giovanni Paolo II la visitò il 17 marzo 1991; la chiesa a forma di piramide che conosciamo oggi è del 2000–2001.',
      "Tra il quartiere e il Tevere ci sono i campi della tenuta Ascoli, dove la famiglia Ascoli Roman coltiva grano, colza, soia e granturco. È una famiglia con una grande storia di sport: nel 1980, alle Olimpiadi di Mosca, Federico Roman, marito di Antonella Ascoli, vinse l'oro nel concorso completo di equitazione, in sella a Rossinan. Anche i loro figli Luca e Pietro hanno gareggiato alle Olimpiadi, a Rio nel 2016.",
      'Il 6 gennaio 1985, giorno della Befana, Roma si svegliò sotto la neve: anche via dei Monti di San Paolo diventò tutta bianca.',
      "Nel 1996 nacque la Riserva Naturale Statale del Litorale Romano: circa sedicimila ettari tra Roma e Fiumicino. Dentro ci sono il Tevere e i prati di Monte San Paolo e Monte Cugno, con l'antica Ficana. Le nostre case arrivano fino al suo confine. Nel maggio 2026 la Riserva ha compiuto trent'anni.",
      'Alla fine degli anni Novanta fu demolita la vecchia piazza Capelvenere, con le sue case basse. Al suo posto nacque la piazza di oggi, con gli uffici del Municipio, la Torretta con una piccola sala e la fontana con la lapide a Lido Duranti.',
      'Dagli anni Novanta, infine, il quartiere aspetta che si completi il Programma di recupero urbano Acilia–Dragona, che deve portare strade, servizi e parchi. Molte opere sono ancora ferme: è una delle battaglie del nostro comitato.',
    ],
    dove: 'Piazza Capelvenere, con la Torretta e la fontana. La chiesa a piramide di San Maurizio Martire, in via del Poggio di Acilia 110. I campi della Riserva, lungo il Sentiero Pasolini.',
    sapevi:
      'La nuova piazza Capelvenere è stata il primo progetto di «Centopiazze», il programma del Comune di Roma per rinnovare le piazze dei quartieri di periferia.',
    foto: [
      foto(
        'piazza-capelvenere-anni-70',
        [800, 1600],
        800,
        533,
        'Piazza Capelvenere vista da via dei Monti di San Paolo, negli anni Settanta.',
        'Foto in bianco e nero della vecchia piazza: case basse con un grande arco, baracche e la strada in primo piano.',
      ),
      foto(
        'chiosco-anni-70',
        [800],
        800,
        534,
        'Il chiosco degli alimentari negli anni Settanta.',
        'Foto in bianco e nero di un chiosco basso con la tettoia, tra alberi spogli.',
      ),
      foto(
        'neve-1985',
        [800],
        800,
        560,
        'Via dei Monti di San Paolo sotto la nevicata del 1985.',
        'Foto in bianco e nero: un gruppo di ragazzi in posa sulla neve, con le case sullo sfondo.',
      ),
    ],
  },
  {
    id: 'oggi',
    numero: 8,
    periodo: 'dal 2000 a oggi',
    anno: 'oggi',
    breve: 'Il nostro tempo',
    titolo: 'Il nostro tempo',
    vivo: '#f0008e',
    scuro: '#c50074',
    chiaro: '#fdeaf5',
    fondo: '#c50074',
    suFondo: '#ffffff',
    inBreve:
      'Nel gennaio 2018 un gruppo di vicini di casa ha deciso di prendersi cura del quartiere: è nato il nostro comitato, mentre sul Tevere rinasceva il Sentiero Pasolini.',
    paragrafi: [
      "Nel dicembre 2017 alcuni volontari hanno cominciato a liberare dai rovi un vecchio sentiero sull'argine sinistro del Tevere, tra Centro Giano e Acilia Nord. C'erano Sven Otto Scheen, «il norvegese», con Sandro, Emanuele e Stefano. Gli abitanti dei due quartieri li hanno raggiunti, e da lì è partito tutto.",
      "Il 13 gennaio 2018 è nato il nostro comitato, dall'incontro di volontari nati e cresciuti nel quartiere. Quello stesso giorno, al Casale Raggio di Sole, si parlava già del sentiero. Nei mesi successivi lo abbiamo presentato al Municipio X e, con i volontari, abbiamo messo la bacheca, la scaletta per scendere al fiume e la prima panchina sul Tevere, quella «di San Nicola».",
      "Ad aprile c'è stata la prima pedalata alla scoperta del sentiero, per il compleanno delle Casette Pater; a giugno la prima «Critical Mass Pasolini». Oggi il sentiero si percorre per circa diciassette chilometri, da Centro Giano a Ostia Antica. Per arrivare fino al mare servono ancora passerelle e permessi: il progetto è nel piano della mobilità di Roma.",
      "Il 26 maggio 2018 sul nostro fiume è passata la barca di San Nicola. Era il «Cammino sull'acqua» della Via Nicolaiana, il percorso europeo che parte da Bari ed è dedicato al santo. Alle tre e mezza del pomeriggio ha fatto l'unica sosta del suo viaggio sul Tevere proprio qui, all'approdo allestito a Monte Cugno.",
      "Ad aspettarla, dopo una camminata dalla chiesa di San Maurizio Martire, c'erano più di duecento persone e gli scout. Padre Gregorio Sosnowski ha benedetto il corteo sul fiume e quello a terra. A bordo c'era anche il nostro amico Michele Mattei, l'archeologo di Ficana.",
      "In questi anni non abbiamo mai smesso di raccogliere la memoria del quartiere. La mostra è stata in piazza Capelvenere e, il 2 giugno 2024, perfino sul Sentiero Pasolini, sotto il canneto. Per la Notte dei Musei l'abbiamo portata nella Torretta di piazza Capelvenere, nel 2025 e nel 2026.",
      "L'11 maggio 2025, al Casale Raggio di Sole, abbiamo festeggiato gli 85 anni delle Casette Pater e ricordato Michele insieme a suo padre Severino. C'erano la mostra con i pannelli nuovi, i video storici e il grande plastico di Ficana fatto dagli studenti del quartiere. Professori, storici e l'ANPI ci hanno raccontato il nostro territorio: una mattinata memorabile.",
      'Nel gennaio 2026, in Campidoglio, abbiamo ricevuto il premio «Energie per Roma» e lo abbiamo dedicato alle volontarie e ai volontari.',
      'Il 26 aprile 2026, per gli 86 anni, abbiamo aperto la sede con la colazione in giardino, le foto storiche e i video. Perché incontrarsi, stare insieme, scambiare due parole e ascoltarsi è sempre un piacere.',
      'Il 24 ottobre 2026 più di sessanta persone hanno camminato «sulle orme di Michele», sei chilometri fino agli argini del Tevere, sotto Ficana; Severino, il suo papà, ha letto le poesie del figlio. Alcuni amici di questi anni non sono più con noi: Ettore, Ernesto, Luciano e Michele. Il loro impegno continua in quello che facciamo ogni settimana.',
      "E il quartiere continua a cambiare. Dal luglio 2025 la biblioteca Sandro Onofri, nella sua sede provvisoria, ha riportato in piazza Capelvenere libri, studio e laboratori; nell'ex negozio di biciclette sta nascendo un presidio dell'ARES 118. Al capolinea dell'08, dove c'era la pinetina persa per la cocciniglia, il Municipio ha piantato peri da fiore. Il 14 gennaio 2026 il Comune ha dato il via libera alla vendita agli abitanti degli ultimi lotti delle Casette Pater; all'assemblea pubblica di fine 2025 l'amministrazione si era impegnata a conservarne una come memoria del quartiere.",
    ],
    dove: "Il Sentiero Pasolini, sull'argine del Tevere tra Centro Giano e Ostia Antica. E la sede del comitato, in via dei Monti di San Paolo 40, accanto al Parco dell'Amicizia.",
    sapevi:
      "Il nome del sentiero lo ha scelto Sven, che aveva tradotto in norvegese «Teorema» di Pier Paolo Pasolini. Il sentiero va verso l'Idroscalo di Ostia, dove Pasolini morì nella notte tra l'1 e il 2 novembre 1975.",
    foto: [
      foto(
        'barca-san-nicola-2018',
        [800, 1600],
        800,
        554,
        "26 maggio 2018: la barca di San Nicola arriva all'approdo di Monte Cugno.",
        'Un battello bianco sul Tevere; sulla riva, tra il verde, una folla con uno stendardo blu.',
      ),
      foto(
        'panchina-san-nicola-2018',
        [800, 1600],
        800,
        552,
        'Aprile 2018: la prima panchina sul Tevere, quella «di San Nicola».',
        'Una panchina di legno sulla riva, affacciata sul fiume tra gli alberi.',
      ),
      foto(
        'scaletta-tevere-2018',
        [800, 1600],
        800,
        1118,
        'Aprile 2018: la scaletta per scendere al fiume.',
        "Una scaletta di terra e assi di legno che scende tra l'erba alta verso il Tevere.",
      ),
    ],
  },
];

// Le date da ricordare: ogni riga porta al suo capitolo.
export const dateDaRicordare: { quando: string; cosa: string; capitolo: string }[] = [
  { quando: 'XI–X secolo a.C.', cosa: 'Sul Monte Cugno nasce il villaggio che diventerà Ficana', capitolo: 'ficana' },
  { quando: 'VII secolo a.C.', cosa: 'Secondo la tradizione, Anco Marzio conquista Ficana', capitolo: 'ficana' },
  { quando: 'novembre 1884', cosa: 'Arrivano da Ravenna i braccianti della bonifica', capitolo: 'bonifica' },
  { quando: '1915–1918', cosa: 'Il Comune di Roma costruisce il Borgo Acilio', capitolo: 'borgo-acilio' },
  { quando: '10 agosto 1924', cosa: 'Apre la ferrovia Roma–Lido, con la stazione di Acilia', capitolo: 'borgo-acilio' },
  { quando: '20 aprile 1940', cosa: 'Inaugurazione delle Casette Pater (data ufficiale: 21 aprile)', capitolo: 'casette-pater' },
  { quando: '24 marzo 1944', cosa: 'Lido Duranti è ucciso alle Fosse Ardeatine', capitolo: 'lido-duranti' },
  { quando: '1954', cosa: 'Le famiglie possono comprare la loro casetta', capitolo: 'il-quartiere-cresce' },
  { quando: '1980', cosa: "Federico Roman vince l'oro olimpico a Mosca", capitolo: 'il-quartiere-cresce' },
  { quando: '1996', cosa: 'Nasce la Riserva Naturale Statale del Litorale Romano', capitolo: 'il-quartiere-cresce' },
  { quando: '13 gennaio 2018', cosa: 'Nasce il nostro comitato', capitolo: 'oggi' },
  { quando: 'gennaio 2024', cosa: "La pietra d'inciampo per Lido Duranti", capitolo: 'lido-duranti' },
];

// Per saperne di più: i libri e qualche pagina in rete.
export const libri: { testo: string; link?: string }[] = [
  {
    testo: 'Luciano Villani, «Le borgate del fascismo», Ledizioni, 2012 (il Borgo Acilio e le Casette Pater alle pagine 260–267)',
    link: 'https://zenodo.org/records/4700409/files/borgate_fascismo_web.pdf',
  },
  { testo: 'Giulio Mancini, «Tra Roma e il mare. Storie di Acilia e dintorni», Publidea, 2011' },
  {
    testo: "Angelo Curci, «La ferrovia Roma–Ostia Lido nel cinquantenario della sua apertura all'esercizio 1924–1974», Edizioni G.R.A.F., 1974",
    link: 'https://www.trenidicarta.it/1974.htm',
  },
  { testo: 'Lorenzo Proia, «Acilia partigiana. Eroi venuti dal popolo», Youcanprint, 2019' },
  {
    testo: 'Claudio Biscarini e Savino Ruglioni, «Lido Duranti. Vita di un partigiano ucciso alle Fosse Ardeatine», 2002',
  },
  {
    testo: "Michele Mattei, «Ficana. L'ultimo banchetto», Horti di Giano, 2021, e «Ficana. L'alba dei latini», 2022",
    link: 'https://www.hortidigiano.com/prodotto/ficana-lalba-dei-latini/',
  },
  { testo: 'Marco Baliani, «Nel regno di Acilia», Rizzoli, 2004' },
];

export const inRete: { testo: string; link: string }[] = [
  {
    testo: "Ficana, nell'Enciclopedia dell'Arte Antica Treccani",
    link: "https://www.treccani.it/enciclopedia/ficana_(Enciclopedia-dell'-Arte-Antica)/",
  },
  {
    testo: 'I cento anni della Roma–Lido (Regione Lazio)',
    link: 'https://regione.lazio.it/notizie/Roma-Lido-Metromare-treno-Ostia-compie-100-anni',
  },
  {
    testo: 'Lido Duranti nel sito del Mausoleo delle Fosse Ardeatine',
    link: 'https://www.mausoleofosseardeatine.it/dettaglio/?id=109',
  },
  {
    testo: "La pietra d'inciampo per Lido Duranti («La Nazione», 12 gennaio 2024)",
    link: 'https://www.lanazione.it/pontedera/cronaca/una-pietra-di-inciampo-in-memoria-di-duranti-emigro-a-roma-ucciso-alle-fosse-ardeatine-2a71434f',
  },
  {
    testo: 'Nasce il Sentiero Pasolini (AGR)',
    link: 'https://www.agronline.it/ambiente-territorio/acilia-nasce-il-percorso-ciclo-pedonale-sentiero-pasolini_14285',
  },
];

export const ringraziamenti =
  'Grazie alle famiglie che ci hanno prestato le loro foto, a chi ha preparato i pannelli e i video della mostra, a Giuseppe per il logo del Sentiero Pasolini e a tutti i volontari che dal 2018 tengono viva la memoria del quartiere.';
