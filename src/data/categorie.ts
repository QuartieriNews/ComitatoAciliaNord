// Categorie delle notizie. I colori vengono dal cerchio di persone del logo.

export const categorie = {
  decoro: { nome: 'Decoro urbano', colore: '#1e8f34' },
  segnalazioni: { nome: 'Segnalazioni', colore: '#d7262d' },
  mobilita: { nome: 'Mobilità', colore: '#1182ae' },
  verde: { nome: 'Verde e PRU', colore: '#146c44' },
  eventi: { nome: 'Eventi', colore: '#d4006f' },
  storia: { nome: 'Storia del quartiere', colore: '#6c2e83' },
  comitato: { nome: 'Vita del comitato', colore: '#c75f00' },
} as const;

export type CategoriaId = keyof typeof categorie;

// Le notizie senza categoria, o con una che non esiste, valgono come «Vita del comitato».
export function idCategoria(id: string | undefined): CategoriaId {
  return id && id in categorie ? (id as CategoriaId) : 'comitato';
}

export function categoria(id: string | undefined) {
  return categorie[idCategoria(id)];
}
