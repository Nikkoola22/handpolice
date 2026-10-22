import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Layers,
  CheckCircle2,
  Circle,
  PenTool,
  Sparkles,
  Link,
  BookOpen,
} from 'lucide-react';
import { LigatureItem } from '../types';

interface LigaturesManagerProps {
  ligatures: LigatureItem[];
  onAddLigature: (seq: string) => void;
  onRemoveLigature: (id: string) => void;
  onSelectLigatureForDrawing?: (ligId: string) => void;
}

// Suggestions courantes
const COMMON_SUGGESTIONS = ['th', 'll', 'qu', 'fi', 'fl', 'ch', 'st', 'tt', 'ee', 'oo'];

// Pack spécifique pour l'écriture cursive française (notamment liaisons hautes après b, o, v, w)
const FRENCH_CURSIVE_PACK = [
  'on', 'ou', 'oi', 'or', 'om',
  'ba', 'be', 'bi', 'bo', 'br', 'bl',
  'va', 've', 'vi', 'vo',
  'wa', 'we',
  'ch', 'qu', 'll', 'st', 'th', 'tt', 'ss', 'ff',
];

export const LigaturesManager: React.FC<LigaturesManagerProps> = ({
  ligatures,
  onAddLigature,
  onRemoveLigature,
  onSelectLigatureForDrawing,
}) => {
  const [newSequence, setNewSequence] = useState('');

  const handleCreate = () => {
    const seq = newSequence.trim();
    if (seq.length >= 2 && !ligatures.some((l) => l.sequence === seq)) {
      onAddLigature(seq);
      setNewSequence('');
    }
  };

  const handleAddFrenchCursivePack = () => {
    for (const seq of FRENCH_CURSIVE_PACK) {
      if (!ligatures.some((l) => l.sequence === seq)) {
        onAddLigature(seq);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {/* Explication du rôle des ligatures en écriture cursive */}
      <div className="bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-purple-950/40 border border-sky-800/40 rounded-3xl p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Link className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Liaisons Cursives & Ligatures Manuscrites
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Clé de l'écriture continue
              </span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              En écriture cursive, certaines lettres sortent par le <strong>haut</strong> (ex : <em>b, o, v, w</em>) et ne descendent pas sur la ligne de base.
              Pour ces paires (comme <em>« on »</em> ou <em>« ou »</em>), dessiner la paire d'un seul trait garantit une liaison continue parfaite sans rupture d'encre.
            </p>
          </div>
        </div>

        {/* Bouton pour ajouter le pack cursif français */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={handleAddFrenchCursivePack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-sky-200" />
            <span>Importer le Pack Cursif Français (24 liaisons o, b, v + doubles lettres)</span>
          </button>
        </div>
      </div>

      {/* Formulaire d'ajout personnalisé */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h4 className="text-sm font-bold text-white">Ajouter une liaison personnalisée</h4>
          </div>
          <span className="text-xs text-slate-400">
            {ligatures.length} liaison{ligatures.length > 1 ? 's' : ''} configurée{ligatures.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <input
            type="text"
            value={newSequence}
            onChange={(e) => setNewSequence(e.target.value.toLowerCase())}
            placeholder="Ex: on, qu, ll, br..."
            maxLength={4}
            className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
          <button
            onClick={handleCreate}
            disabled={newSequence.length < 2}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter la liaison</span>
          </button>
        </div>

        {/* Suggestions rapides */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2">
          <span className="text-xs text-slate-400 mr-1">Suggestions rapides :</span>
          {COMMON_SUGGESTIONS.map((seq) => {
            const exists = ligatures.some((l) => l.sequence === seq);
            return (
              <button
                key={seq}
                onClick={() => !exists && onAddLigature(seq)}
                disabled={exists}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                  exists
                    ? 'bg-slate-800 text-slate-500 cursor-default'
                    : 'bg-slate-800/80 hover:bg-sky-500/20 text-sky-400 border border-slate-700/60 cursor-pointer'
                }`}
              >
                {seq} {exists && '✓'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grille des ligatures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ligatures.map((lig) => {
          const hasStrokes =
            lig.variants &&
            lig.variants.some((v) => (v.strokes && v.strokes.length > 0) || v.bitmapDataUrl);
          const strokeCount = lig.variants?.[0]?.strokes?.length || 0;

          return (
            <div
              key={lig.id}
              className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all hover:border-slate-700 ${
                hasStrokes ? 'border-sky-500/40 bg-sky-950/10' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl font-bold text-white tracking-widest font-mono">
                    {lig.sequence}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {hasStrokes ? `${strokeCount} trait(s) dessiné(s)` : 'Non encore dessinée'}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveLigature(lig.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="Supprimer la liaison"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Aperçu ou Action de dessin */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {hasStrokes ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Prête
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Circle className="w-3.5 h-3.5" /> À tracer
                    </span>
                  )}
                </div>

                {onSelectLigatureForDrawing && (
                  <button
                    onClick={() => onSelectLigatureForDrawing(lig.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-white text-sky-400 text-xs font-bold transition-all cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>{hasStrokes ? 'Modifier' : 'Dessiner'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
