import React, { useState } from 'react';
import { X, Download, CheckCircle2, AlertTriangle, Sparkles, Laptop, FileCheck } from 'lucide-react';
import { CharacterItem, FontMetadata, LigatureItem } from '../types';
import { compileFont, exportFontToFile, registerLiveFontFace } from '../utils/fontCompiler';

interface ExportFontModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterItem[];
  ligatures: LigatureItem[];
  fontName: string;
}

export const ExportFontModal: React.FC<ExportFontModalProps> = ({
  isOpen,
  onClose,
  characters,
  ligatures,
  fontName,
}) => {
  const [author, setAuthor] = useState('Moi');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('Police de mon écriture manuscrite créée avec CalliFont Studio.');
  const [isCompiling, setIsCompiling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calcul des statistiques
  const drawnCharacters = characters.filter((c) =>
    c.variants.some((v) => (v.strokes && v.strokes.length > 0) || v.bitmapDataUrl)
  );
  const totalVariants = characters.reduce(
    (acc, c) => acc + c.variants.filter((v) => (v.strokes && v.strokes.length > 0) || v.bitmapDataUrl).length,
    0
  );

  const handleExport = async () => {
    setIsCompiling(true);
    setSuccessMessage(null);
    try {
      const metadata: FontMetadata = {
        name: fontName || 'Ma Police Manuscrite',
        author,
        version,
        description,
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
      };

      const font = compileFont(characters, ligatures, metadata);
      const safeName = (fontName || 'ma-police').toLowerCase().replace(/\s+/g, '-');
      exportFontToFile(font, `${safeName}.ttf`);

      // Enregistrer également dans le document pour le test immédiat
      await registerLiveFontFace(font, 'UserLiveHandwriting');

      setSuccessMessage(`Fichier "${safeName}.ttf" généré et téléchargé avec succès !`);
    } catch (err) {
      console.error('Erreur lors de la compilation de la police:', err);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* En-tête */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Compilation & Téléchargement</h3>
            <p className="text-xs text-slate-400">Générez un véritable fichier de police TrueType (.ttf) installable</p>
          </div>
        </div>

        {/* Statistiques de la police */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Caractères dessinés</span>
            <div className="text-xl font-extrabold text-white">
              {drawnCharacters.length} / {characters.length}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Variantes uniques</span>
            <div className="text-xl font-extrabold text-sky-400">
              {totalVariants} glyphes
            </div>
          </div>
        </div>

        {drawnCharacters.length < 26 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Conseil : Vous avez dessiné moins de 26 caractères. Pour des résultats optimaux dans vos documents, complétez au moins l'alphabet de base (A-Z ou a-z).
            </p>
          </div>
        )}

        {/* Métadonnées OpenType */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Nom de la police</label>
            <input
              type="text"
              value={fontName}
              disabled
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white opacity-80"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Auteur / Créateur</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Message de succès */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Bouton d'action */}
        <button
          onClick={handleExport}
          disabled={drawnCharacters.length === 0 || isCompiling}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 text-white text-sm font-bold shadow-xl shadow-sky-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          <span>{isCompiling ? 'Génération de la police...' : 'Télécharger le fichier .TTF'}</span>
        </button>

        {/* Guide d'installation sur Mac */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <p className="font-bold text-slate-200 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-sky-400" />
            Comment l'installer sur votre Mac :
          </p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Double-cliquez sur le fichier <strong>.ttf</strong> téléchargé.</li>
            <li>L'application <strong>Livre des polices</strong> (Font Book) s'ouvre : cliquez sur <strong>« Installer »</strong>.</li>
            <li>Votre écriture manuscrite sera immédiatement sélectionnable dans Word, Pages, Photoshop, Illustrator, TextEdit, etc. !</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
