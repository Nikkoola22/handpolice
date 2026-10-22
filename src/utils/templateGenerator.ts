import jsPDF from 'jspdf';
import { CharacterItem, TemplateCell } from '../types';

export interface TemplateConfig {
  characters: CharacterItem[];
  columns: number;
  rows: number;
  includeGuidelines: boolean;
  includeWatermark: boolean;
  fontName: string;
}

/**
 * Dessine la feuille gabarit sur un élément canvas HTML haute résolution (A4 à 300 DPI)
 */
export function renderTemplateToCanvas(
  canvas: HTMLCanvasElement,
  config: TemplateConfig,
  pageIndex: number = 0
): { cells: TemplateCell[]; totalPages: number } {
  // Dimensions A4 en pixels à ~200 DPI (1654 x 2339)
  const width = 1654;
  const height = 2339;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { cells: [], totalPages: 1 };

  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 1. Repères de calage fiduciels aux 4 coins (carrés noirs 40x40px)
  const markerSize = 44;
  const margin = 50;
  ctx.fillStyle = '#000000';
  ctx.fillRect(margin, margin, markerSize, markerSize); // Haut gauche
  ctx.fillRect(width - margin - markerSize, margin, markerSize, markerSize); // Haut droite
  ctx.fillRect(margin, height - margin - markerSize, markerSize, markerSize); // Bas gauche
  ctx.fillRect(width - margin - markerSize, height - margin - markerSize, markerSize, markerSize); // Bas droite

  // 2. En-tête du gabarit
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('GABARIT DE POLICE MANUSCRITE', margin + markerSize + 30, margin + 35);

  ctx.fillStyle = '#64748b';
  ctx.font = '20px sans-serif';
  ctx.fillText(
    `Police : ${config.fontName || 'Ma Police'} • Page ${pageIndex + 1}`,
    margin + markerSize + 30,
    margin + 68
  );

  // Instructions
  ctx.fillStyle = '#475569';
  ctx.font = '16px sans-serif';
  ctx.fillText(
    'Remplissez chaque case au feutre noir. Écrivez entre la ligne de base et la ligne médiane. Ne dépassez pas les cadres.',
    margin + markerSize + 30,
    margin + 98
  );

  // 3. Grille de cellules
  const gridTop = margin + markerSize + 80;
  const gridBottom = height - margin - markerSize - 30;
  const gridLeft = margin + 10;
  const gridRight = width - margin - 10;
  const gridWidth = gridRight - gridLeft;
  const gridHeight = gridBottom - gridTop;

  const cols = config.columns || 6;
  const rows = config.rows || 8;
  const cellsPerPage = cols * rows;
  const totalPages = Math.ceil(config.characters.length / cellsPerPage) || 1;

  const startIndex = pageIndex * cellsPerPage;
  const pageCharacters = config.characters.slice(startIndex, startIndex + cellsPerPage);

  const cellWidth = gridWidth / cols;
  const cellHeight = gridHeight / rows;

  const cells: TemplateCell[] = [];

  for (let i = 0; i < pageCharacters.length; i++) {
    const item = pageCharacters[i];
    const r = Math.floor(i / cols);
    const c = i % cols;

    const x = gridLeft + c * cellWidth;
    const y = gridTop + r * cellHeight;

    cells.push({
      char: item.char,
      name: item.name,
      row: r,
      col: c,
      x,
      y,
      width: cellWidth,
      height: cellHeight,
    });

    // Cadre extérieur de la cellule
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, cellWidth, cellHeight);

    // Titre / lettre de référence dans le coin haut gauche
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(item.char, x + 12, y + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    const label = item.name.length > 15 ? item.name.slice(0, 14) + '…' : item.name;
    ctx.fillText(label, x + 38, y + 24);

    // Repères typographiques dans la case
    if (config.includeGuidelines) {
      const ascenderY = y + cellHeight * 0.35;
      const meanY = y + cellHeight * 0.52;
      const baselineY = y + cellHeight * 0.76;
      const descenderY = y + cellHeight * 0.90;

      // Ligne ascendante (pointillés)
      ctx.strokeStyle = '#e2e8f0';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x + 8, ascenderY);
      ctx.lineTo(x + cellWidth - 8, ascenderY);
      ctx.stroke();

      // Ligne médiane / x-height (pointillés)
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(x + 8, meanY);
      ctx.lineTo(x + cellWidth - 8, meanY);
      ctx.stroke();

      // Ligne de base (continue et accentuée)
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x + 8, baselineY);
      ctx.lineTo(x + cellWidth - 8, baselineY);
      ctx.stroke();

      // Ligne descendante (pointillés)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x + 8, descenderY);
      ctx.lineTo(x + cellWidth - 8, descenderY);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Lettre en filigrane clair au centre
    if (config.includeWatermark) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.font = `${Math.round(cellHeight * 0.45)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(item.char, x + cellWidth / 2, y + cellHeight * 0.76);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    }
  }

  return { cells, totalPages };
}

/**
 * Exporte toutes les pages du gabarit dans un fichier PDF imprimable A4
 */
export async function generateTemplatePDF(config: TemplateConfig): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const canvas = document.createElement('canvas');
  const { totalPages } = renderTemplateToCanvas(canvas, config, 0);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();
    renderTemplateToCanvas(canvas, config, page);
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  pdf.save(`gabarit-${config.fontName.toLowerCase().replace(/\s+/g, '-') || 'police'}.pdf`);
}
