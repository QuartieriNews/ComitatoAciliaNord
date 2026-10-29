// Le notizie sono file Markdown in src/content/news/, uno per post Facebook.
// Esempio di intestazione:
// ---
// title: "Pulizia della stazione di Acilia"
// date: 2026-10-28T18:00:00+01:00
// category: decoro
// summary: "Una frase che riassume il post."
// image: /news/2026-10-28-stazione.jpg
// facebook: https://www.facebook.com/...
// ---

import type { CategoriaId } from './categorie';

export type Notizia = {
  slug: string;
  title: string;
  date: string;
  category?: CategoriaId;
  summary?: string;
  image?: string;
  imageAlt?: string;
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
