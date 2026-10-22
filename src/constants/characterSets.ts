import { CharacterCategory, CharacterItem } from '../types';

export interface CharDefinition {
  char: string;
  name: string;
  category: CharacterCategory;
}

export const DEFAULT_CHARACTER_DEFINITIONS: CharDefinition[] = [
  // Majuscules
  ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map((c) => ({
    char: c,
    name: `Majuscule ${c}`,
    category: 'uppercase' as CharacterCategory,
  })),

  // Minuscules
  ...Array.from('abcdefghijklmnopqrstuvwxyz').map((c) => ({
    char: c,
    name: `Minuscule ${c}`,
    category: 'lowercase' as CharacterCategory,
  })),

  // Chiffres
  ...Array.from('0123456789').map((c) => ({
    char: c,
    name: `Chiffre ${c}`,
    category: 'numbers' as CharacterCategory,
  })),

  // Accents et caractères français
  { char: 'é', name: 'e accent aigu', category: 'french_accents' },
  { char: 'è', name: 'e accent grave', category: 'french_accents' },
  { char: 'ê', name: 'e accent circonflexe', category: 'french_accents' },
  { char: 'ë', name: 'e tréma', category: 'french_accents' },
  { char: 'à', name: 'a accent grave', category: 'french_accents' },
  { char: 'â', name: 'a accent circonflexe', category: 'french_accents' },
  { char: 'ç', name: 'c cédille', category: 'french_accents' },
  { char: 'î', name: 'i circonflexe', category: 'french_accents' },
  { char: 'ï', name: 'i tréma', category: 'french_accents' },
  { char: 'ô', name: 'o circonflexe', category: 'french_accents' },
  { char: 'ù', name: 'u accent grave', category: 'french_accents' },
  { char: 'û', name: 'u circonflexe', category: 'french_accents' },
  { char: 'ü', name: 'u tréma', category: 'french_accents' },
  { char: 'œ', name: 'oe lié', category: 'french_accents' },
  { char: 'æ', name: 'ae lié', category: 'french_accents' },
  { char: 'É', name: 'E majuscule accent aigu', category: 'french_accents' },
  { char: 'È', name: 'E majuscule accent grave', category: 'french_accents' },
  { char: 'À', name: 'A majuscule accent grave', category: 'french_accents' },
  { char: 'Ç', name: 'C majuscule cédille', category: 'french_accents' },

  // Ponctuation & Symboles courants
  { char: '.', name: 'Point', category: 'punctuation' },
  { char: ',', name: 'Virgule', category: 'punctuation' },
  { char: ';', name: 'Point-virgule', category: 'punctuation' },
  { char: ':', name: 'Deux-points', category: 'punctuation' },
  { char: '!', name: 'Point d\'exclamation', category: 'punctuation' },
  { char: '?', name: 'Point d\'interrogation', category: 'punctuation' },
  { char: "'", name: 'Apostrophe', category: 'punctuation' },
  { char: '"', name: 'Guillemets', category: 'punctuation' },
  { char: '-', name: 'Tiret', category: 'punctuation' },
  { char: '(', name: 'Parenthèse ouvrante', category: 'punctuation' },
  { char: ')', name: 'Parenthèse fermante', category: 'punctuation' },
  { char: '@', name: 'Arobase', category: 'punctuation' },
  { char: '€', name: 'Euro', category: 'punctuation' },
  { char: '$', name: 'Dollar', category: 'punctuation' },
  { char: '%', name: 'Pourcent', category: 'punctuation' },
  { char: '&', name: 'Esperluette', category: 'punctuation' },
  { char: '+', name: 'Plus', category: 'punctuation' },
  { char: '=', name: 'Égal', category: 'punctuation' },
  { char: '/', name: 'Barre oblique', category: 'punctuation' },
  { char: '*', name: 'Astérisque', category: 'punctuation' },
];

export function createInitialCharacters(): CharacterItem[] {
  return DEFAULT_CHARACTER_DEFINITIONS.map((def, idx) => ({
    id: `char-${idx}-${def.char.charCodeAt(0)}`,
    char: def.char,
    unicode: def.char.charCodeAt(0),
    name: def.name,
    category: def.category,
    variants: [],
    selectedVariantIndex: 0,
  }));
}

export const CATEGORY_LABELS: Record<CharacterCategory, string> = {
  uppercase: 'Majuscules (A-Z)',
  lowercase: 'Minuscules (a-z)',
  numbers: 'Chiffres (0-9)',
  french_accents: 'Accents français',
  punctuation: 'Ponctuation & Symboles',
  ligatures: 'Ligatures',
};
