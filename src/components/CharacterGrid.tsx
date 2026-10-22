import React, { useState } from 'react';
import { Search, CheckCircle2, Circle, PenLine, Sparkles, Filter } from 'lucide-react';
import { CharacterCategory, CharacterItem } from '../types';
import { CATEGORY_LABELS } from '../constants/characterSets';

interface CharacterGridProps {
  characters: CharacterItem[];
  selectedCharacterId: string;
  onSelectCharacter: (charId: string) => void;
  onNavigateToDrawing: (charId: string) => void;
}

export const CharacterGrid: React.FC<CharacterGridProps> = ({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onNavigateToDrawing,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CharacterCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrage
  const filteredCharacters = characters.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.char.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const categories: (CharacterCategory | 'all')[] = [
    'all',
    'uppercase',
    'lowercase',
    'numbers',
    'french_accents',
    'punctuation',
  ];

  const getDrawnVariantCount = (item: CharacterItem) => {
    return item.variants.filter((v) => (v.strokes && v.strokes.length > 0) || v.bitmapDataUrl).length;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Barre de filtres et recherche */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-md">
        {/* Filtres par catégorie */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat === 'all' ? 'Tous les caractères' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Champ de recherche */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une lettre..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Grille de cartes de caractères */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
        {filteredCharacters.map((item) => {
          const drawnVariants = getDrawnVariantCount(item);
          const isDrawn = drawnVariants > 0;
          const isSelected = selectedCharacterId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => {
                onSelectCharacter(item.id);
                onNavigateToDrawing(item.id);
              }}
              className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between aspect-square hover:scale-[1.03] active:scale-[0.98] ${
                isSelected
                  ? 'bg-sky-950/60 border-sky-400 ring-2 ring-sky-500/30'
                  : isDrawn
                  ? 'bg-slate-900 border-slate-700/80 hover:border-sky-500/50'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Badge d'état dans le coin */}
              <div className="w-full flex items-center justify-between text-[10px]">
                <span className="font-mono text-slate-500 group-hover:text-slate-400">
                  {item.char}
                </span>
                {isDrawn ? (
                  <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    {drawnVariants > 1 && <span>{drawnVariants}</span>}
                  </span>
                ) : (
                  <Circle className="w-3 h-3 text-slate-700" />
                )}
              </div>

              {/* Rendu miniature du glyphe */}
              <div className="flex-1 flex items-center justify-center my-1 w-full">
                {isDrawn ? (
                  <div className="text-3xl font-extrabold text-white group-hover:text-sky-300 transition-colors">
                    {item.char}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-slate-700 group-hover:text-slate-500 transition-colors">
                    {item.char}
                  </div>
                )}
              </div>

              {/* Libellé court ou bouton action */}
              <div className="w-full text-center">
                <span
                  className={`text-[10px] font-medium block truncate ${
                    isDrawn ? 'text-sky-400' : 'text-slate-500'
                  }`}
                >
                  {isDrawn ? (drawnVariants > 1 ? `${drawnVariants} variantes` : 'Dessiné') : 'À faire'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
