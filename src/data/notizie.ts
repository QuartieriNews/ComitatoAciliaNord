// Le notizie sono file Markdown in src/content/news/, uno per post Facebook.
// Esempio di intestazione:
// ---
// title: "Pulizia della stazione di Acilia"
// date: 2026-10-28T18:00:00+01:00
// category: decoro
// summary: "Una frase che riassume il post."
// image: /news/2026-10-28-stazione/1.webp
// foto:
//   - { src: /news/2026-10-28-stazione/1.webp, mini: /news/2026-10-28-stazione/1-mini.webp, w: 1600, h: 1200 }
//   - { src: /news/2026-10-28-stazione/2.webp, mini: /news/2026-10-28-stazione/2-mini.webp, w: 1200, h: 1600 }
// facebook: https://www.facebook.com/...
// ---
// «image» è la prima foto (copertina, anteprime nei social); «foto» le contiene tutte, con la miniatura.

import type { CategoriaId } from './categorie';

export type FotoNotizia = { src: string; mini?: string; w?: number; h?: number };

export type Notizia = {
  slug: string;
  title: string;
  date: string;
  category?: CategoriaId;
  summary?: string;
  image?: string;
  imageAlt?: string;
  foto?: FotoNotizia[];
  video?: { url: string; verticale?: boolean }; // i post con un video: si vede col lettore di Facebook
  facebook?: string;
  Content: any;
};

export function tutteLeNotizie(): Notizia[] {
  const moduli = import.meta.glob('../content/news/*.md', { eager: true });
  return Object.entries(moduli)
    .map(([percorso, modulo]: [string, any]) => ({
      ...modulo.frontmatter,
      slug: percorso.split('/').pop()!.replace(/\.md$/, ''),
      // La data può arrivare come testo o come data: la riportiamo sempre al formato ISO.
      date: new Date(modulo.frontmatter.date).toISOString(),
      Content: modulo.Content,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const formato = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Rome',
});

export function dataLeggibile(data: string) {
  return formato.format(new Date(data));
}
