export type CharacterCategory = 'uppercase' | 'lowercase' | 'numbers' | 'french_accents' | 'punctuation' | 'ligatures';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type Stroke = Point[];

export interface GlyphVariant {
  id: string;
  strokes: Stroke[]; // Vector strokes from direct drawing
  svgPath?: string;  // Vectorized path string
  bitmapDataUrl?: string; // Captured raster snapshot
  leftMargin: number;  // Em unit spacing (-50 to 200)
  rightMargin: number; // Em unit spacing (-50 to 200)
  baselineOffset: number; // Y offset (-100 to 100)
  scale: number; // Scaling factor (0.5 to 2.0)
  createdAt: number;
}

export interface CharacterItem {
  id: string;
  char: string;
  unicode: number;
  name: string;
  category: CharacterCategory;
  variants: GlyphVariant[];
  selectedVariantIndex: number;
}

export interface LigatureItem {
  id: string;
  sequence: string; // e.g. "th", "ll", "qu"
  name: string;
  variants: GlyphVariant[];
}

export interface FontMetadata {
  name: string;
  author: string;
  version: string;
  description: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
}

export interface TemplateCell {
  char: string;
  name: string;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
