import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, Sliders, Image, Sparkles, RefreshCw } from 'lucide-react';
import { CharacterItem, GlyphVariant } from '../types';
import { renderTemplateToCanvas, TemplateConfig } from '../utils/templateGenerator';
import { processScannedTemplate, ScannedGlyphResult } from '../utils/templateScanner';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(150);
  const [extractedGlyphs, setExtractedGlyphs] = useState<ScannedGlyphResult[]>([]);
  const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set());

  // Traiter l'image scannée
  const runExtraction = async (file: File, thresh: number) => {
    setIsProcessing(true);
    try {
      // Reconstituer la grille théorique
      const dummyCanvas = document.createElement('canvas');
      const config: TemplateConfig = {
        characters,
        columns: 6,
        rows: 8,
        includeGuidelines: true,
        includeWatermark: false,
        fontName,
      };
      const { cells } = renderTemplateToCanvas(dummyCanvas, config, 0);

      const results = await processScannedTemplate(file, cells, thresh);
      setExtractedGlyphs(results);

      // Sélectionner par défaut toutes les lettres ayant du contenu détecté
      const filledSet = new Set(results.filter((r) => r.hasContent).map((r) => r.char));
      setSelectedChars(filledSet);
    } catch (err) {
      console.error('Erreur lors du traitement du scan:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    runExtraction(file, threshold);
  };

  const handleApplyThreshold = () => {
    if (selectedFile) {
      runExtraction(selectedFile, threshold);
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

  const handleConfirmImport = () => {
    const toImport = extractedGlyphs.filter((g) => selectedChars.has(g.char));
    onImportGlyphs(toImport);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      {/* Zone de téléversement initiale */}
      {!previewUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 bg-slate-900/60 hover:bg-slate-900 rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              Importez la photo ou le scan de votre feuille gabarit
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Glissez-déposez votre fichier ici, ou cliquez pour parcourir (PNG, JPG, JPEG). Les cases seront automatiquement détectées et découpées.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Traitement et revue des caractères extraits */}
      {previewUrl && (
        <div className="space-y-6">
          {/* Barre de contrôle du seuil */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-4 w-full sm:w-auto">
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
                className="w-48 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="font-mono text-xs font-bold text-sky-400">{threshold}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Changer d'image
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

          {/* Grille de revue des glyphes scannés */}
          {isProcessing ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-xs font-bold">Extraction et nettoyage des cases en cours...</p>
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
        </div>
      )}
    </div>
  );
};
