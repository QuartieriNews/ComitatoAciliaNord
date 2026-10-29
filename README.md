# Sito del Comitato di Quartiere Acilia Nord

Sito statico di comitatoacilianord.it, costruito con [Astro](https://astro.build) e pubblicato su Cloudflare Workers (progetto `comitato-acilia-nord`, configurato in `wrangler.jsonc`). Ogni modifica caricata su `main` viene pubblicata da sola. Le notizie arrivano dalla pagina Facebook del comitato tramite un'automazione su GitHub Actions.

## Dove sono le cose

- `src/pages/` – le pagine del sito
- `src/data/` – dati del comitato: contatti, direttivo, sostenitori, giornalino, categorie delle notizie
- `src/content/news/` – le notizie, un file Markdown ciascuna (create in automatico dai post Facebook)
- `src/layouts/` e `src/styles/` – impaginazione e stile
- `public/` – logo, immagini e file statici

## Comandi

```sh
npm install      # installa le dipendenze
npm run dev      # anteprima locale su http://localhost:4321
npm run build    # genera il sito in dist/
```

## Due versioni della home in prova

- **Versione A** – `src/pages/index.astro`, all'indirizzo `/`: intestazione con l'orario della casetta.
- **Versione B** – `src/pages/versione-b.astro`, all'indirizzo `/versione-b/`: intestazione animata (`src/components/ScenaHome.astro`) con la testata color carta (`versione="b"` in `Base.astro`).

Quando il comitato sceglie, la versione scelta diventa `src/pages/index.astro` e l'altra si cancella.

## Anteprima e lancio

Finché il sito è in anteprima non deve essere indicizzato dai motori di ricerca. Al momento del lancio:

1. in `src/config.ts` impostare `ANTEPRIMA = false`;
2. in `public/robots.txt` sostituire `Disallow: /` con `Allow: /`;
3. eliminare `public/_headers`;
4. collegare il dominio comitatoacilianord.it al progetto su Cloudflare, senza toccare i record della posta (MX).
