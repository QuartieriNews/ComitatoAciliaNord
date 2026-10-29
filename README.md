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

## La home

L'intestazione animata della home è in `src/components/ScenaHome.astro`: il cerchio di persone del logo, le case, il nastro arcobaleno. Si anima una volta sola e rispetta l'impostazione «riduci movimento» del dispositivo. Il vecchio indirizzo di prova `/versione-b/` rimanda alla home (`public/_redirects`).

La denominazione è sempre «Comitato di Quartiere Acilia Nord 2018» (`src/data/comitato.ts`); l'unica eccezione è il centro dell'intestazione della home. La sede si chiama «la sede del comitato».

## Anteprima e lancio

Finché il sito è in anteprima non deve essere indicizzato dai motori di ricerca. Al momento del lancio:

1. in `src/config.ts` impostare `ANTEPRIMA = false`;
2. in `public/robots.txt` sostituire `Disallow: /` con `Allow: /`;
3. eliminare `public/_headers`;
4. collegare il dominio comitatoacilianord.it al progetto su Cloudflare, senza toccare i record della posta (MX).
