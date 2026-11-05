# CLAUDE.md — istruzioni per gli agenti in questo repository

Questo repository è dell'account `QuartieriNews`. Le regole di Quartieri News per lavorare su
GitHub valgono anche qui (DEC-030):

- il protocollo: https://github.com/QuartieriNews/QN/blob/main/docs/github/PROTOCOLLO.md
- le decisioni DEC-028, DEC-029 e DEC-030: https://github.com/QuartieriNews/QN/tree/main/decisions

Qui sotto ci sono le regole essenziali. Dove questo riassunto e il protocollo differiscono,
vale il protocollo.

## Su GitHub

- **Chi scrive.** Ogni scrittura (push, pull request, commento, issue) passa da
  `QN-Builder`, l'account macchina dichiarato, mai dall'account dell'owner.
- **Uno scrittore alla volta, su tutto l'account.** Una sola sessione di agente alla volta
  scrive sui repository di `QuartieriNews`, QN compreso. Se sai di un'altra sessione attiva,
  chiedi all'owner prima di scrivere.
- **Ritmo.**
  - Almeno 5 secondi fra due scritture qualsiasi.
  - Almeno 60 secondi fra due scritture di contenuto (pull request, commento, issue).
  - Al massimo 10 scritture di contenuto e 30 di stato all'ora.
  - Nelle 24 ore dopo la fine di una restrizione, i tetti orari si dimezzano.
- **Mai:** commit vuoti, push di sole correzioni di forma, chiudere e riaprire.
- **Stop al primo segnale di restrizione**, su questo o su un altro repository dell'account:
  - 404 o 403 non spiegati da un permesso mancante;
  - pagina non visibile da non autenticati;
  - un messaggio di GitHub sull'account;
  - Actions che non parte entro dieci minuti da un evento che un workflow ascolta (qui:
    l'orario dell'automazione delle notizie).

  Nessun'altra scrittura, si avvisa l'owner e non si aggira il blocco.
- **Report di fine sessione.** Ogni sessione che ha scritto su GitHub chiude con un
  riepilogo per l'owner, in chat e non su GitHub: scritture per tipo, intervalli, errori.

## Il sito

- **Ogni push su `main` pubblica il sito** su Cloudflare. Raccogli le modifiche e mostrale
  all'owner in anteprima (`npm run dev`, http://localhost:4321). Poi pubblica con un push
  per blocco, non uno per ritocco. Prima del push `npm run build` deve riuscire.
- **Prima di ogni push aggiorna `main`:** l'automazione delle notizie può aver caricato
  qualcosa nel frattempo.
- **Se la pubblicazione non parte**, si rilancia dal pannello di Cloudflare (progetto
  `comitato-acilia-nord`), mai con un commit vuoto o fatto apposta.
- **Niente pull request né revisioni Codex** per le modifiche al sito.
- **Le notizie** in `src/content/news/` e `public/news/` le scrive l'automazione
  `notizie-facebook.yml`, come `github-actions[bot]`. Si toccano a mano solo su richiesta
  dell'owner, e l'orario dell'automazione non si cambia senza il suo via.
