import opentype from 'opentype.js';
import { Stroke, Point } from '../types';

/**
 * Convertit une série de traits dessinés (lignes ouvertes avec épaisseur)
 * en contours polygonaux fermés compatibles avec les glyphes TrueType/OpenType.
 */
export function strokesToOutlinePath(
  strokes: Stroke[],
  options: {
    canvasWidth: number;
    canvasHeight: number;
    baselineY: number;
    unitsPerEm: number;
    strokeWidth: number;
    leftMargin: number;
    rightMargin: number;
  }
): { path: opentype.Path; advanceWidth: number } {
  const path = new opentype.Path();
  const {
    canvasWidth,
    canvasHeight,
    baselineY,
    unitsPerEm,
    strokeWidth,
    leftMargin,
    rightMargin,
  } = options;

  if (strokes.length === 0) {
    return { path, advanceWidth: Math.round(unitsPerEm * 0.4) };
  }

  // Calcul du bounding box horizontal des traits pour calibrer la largeur de chasse
  let minX = Infinity;
  let maxX = -Infinity;

  for (const stroke of strokes) {
    for (const pt of stroke) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
    }
  }

  if (minX === Infinity) {
    minX = canvasWidth * 0.2;
    maxX = canvasWidth * 0.8;
  }

  // Échelle de conversion Canvas -> Font Em units
  // On dimensionne pour qu'une hauteur standard de 300px corresponde environ à 800-900 unités em
  const scale = (unitsPerEm * 0.85) / canvasHeight;

  // Conversion de coordonnées vers l'espace typographique :
  // Canvas : (0, 0) en haut à gauche, Y vers le bas.
  // OpenType : (0, 0) sur la ligne de base, Y vers le haut.
  const toFontX = (x: number) => Math.round((x - minX) * scale + leftMargin);
  const toFontY = (y: number) => Math.round((baselineY - y) * scale);
  const halfWidth = Math.max(1.5, strokeWidth / 2);

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;

    if (stroke.length === 1) {
      // Point isolé (ex: point sur le 'i', point '.')
      const pt = stroke[0];
      const cx = toFontX(pt.x);
      const cy = toFontY(pt.y);
      const r = Math.round(halfWidth * scale * 1.2);

      // Cercle polygonal approximé
      const steps = 12;
      for (let i = 0; i < steps; i++) {
        const theta = (i * 2 * Math.PI) / steps;
        const px = cx + Math.round(r * Math.cos(theta));
        const py = cy + Math.round(r * Math.sin(theta));
        if (i === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      }
      path.close();
      continue;
    }

    // Trait avec plusieurs points : extrusion normale gauche & droite
    const leftPoints: Point[] = [];
    const rightPoints: Point[] = [];

    for (let i = 0; i < stroke.length; i++) {
      const p = stroke[i];
      let dx = 0;
      let dy = 0;

      if (i === 0) {
        dx = stroke[1].x - p.x;
        dy = stroke[1].y - p.y;
      } else if (i === stroke.length - 1) {
        dx = p.x - stroke[i - 1].x;
        dy = p.y - stroke[i - 1].y;
      } else {
        dx = stroke[i + 1].x - stroke[i - 1].x;
        dy = stroke[i + 1].y - stroke[i - 1].y;
      }

      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      const w = halfWidth * (p.pressure ? p.pressure * 1.2 : 1.0);

      leftPoints.push({
        x: p.x + nx * w,
        y: p.y + ny * w,
      });

      rightPoints.push({
        x: p.x - nx * w,
        y: p.y - ny * w,
      });
    }

    // Tracer le contour fermé dans le sens horaire : gauche -> bout -> droite inversée -> départ
    const startL = leftPoints[0];
    path.moveTo(toFontX(startL.x), toFontY(startL.y));

    for (let i = 1; i < leftPoints.length; i++) {
      path.lineTo(toFontX(leftPoints[i].x), toFontY(leftPoints[i].y));
    }

    // Demi-tour au bout (cap)
    for (let i = rightPoints.length - 1; i >= 0; i--) {
      path.lineTo(toFontX(rightPoints[i].x), toFontY(rightPoints[i].y));
    }

    path.close();
  }

  // Calcul de la largeur de chasse (advanceWidth) pour permettre le raccordement cursif
  const glyphContentWidth = Math.round((maxX - minX) * scale);
  const advanceWidth = Math.max(
    50,
    glyphContentWidth + leftMargin + rightMargin
  );

  return { path, advanceWidth };
}

/**
 * Vectorise une image bitmap (ex: cellule issue d'un gabarit scanné)
 * en convertissant les pixels noirs en contours vectoriels.
 */
export function bitmapToOutlinePath(
  imageData: ImageData,
  options: {
    baselineYPercent: number; // ex: 0.75 (ligne de base à 75% du haut)
    unitsPerEm: number;
    leftMargin: number;
    rightMargin: number;
    threshold: number; // 0-255 seuil de noir
  }
): { path: opentype.Path; advanceWidth: number } {
  const path = new opentype.Path();
  const { width, height, data } = imageData;
  const { baselineYPercent, unitsPerEm, leftMargin, rightMargin, threshold } = options;

  const baselineY = height * baselineYPercent;

  // Création d'une matrice binaire (1 = encre, 0 = fond blanc)
  const grid: Uint8Array = new Uint8Array(width * height);
  let minX = width;
  let maxX = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Luminance perçue
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (a > 50 && luminance < threshold) {
        grid[y * width + x] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  if (minX >= maxX) {
    // Cellule vide
    return { path, advanceWidth: Math.round(unitsPerEm * 0.4) };
  }

  const scale = (unitsPerEm * 0.85) / height;
  const toFontX = (x: number) => Math.round((x - minX) * scale + leftMargin);
  const toFontY = (y: number) => Math.round((baselineY - y) * scale);

  // Découpage en blocs horizontaux de pixels contigus pour générer des quadrilatères propres
  const step = 2; // simplification pour garder un fichier léger
  for (let y = 0; y < height; y += step) {
    let inRun = false;
    let startX = 0;

    for (let x = 0; x < width; x += step) {
      const isPixel = grid[y * width + x] === 1;

      if (isPixel && !inRun) {
        inRun = true;
        startX = x;
      } else if (!isPixel && inRun) {
        inRun = false;
        const endX = x;
        addRectToPath(path, toFontX(startX), toFontY(y + step), toFontX(endX), toFontY(y));
      }
    }
    if (inRun) {
      addRectToPath(path, toFontX(startX), toFontY(y + step), toFontX(width), toFontY(y));
    }
  }

  const glyphContentWidth = Math.round((maxX - minX) * scale);
  const advanceWidth = Math.max(
    50,
    glyphContentWidth + leftMargin + rightMargin
  );

  return { path, advanceWidth };
}

function addRectToPath(path: opentype.Path, x0: number, y0: number, x1: number, y1: number) {
  path.moveTo(x0, y0);
  path.lineTo(x1, y0);
  path.lineTo(x1, y1);
  path.lineTo(x0, y1);
  path.close();
}
