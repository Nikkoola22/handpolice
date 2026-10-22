import opentype from 'opentype.js';
import { CharacterItem, FontMetadata, LigatureItem } from '../types';
import { strokesToOutlinePath, bitmapToOutlinePath } from './vectorizer';

export function compileFont(
  characters: CharacterItem[],
  ligatures: LigatureItem[] = [],
  metadata: FontMetadata
): opentype.Font {
  const unitsPerEm = metadata.unitsPerEm || 1000;
  const ascender = metadata.ascender || 800;
  const descender = metadata.descender || -200;

  // 1. Glyphe standard non défini (.notdef) obligatoire dans toute police
  const notdefPath = new opentype.Path();
  const boxWidth = Math.round(unitsPerEm * 0.5);
  const boxHeight = Math.round(unitsPerEm * 0.7);
  notdefPath.moveTo(50, 0);
  notdefPath.lineTo(boxWidth, 0);
  notdefPath.lineTo(boxWidth, boxHeight);
  notdefPath.lineTo(50, boxHeight);
  notdefPath.close();

  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: boxWidth + 50,
    path: notdefPath,
  });

  // 2. Glyphe Espace (' ')
  const spaceGlyph = new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: Math.round(unitsPerEm * 0.35),
    path: new opentype.Path(),
  });

  const glyphList: opentype.Glyph[] = [notdefGlyph, spaceGlyph];

  // 3. Glyphes de caractères dessinés
  for (const item of characters) {
    if (item.variants.length === 0) continue;

    const variant = item.variants[item.selectedVariantIndex] || item.variants[0];
    let outlineResult: { path: opentype.Path; advanceWidth: number };

    if (variant.strokes && variant.strokes.length > 0) {
      outlineResult = strokesToOutlinePath(variant.strokes, {
        canvasWidth: 320,
        canvasHeight: 320,
        baselineY: 240 + variant.baselineOffset,
        unitsPerEm,
        strokeWidth: 10 * variant.scale,
        leftMargin: variant.leftMargin,
        rightMargin: variant.rightMargin,
      });
    } else if (variant.bitmapDataUrl) {
      // Pour les glyphes scannés
      const img = new Image();
      img.src = variant.bitmapDataUrl;
      const cvs = document.createElement('canvas');
      cvs.width = img.width || 120;
      cvs.height = img.height || 120;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        outlineResult = bitmapToOutlinePath(imgData, {
          baselineYPercent: 0.75,
          unitsPerEm,
          leftMargin: variant.leftMargin,
          rightMargin: variant.rightMargin,
          threshold: 160,
        });
      } else {
        outlineResult = { path: new opentype.Path(), advanceWidth: Math.round(unitsPerEm * 0.4) };
      }
    } else {
      continue;
    }

    const glyphName = item.char === ' ' ? 'space' : `uni${item.unicode.toString(16).padStart(4, '0').toUpperCase()}`;
    const glyph = new opentype.Glyph({
      name: glyphName,
      unicode: item.unicode,
      advanceWidth: outlineResult.advanceWidth,
      path: outlineResult.path,
    });

    glyphList.push(glyph);
  }

  // 4. Glyphes de ligatures cursives dessinées
  for (let idx = 0; idx < ligatures.length; idx++) {
    const lig = ligatures[idx];
    if (!lig.variants || lig.variants.length === 0) continue;
    const variant = lig.variants[0];
    if (!variant.strokes || variant.strokes.length === 0) continue;

    const outlineResult = strokesToOutlinePath(variant.strokes, {
      canvasWidth: 320,
      canvasHeight: 320,
      baselineY: 240 + variant.baselineOffset,
      unitsPerEm,
      strokeWidth: 10 * variant.scale,
      leftMargin: variant.leftMargin,
      rightMargin: variant.rightMargin,
    });

    const ligGlyph = new opentype.Glyph({
      name: `liga_${lig.sequence}`,
      unicode: 0xe000 + idx, // Zone d'usage privé (PUA)
      advanceWidth: outlineResult.advanceWidth,
      path: outlineResult.path,
    });

    glyphList.push(ligGlyph);
  }

  // 5. Construction de l'objet Font OpenType
  const font = new opentype.Font({
    familyName: metadata.name.trim() || 'Ma Police Manuscrite',
    styleName: 'Regular',
    unitsPerEm,
    ascender,
    descender,
    glyphs: glyphList,
  });

  return font;
}

/**
 * Télécharge la police générée au format TrueType (.ttf)
 */
export function exportFontToFile(font: opentype.Font, fileName: string = 'ma-police.ttf') {
  const buffer = font.toArrayBuffer();
  const blob = new Blob([buffer], { type: 'font/ttf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.ttf') ? fileName : `${fileName}.ttf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Charge dynamiquement la police dans le document pour un rendu en direct via CSS
 */
export async function registerLiveFontFace(font: opentype.Font, fontFaceName: string = 'UserHandwritingFont'): Promise<string> {
  const buffer = font.toArrayBuffer();
  const fontFace = new FontFace(fontFaceName, buffer);
  await fontFace.load();
  document.fonts.add(fontFace);
  return fontFaceName;
}
