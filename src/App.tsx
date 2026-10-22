import React, { useState, useEffect, useMemo } from 'react';
import { Header, ActiveTab } from './components/Header';
import { CharacterGrid } from './components/CharacterGrid';
import { GlyphDrawingCanvas } from './components/GlyphDrawingCanvas';
import { TemplateBuilder } from './components/TemplateBuilder';
import { TemplateUploader } from './components/TemplateUploader';
import { LigaturesManager } from './components/LigaturesManager';
import { HandwritingPreview } from './components/HandwritingPreview';
import { ExportFontModal } from './components/ExportFontModal';
import { CharacterItem, GlyphVariant, LigatureItem } from './types';
import { createInitialCharacters } from './constants/characterSets';
import { ScannedGlyphResult } from './utils/templateScanner';

const STORAGE_KEY = 'callifont_studio_data_v1';

export function App() {
  const [fontName, setFontName] = useState<string>('Mon Écriture Cursive');
  const [activeTab, setActiveTab] = useState<ActiveTab>('grid');
  const [characters, setCharacters] = useState<CharacterItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.characters && Array.isArray(parsed.characters)) {
          return parsed.characters;
        }
      } catch (e) {
        console.warn('Erreur chargement localStorage:', e);
      }
    }
    return createInitialCharacters();
  });

  const [ligatures, setLigatures] = useState<LigatureItem[]>(() => {
    return [
      { id: 'lig-1', sequence: 'on', name: 'Liaison haute on', variants: [] },
      { id: 'lig-2', sequence: 'ou', name: 'Liaison haute ou', variants: [] },
      { id: 'lig-3', sequence: 'br', name: 'Liaison haute br', variants: [] },
      { id: 'lig-4', sequence: 'th', name: 'Liaison th', variants: [] },
      { id: 'lig-5', sequence: 'll', name: 'Liaison ll', variants: [] },
      { id: 'lig-6', sequence: 'qu', name: 'Liaison qu', variants: [] },
    ];
  });

  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(
    characters[0]?.id || ''
  );
  const [selectedLigatureId, setSelectedLigatureId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Sauvegarde automatique dans le localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fontName,
          characters,
          ligatures,
        })
      );
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage:', e);
    }
  }, [fontName, characters, ligatures]);

  // Caractère ou ligature actuellement sélectionné pour l'atelier de dessin
  const currentDrawingItem: CharacterItem = useMemo(() => {
    if (selectedLigatureId) {
      const lig = ligatures.find((l) => l.id === selectedLigatureId);
      if (lig) {
        const defaultVariants: GlyphVariant[] = [
          {
            id: `var-lig-${Date.now()}`,
            strokes: [],
            leftMargin: 0,
            rightMargin: -8,
            baselineOffset: 0,
            scale: 1,
            createdAt: Date.now(),
          },
        ];
        return {
          id: lig.id,
          char: lig.sequence,
          unicode: 0xe000 + ligatures.indexOf(lig),
          name: `Liaison cursive « ${lig.sequence} »`,
          category: 'ligatures' as const,
          variants: lig.variants && lig.variants.length > 0 ? lig.variants : defaultVariants,
          selectedVariantIndex: 0,
        };
      }
    }
    return characters.find((c) => c.id === selectedCharacterId) || characters[0];
  }, [selectedLigatureId, selectedCharacterId, characters, ligatures]);

  // Mise à jour des variantes du caractère ou de la ligature
  const handleUpdateVariants = (itemId: string, variants: GlyphVariant[]) => {
    if (selectedLigatureId && itemId === selectedLigatureId) {
      setLigatures((prev) =>
        prev.map((l) => (l.id === itemId ? { ...l, variants } : l))
      );
    } else {
      setCharacters((prev) =>
        prev.map((c) => (c.id === itemId ? { ...c, variants } : c))
      );
    }
  };

  // Importation en masse depuis le scanner de gabarit
  const handleImportScannedGlyphs = (scannedList: ScannedGlyphResult[]) => {
    const scannedMap = new Map(scannedList.map((s) => [s.char, s.dataUrl]));

    setCharacters((prev) =>
      prev.map((c) => {
        const dataUrl = scannedMap.get(c.char);
        if (dataUrl) {
          const newVariant: GlyphVariant = {
            id: `scanned-${Date.now()}-${c.char}`,
            strokes: [],
            bitmapDataUrl: dataUrl,
            leftMargin: 0,
            rightMargin: -5,
            baselineOffset: 0,
            scale: 1,
            createdAt: Date.now(),
          };
          return {
            ...c,
            variants: [newVariant],
          };
        }
        return c;
      })
    );

    setActiveTab('grid');
  };

  // Gestion des ligatures
  const handleAddLigature = (seq: string) => {
    const newLig: LigatureItem = {
      id: `lig-${Date.now()}`,
      sequence: seq,
      name: `Liaison ${seq}`,
      variants: [],
    };
    setLigatures((prev) => [...prev, newLig]);
  };

  const handleRemoveLigature = (id: string) => {
    setLigatures((prev) => prev.filter((l) => l.id !== id));
    if (selectedLigatureId === id) {
      setSelectedLigatureId(null);
    }
  };

  const handleSelectLigatureForDrawing = (ligId: string) => {
    setSelectedLigatureId(ligId);
    setActiveTab('draw');
  };

  // Compteurs d'avancement
  const drawnCount = characters.filter((c) =>
    c.variants.some((v) => (v.strokes && v.strokes.length > 0) || v.bitmapDataUrl)
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* En-tête global et barre de navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'draw') setSelectedLigatureId(null);
          setActiveTab(tab);
        }}
        fontName={fontName}
        setFontName={setFontName}
        drawnCount={drawnCount}
        totalCount={characters.length}
        onExportClick={() => setIsExportModalOpen(true)}
      />

      {/* Contenu principal selon l'onglet actif */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'grid' && (
          <CharacterGrid
            characters={characters}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={(charId) => {
              setSelectedLigatureId(null);
              setSelectedCharacterId(charId);
            }}
            onNavigateToDrawing={(charId) => {
              setSelectedLigatureId(null);
              setSelectedCharacterId(charId);
              setActiveTab('draw');
            }}
          />
        )}

        {activeTab === 'draw' && currentDrawingItem && (
          <GlyphDrawingCanvas
            character={currentDrawingItem}
            allCharacters={characters}
            onSelectCharacter={(charId) => {
              setSelectedLigatureId(null);
              setSelectedCharacterId(charId);
            }}
            onUpdateCharacterVariants={handleUpdateVariants}
          />
        )}

        {activeTab === 'template' && (
          <TemplateBuilder characters={characters} fontName={fontName} />
        )}

        {activeTab === 'scan' && (
          <TemplateUploader
            characters={characters}
            fontName={fontName}
            onImportGlyphs={handleImportScannedGlyphs}
          />
        )}

        {activeTab === 'ligatures' && (
          <LigaturesManager
            ligatures={ligatures}
            onAddLigature={handleAddLigature}
            onRemoveLigature={handleRemoveLigature}
            onSelectLigatureForDrawing={handleSelectLigatureForDrawing}
          />
        )}

        {activeTab === 'preview' && (
          <HandwritingPreview
            characters={characters}
            ligatures={ligatures}
            fontName={fontName}
          />
        )}
      </main>

      {/* Modal d'export TrueType (.ttf) */}
      <ExportFontModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        characters={characters}
        ligatures={ligatures}
        fontName={fontName}
      />
    </div>
  );
}

export default App;

