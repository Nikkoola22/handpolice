import { TemplateCell } from '../types';

export interface ScannedGlyphResult {
  char: string;
  name: string;
  dataUrl: string;
  hasContent: boolean;
}

/**
 * Traite une image scannée ou photographiée d'une feuille gabarit.
 * Découpe chaque case, nettoie le bruit et les lignes de repères,
 * et extrait les glyphes individuels.
 */
export async function processScannedTemplate(
  imageSource: HTMLImageElement | File,
  templateCells: TemplateCell[],
  threshold: number = 150
): Promise<ScannedGlyphResult[]> {
  const img = await loadImage(imageSource);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible d\'initialiser le contexte canvas');

  ctx.drawImage(img, 0, 0);

  const results: ScannedGlyphResult[] = [];

  // Dimensions de référence du gabarit standard (1654 x 2339)
  const refWidth = 1654;
  const refHeight = 2339;
  const scaleX = canvas.width / refWidth;
  const scaleY = canvas.height / refHeight;

  for (const cell of templateCells) {
    // Calcul de la zone utile à l'intérieur de la cellule (en ignorant les bordures extérieures)
    const paddingX = cell.width * 0.08;
    const paddingTop = cell.height * 0.28; // Ignorer l'en-tête de la case (lettre imprimée)
    const paddingBottom = cell.height * 0.06;

    const cropX = Math.round((cell.x + paddingX) * scaleX);
    const cropY = Math.round((cell.y + paddingTop) * scaleY);
    const cropW = Math.round((cell.width - paddingX * 2) * scaleX);
    const cropH = Math.round((cell.height - paddingTop - paddingBottom) * scaleY);

    if (cropW <= 0 || cropH <= 0) continue;

    // Canvas temporaire pour la cellule extraite
    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = cropW;
    cellCanvas.height = cropH;
    const cellCtx = cellCanvas.getContext('2d');
    if (!cellCtx) continue;

    cellCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Binarisation et nettoyage du bruit de papier
    const imgData = cellCtx.getImageData(0, 0, cropW, cropH);
    const d = imgData.data;
    let darkPixelCount = 0;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      // Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Détection de l'encre manuscrite
      // On filtre le bleu des repères et les gris clairs
      const isBlueGuide = b > 140 && b > r + 30 && b > g + 20;

      if (lum < threshold && !isBlueGuide) {
        // Encre noire propre
        d[i] = 15;
        d[i + 1] = 23;
        d[i + 2] = 42;
        d[i + 3] = 255;
        darkPixelCount++;
      } else {
        // Fond blanc / transparent
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = 0;
      }
    }

    cellCtx.putImageData(imgData, 0, 0);

    // Si plus de 30 pixels d'encre sont détectés, on considère que la case est remplie
    const hasContent = darkPixelCount > 30;

    results.push({
      char: cell.char,
      name: cell.name,
      dataUrl: cellCanvas.toDataURL('image/png'),
      hasContent,
    });
  }

  return results;
}

function loadImage(src: HTMLImageElement | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLImageElement) {
      if (src.complete) resolve(src);
      else {
        src.onload = () => resolve(src);
        src.onerror = reject;
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(src);
  });
}
