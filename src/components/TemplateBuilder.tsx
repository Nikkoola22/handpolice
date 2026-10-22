import React, { useRef, useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, Settings2, Sliders, CheckSquare, Square } from 'lucide-react';
import { CharacterItem } from '../types';
import { renderTemplateToCanvas, generateTemplatePDF, TemplateConfig } from '../utils/templateGenerator';

interface TemplateBuilderProps {
  characters: CharacterItem[];
  fontName: string;
}

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ characters, fontName }) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cols, setCols] = useState<number>(6);
  const [rows, setRows] = useState<number>(8);
  const [includeGuidelines, setIncludeGuidelines] = useState<boolean>(true);
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const config: TemplateConfig = {
    characters,
    columns: cols,
    rows: rows,
    includeGuidelines,
    includeWatermark,
    fontName: fontName || 'Ma Police Manuscrite',
  };

  const cellsPerPage = cols * rows;
  const totalPages = Math.ceil(characters.length / cellsPerPage) || 1;

  // Rendu de la miniature sur le canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    renderTemplateToCanvas(canvas, config, currentPage);
  }, [characters, cols, rows, includeGuidelines, includeWatermark, currentPage, fontName]);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateTemplatePDF(config);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPng = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `gabarit-${(fontName || 'police').toLowerCase().replace(/\s+/g, '-')}-page${currentPage + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto py-4">
      {/* Colonne gauche : Paramètres du gabarit */}
      <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Settings2 className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white">Configuration du Gabarit</h3>
        </div>

        {/* Colonnes et Lignes */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-300">Colonnes par page</span>
              <span className="font-mono text-sky-400 font-bold">{cols}</span>
            </div>
            <input
              type="range"
              min={4}
              max={8}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-300">Lignes par page</span>
              <span className="font-mono text-sky-400 font-bold">{rows}</span>
            </div>
            <input
              type="range"
              min={5}
              max={10}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>

        {/* Options d'aide au tracé */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeGuidelines}
              onChange={(e) => setIncludeGuidelines(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span>Lignes repères (ligne de base, x-height)</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeWatermark}
              onChange={(e) => setIncludeWatermark(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span>Lettre en filigrane clair (modèle)</span>
          </label>
        </div>

        {/* Boutons de téléchargement */}
        <div className="space-y-2.5 pt-4 border-t border-slate-800">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all active:scale-98"
          >
            <FileText className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Génération...' : 'Télécharger le PDF (A4)'}</span>
          </button>

          <button
            onClick={handleDownloadPng}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image PNG (pour iPad / Tablette)</span>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
          <p className="font-bold text-slate-300">Mode d'emploi papier :</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Imprimez le PDF sur papier blanc A4 standard.</li>
            <li>Remplissez les cases au feutre noir moyen.</li>
            <li>Prenez une photo bien éclairée ou scannez la feuille.</li>
            <li>Rendez-vous dans l'onglet <strong>Scanner / Importer</strong>.</li>
          </ol>
        </div>
      </div>

      {/* Colonne droite : Aperçu feuille A4 */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between">
        <div className="w-full flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-300">
            Aperçu de la page {currentPage + 1} sur {totalPages}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 text-xs font-semibold"
              >
                Précédente
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 text-xs font-semibold"
              >
                Suivante
              </button>
            </div>
          )}
        </div>

        {/* Aperçu Canvas redimensionné pour l'écran */}
        <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-white max-w-full">
          <canvas
            ref={previewCanvasRef}
            className="w-full max-w-[420px] aspect-[1654/2339] object-contain"
          />
        </div>
      </div>
    </div>
  );
};
