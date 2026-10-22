import React from 'react';
import {
  PenTool,
  Grid,
  FileText,
  Camera,
  Layers,
  BookOpen,
  Download,
  Sparkles,
} from 'lucide-react';

export type ActiveTab = 'grid' | 'draw' | 'template' | 'scan' | 'ligatures' | 'preview';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  fontName: string;
  setFontName: (name: string) => void;
  drawnCount: number;
  totalCount: number;
  onExportClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  fontName,
  setFontName,
  drawnCount,
  totalCount,
  onExportClick,
}) => {
  const percentComplete = Math.round((drawnCount / totalCount) * 100) || 0;

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'grid', label: 'Caractères', icon: Grid },
    { id: 'draw', label: 'Atelier Dessin', icon: PenTool },
    { id: 'template', label: 'Gabarit PDF', icon: FileText },
    { id: 'scan', label: 'Scanner / Importer', icon: Camera },
    { id: 'ligatures', label: 'Ligatures', icon: Layers },
    { id: 'preview', label: 'Simulateur & Test', icon: BookOpen },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Titre */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">CalliFont</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  STUDIO
                </span>
              </div>
              <input
                type="text"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                placeholder="Nom de la police..."
                className="bg-transparent text-xs text-slate-400 focus:text-sky-300 focus:outline-none hover:text-slate-300 transition-colors w-40 font-medium"
                title="Cliquer pour renommer la police"
              />
            </div>
          </div>

          {/* Jauge d'avancement globale */}
          <div className="flex items-center gap-2 md:ml-4 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700/60 text-xs">
            <div className="w-16 h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-300">
              {drawnCount}/{totalCount} ({percentComplete}%)
            </span>
          </div>
        </div>

        {/* Navigation Onglets */}
        <nav className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 md:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bouton Exporter */}
        <button
          onClick={onExportClick}
          disabled={drawnCount === 0}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Compiler la police (.TTF)</span>
        </button>
      </div>
    </header>
  );
};
