import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Sliders,
  Sparkles,
  RefreshCw,
  FileText,
  AlertCircle,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { CharacterItem } from '../types';
import { renderTemplateToCanvas, TemplateConfig } from '../utils/templateGenerator';
import { processScannedTemplate, ScannedGlyphResult } from '../utils/templateScanner';
import { isPdfFile, renderPdfToCanvases } from '../utils/pdfScanner';

interface TemplateUploaderProps {
  characters: CharacterItem[];
  fontName: string;
  onImportGlyphs: (scannedResults: ScannedGlyphResult[]) => void;
}

export const TemplateUploader: React.FC<TemplateUploaderProps> = ({
  characters,
  fontName,
  onImportGlyphs,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cachedCanvases, setCachedCanvases] = useState<HTMLCanvasElement[]>([]);
  const [previewPageIdx, setPreviewPageIdx] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(150);
  const [cols, setCols] = useState<number>(6);
  const [rows, setRows] = useState<number>(8);
  const [extractedGlyphs, setExtractedGlyphs] = useState<ScannedGlyphResult[]>([]);
  const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Extraction à partir d'une liste de canvases de pages
  const extractFromCanvases = async (
    canvases: HTMLCanvasElement[],
    thresh: number,
    columnCount: number,
    rowCount: number
  ) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const dummyCanvas = document.createElement('canvas');
      const config: TemplateConfig = {
        characters,
        columns: columnCount,
        rows: rowCount,
        includeGuidelines: true,
        includeWatermark: false,
        fontName,
      };

      const allResults: ScannedGlyphResult[] = [];

      for (let pIdx = 0; pIdx < canvases.length; pIdx++) {
        setProcessingStatus(`Extraction de la page ${pIdx + 1} sur ${canvases.length}...`);
        const { cells } = renderTemplateToCanvas(dummyCanvas, config, pIdx);
        if (cells.length === 0) break;

        const pageResults = await processScannedTemplate(canvases[pIdx], cells, thresh);
        allResults.push(...pageResults);
      }

      setExtractedGlyphs(allResults);

      // Présélectionner automatiquement les caractères avec contenu détecté
      const filledSet = new Set(allResults.filter((r) => r.hasContent).map((r) => r.char));
      setSelectedChars(filledSet);
    } catch (err: any) {
      console.error('Erreur lors de l extraction :', err);
      setErrorMessage(
        err?.message || "Une erreur est survenue lors de l'extraction des glyphes."
      );
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Traiter un fichier sélectionné (PDF ou Image)
  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setIsProcessing(true);
    setPreviewPageIdx(0);

    try {
      let canvases: HTMLCanvasElement[] = [];

      if (isPdfFile(file)) {
        setProcessingStatus('Lecture et rendu des pages du PDF en haute résolution...');
        canvases = await renderPdfToCanvases(file);

        if (canvases.length === 0) {
          throw new Error('Aucune page lisible n a pu être extraite de ce fichier PDF.');
        }
      } else {
        setProcessingStatus('Chargement de l image...');
        // Convertir le fichier image en canvas pour le pipeline unifié
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Impossible de charger cette image.'));
          img.src = objectUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Impossible d initialiser le contexte canvas 2D');
        ctx.drawImage(img, 0, 0);
        canvases = [canvas];
      }

      setCachedCanvases(canvases);
      await extractFromCanvases(canvases, threshold, cols, rows);
    } catch (err: any) {
      console.error('Erreur lors du traitement du fichier:', err);
      setErrorMessage(
        err?.message ||
          'Impossible de traiter le fichier. Vérifiez le format (PDF, PNG, JPG).'
      );
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
    // Reset file input value so user can re-select same file if needed
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleApplyThreshold = () => {
    if (cachedCanvases.length > 0) {
      extractFromCanvases(cachedCanvases, threshold, cols, rows);
    }
  };

  const toggleSelectChar = (char: string) => {
    setSelectedChars((prev) => {
      const next = new Set(prev);
      if (next.has(char)) next.delete(char);
      else next.add(char);
      return next;
    });
  };

  const selectAllWithContent = () => {
    const filled = new Set(extractedGlyphs.filter((g) => g.hasContent).map((g) => g.char));
    setSelectedChars(filled);
  };

  const selectAll = () => {
    setSelectedChars(new Set(extractedGlyphs.map((g) => g.char)));
  };

  const deselectAll = () => {
    setSelectedChars(new Set());
  };

  const handleConfirmImport = () => {
    const toImport = extractedGlyphs.filter((g) => selectedChars.has(g.char));
    onImportGlyphs(toImport);
  };

  const currentPreviewDataUrl =
    cachedCanvases.length > 0 && cachedCanvases[previewPageIdx]
      ? cachedCanvases[previewPageIdx].toDataURL('image/jpeg', 0.85)
      : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      {/* Message d'erreur éventuel */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <p className="font-bold">Erreur d'importation</p>
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-2.5 py-1 text-slate-400 hover:text-white rounded-lg bg-rose-500/20"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Zone de téléversement initiale */}
      {cachedCanvases.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 ${
            isDragging
              ? 'border-sky-400 bg-sky-950/40 ring-4 ring-sky-500/20'
              : 'border-slate-700 hover:border-sky-500/60 bg-slate-900/60 hover:bg-slate-900'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              Importez votre gabarit rempli (PDF ou Image)
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Glissez-déposez votre gabarit ici ou cliquez pour parcourir. Formats supportés :{' '}
              <span className="font-semibold text-sky-400">PDF multipage</span>, PNG, JPG, JPEG.
              Les cases de chaque page sont automatiquement découpées et nettoyées.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              PDF multipage
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              Haute résolution A4
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Traitement en cours initial */}
      {isProcessing && cachedCanvases.length === 0 && (
        <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-xs font-bold text-white">Traitement du fichier...</p>
          <p className="text-xs text-slate-400">{processingStatus}</p>
        </div>
      )}

      {/* Traitement et revue des caractères extraits */}
      {cachedCanvases.length > 0 && (
        <div className="space-y-6">
          {/* Barre de contrôle du seuil et actions */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
            {/* Infos fichier et pagination si multipage */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                {selectedFile && isPdfFile(selectedFile) ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <Layers className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                  {selectedFile?.name || 'Gabarit'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {cachedCanvases.length} {cachedCanvases.length > 1 ? 'pages détectées' : 'page'} •{' '}
                  {extractedGlyphs.length} lettres analysées
                </p>
              </div>

              {cachedCanvases.length > 1 && (
                <div className="flex items-center gap-1 ml-2 bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewPageIdx((p) => Math.max(0, p - 1))}
                    disabled={previewPageIdx === 0}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 px-1.5 font-bold">
                    {previewPageIdx + 1}/{cachedCanvases.length}
                  </span>
                  <button
                    onClick={() =>
                      setPreviewPageIdx((p) => Math.min(cachedCanvases.length - 1, p + 1))
                    }
                    disabled={previewPageIdx === cachedCanvases.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Curseur de contraste & seuillage */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-center">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
                <Sliders className="w-4 h-4 text-sky-400" />
                Seuil de contraste :
              </span>
              <input
                type="range"
                min={80}
                max={220}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                onMouseUp={handleApplyThreshold}
                onTouchEnd={handleApplyThreshold}
                className="w-36 sm:w-44 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="font-mono text-xs font-bold text-sky-400 min-w-8">{threshold}</span>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Changer de fichier
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={selectedChars.size === 0 || isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20 disabled:opacity-40 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Importer {selectedChars.size} lettres</span>
              </button>
            </div>
          </div>

          {/* Filtres de sélection rapide */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Sélection :</span>
              <button
                onClick={selectAllWithContent}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                Cases remplies uniquement
              </button>
              <button
                onClick={selectAll}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                Tout sélectionner
              </button>
              <button
                onClick={deselectAll}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                Tout désélectionner
              </button>
            </div>

            <span className="font-bold text-sky-400">
              {selectedChars.size} / {extractedGlyphs.length} sélectionnés
            </span>
          </div>

          {/* Aperçu de la page ou traitement */}
          {isProcessing ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-xs font-bold text-white">Traitement en cours...</p>
              <p className="text-xs text-slate-400">{processingStatus}</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {extractedGlyphs.map((glyph) => {
                const isSelected = selectedChars.has(glyph.char);
                return (
                  <div
                    key={glyph.char}
                    onClick={() => toggleSelectChar(glyph.char)}
                    className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between aspect-square select-none ${
                      isSelected
                        ? 'bg-slate-900 border-sky-500 ring-2 ring-sky-500/30'
                        : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="w-full flex justify-between text-[10px]">
                      <span className="font-bold text-slate-400">{glyph.char}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                      )}
                    </div>

                    <div className="flex-1 flex items-center justify-center p-1 w-full overflow-hidden">
                      {glyph.hasContent ? (
                        <img
                          src={glyph.dataUrl}
                          alt={glyph.char}
                          className="max-h-12 max-w-full object-contain filter invert"
                        />
                      ) : (
                        <span className="text-slate-700 text-xs italic">Vide</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Input fichier caché pour changer de document */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};
