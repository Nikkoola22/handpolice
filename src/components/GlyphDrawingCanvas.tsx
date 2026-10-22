import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Undo2,
  Redo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sliders,
  Check,
  Eraser,
  Pen,
  Link,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CharacterItem, GlyphVariant, Stroke, Point } from '../types';

interface GlyphDrawingCanvasProps {
  character: CharacterItem;
  allCharacters: CharacterItem[];
  onSelectCharacter: (charId: string) => void;
  onUpdateCharacterVariants: (charId: string, variants: GlyphVariant[]) => void;
}

export const GlyphDrawingCanvas: React.FC<GlyphDrawingCanvasProps> = ({
  character,
  allCharacters,
  onSelectCharacter,
  onUpdateCharacterVariants,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Variantes
  const variants = character.variants.length > 0
    ? character.variants
    : [
        {
          id: `var-${Date.now()}-1`,
          strokes: [],
          leftMargin: 0,
          rightMargin: -5,
          baselineOffset: 0,
          scale: 1,
          createdAt: Date.now(),
        },
      ];

  const [activeVariantIndex, setActiveVariantIndex] = useState<number>(0);
  const activeVariant = variants[activeVariantIndex] || variants[0];

  // Outils
  const [penSize, setPenSize] = useState<number>(8);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);

  // Fonctionnalités Cursives : Guides de liaison & Fantômes voisins
  const [showCursiveGuides, setShowCursiveGuides] = useState<boolean>(true);
  const [showGhostNeighbors, setShowGhostNeighbors] = useState<boolean>(true);
  const [ghostLeftChar, setGhostLeftChar] = useState<string>('m');
  const [ghostRightChar, setGhostRightChar] = useState<string>('e');

  // Repères typographiques (Canvas 320x320)
  const CANVAS_SIZE = 320;
  const ascenderY = 60;
  const meanY = 140;
  const baselineY = 240 + (activeVariant?.baselineOffset || 0);
  const descenderY = 285;
  const cursiveConnectionY = baselineY - 8; // Hauteur de liaison standard

  // Initialisation de l'historique quand la variante change
  useEffect(() => {
    const initialStrokes = activeVariant.strokes || [];
    setHistory([initialStrokes]);
    setHistoryIndex(0);
  }, [character.id, activeVariantIndex]);

  // Tracé des lignes repères et guides cursifs
  const drawGuidelines = useCallback((ctx: CanvasRenderingContext2D) => {
    // Marges latérales (sidebearings)
    const leftX = activeVariant.leftMargin * 0.4;
    const rightX = CANVAS_SIZE - activeVariant.rightMargin * 0.4;

    ctx.fillStyle = 'rgba(2, 132, 199, 0.04)';
    if (leftX > 0) ctx.fillRect(0, 0, leftX, CANVAS_SIZE);
    if (rightX < CANVAS_SIZE) ctx.fillRect(rightX, 0, CANVAS_SIZE - rightX, CANVAS_SIZE);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Ascender
    ctx.beginPath();
    ctx.moveTo(0, ascenderY);
    ctx.lineTo(CANVAS_SIZE, ascenderY);
    ctx.stroke();

    // Mean line (hauteur d'x)
    ctx.beginPath();
    ctx.moveTo(0, meanY);
    ctx.lineTo(CANVAS_SIZE, meanY);
    ctx.stroke();

    // Descender
    ctx.beginPath();
    ctx.moveTo(0, descenderY);
    ctx.lineTo(CANVAS_SIZE, descenderY);
    ctx.stroke();

    // Baseline (Ligne de base : solide bleue)
    ctx.setLineDash([]);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(CANVAS_SIZE, baselineY);
    ctx.stroke();

    // Marges latérales
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(leftX, 0);
    ctx.lineTo(leftX, CANVAS_SIZE);
    ctx.moveTo(rightX, 0);
    ctx.lineTo(rightX, CANVAS_SIZE);
    ctx.stroke();
    ctx.setLineDash([]);

    // 🌟 GUIDES CURSIFS DE LIAISON
    if (showCursiveGuides) {
      // Ligne repère de la hauteur de liaison
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, cursiveConnectionY);
      ctx.lineTo(CANVAS_SIZE, cursiveConnectionY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point d'entrée d'amorce (Vert émeraude)
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(leftX, cursiveConnectionY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Point de sortie de queue (Rose corail)
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(rightX, cursiveConnectionY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Étiquettes textuelles discrètes
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText('← Entrée', Math.max(2, leftX - 44), cursiveConnectionY - 8);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('Sortie →', Math.min(CANVAS_SIZE - 46, rightX + 6), cursiveConnectionY - 8);
    }
  }, [activeVariant, baselineY, ascenderY, meanY, descenderY, cursiveConnectionY, showCursiveGuides]);

  // Tracé des voisins fantômes (pour visualiser la continuité des liaisons)
  const drawGhostNeighbors = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showGhostNeighbors) return;

    const leftX = activeVariant.leftMargin * 0.4;
    const rightX = CANVAS_SIZE - activeVariant.rightMargin * 0.4;

    // 1. Lettre fantôme précédente (à gauche)
    const leftItem = allCharacters.find((c) => c.char === ghostLeftChar);
    const leftStrokes = leftItem?.variants[0]?.strokes;
    if (leftStrokes && leftStrokes.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.translate(leftX - (CANVAS_SIZE - 60), 0);
      for (const stroke of leftStrokes) {
        if (stroke.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Lettre fantôme suivante (à droite)
    const rightItem = allCharacters.find((c) => c.char === ghostRightChar);
    const rightStrokes = rightItem?.variants[0]?.strokes;
    if (rightStrokes && rightStrokes.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.translate(rightX - 25, 0);
      for (const stroke of rightStrokes) {
        if (stroke.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [showGhostNeighbors, activeVariant, ghostLeftChar, ghostRightChar, allCharacters, penSize]);

  // Redessiner le canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fond blanc propre
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Dessiner les repères typographiques et cursifs
    drawGuidelines(ctx);

    // Dessiner les voisins fantômes
    drawGhostNeighbors(ctx);

    // Dessiner tous les traits enregistrés de la lettre
    const strokesToDraw = historyIndex >= 0 && history[historyIndex] ? history[historyIndex] : [];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    for (const stroke of strokesToDraw) {
      if (stroke.length === 0) continue;
      if (stroke.length === 1) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, penSize / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.lineWidth = penSize;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }

    // Dessiner le trait en cours de tracé
    if (currentStroke.length > 0) {
      ctx.lineWidth = penSize;
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }
  }, [history, historyIndex, currentStroke, penSize, drawGuidelines, drawGhostNeighbors]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Coordonnées souris/toucher normalisées
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure || 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pt = getCanvasPoint(e);
    setIsDrawing(true);

    if (tool === 'eraser') {
      eraseNear(pt.x, pt.y);
    } else {
      setCurrentStroke([pt]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getCanvasPoint(e);

    if (tool === 'eraser') {
      eraseNear(pt.x, pt.y);
    } else {
      setCurrentStroke((prev) => [...prev, pt]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);

    if (tool === 'pen' && currentStroke.length > 0) {
      const currentStrokes = historyIndex >= 0 && history[historyIndex] ? history[historyIndex] : [];
      const nextStrokes = [...currentStrokes, currentStroke];
      const nextHistory = [...history.slice(0, historyIndex + 1), nextStrokes];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setCurrentStroke([]);
      saveVariantStrokes(nextStrokes);
    }
  };

  // Outil Gomme
  const eraseNear = (x: number, y: number) => {
    const currentStrokes = historyIndex >= 0 && history[historyIndex] ? history[historyIndex] : [];
    const threshold = 18;
    const filtered = currentStrokes.filter((stroke) => {
      return !stroke.some((pt) => Math.hypot(pt.x - x, pt.y - y) < threshold);
    });

    if (filtered.length !== currentStrokes.length) {
      const nextHistory = [...history.slice(0, historyIndex + 1), filtered];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      saveVariantStrokes(filtered);
    }
  };

  // Sauvegarde des traits de la variante active
  const saveVariantStrokes = (strokes: Stroke[]) => {
    const updatedVariants = variants.map((v, idx) => {
      if (idx === activeVariantIndex) {
        return {
          ...v,
          strokes,
        };
      }
      return v;
    });

    onUpdateCharacterVariants(character.id, updatedVariants);
  };

  // Annuler / Rétablir
  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      saveVariantStrokes(history[nextIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      saveVariantStrokes(history[nextIdx]);
    }
  };

  const handleClear = () => {
    const nextHistory = [...history.slice(0, historyIndex + 1), []];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    saveVariantStrokes([]);
  };

  // Navigation Lettre précédente / suivante
  const currentIndex = allCharacters.findIndex((c) => c.id === character.id);
  const prevChar = currentIndex > 0 ? allCharacters[currentIndex - 1] : null;
  const nextChar = currentIndex < allCharacters.length - 1 ? allCharacters[currentIndex + 1] : null;

  // Gestion des variantes
  const handleAddVariant = () => {
    if (variants.length >= 4) return;
    const newVariant: GlyphVariant = {
      id: `var-${Date.now()}-${variants.length + 1}`,
      strokes: [],
      leftMargin: 0,
      rightMargin: -5,
      baselineOffset: 0,
      scale: 1,
      createdAt: Date.now(),
    };
    const nextVariants = [...variants, newVariant];
    onUpdateCharacterVariants(character.id, nextVariants);
    setActiveVariantIndex(nextVariants.length - 1);
  };

  const handleUpdateActiveVariantSettings = (updates: Partial<GlyphVariant>) => {
    const updated = variants.map((v, idx) => (idx === activeVariantIndex ? { ...v, ...updates } : v));
    onUpdateCharacterVariants(character.id, updated);
  };

  // Calibrage en 1 clic pour liaison cursive continue
  const handleCalibrateCursive = () => {
    handleUpdateActiveVariantSettings({
      leftMargin: 0,
      rightMargin: -8, // Léger chevauchement pour éliminer tout blanc
      baselineOffset: 0,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto py-4">
      {/* Colonne gauche : Canvas de dessin principal */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        {/* En-tête de navigation du glyphe */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-3xl font-extrabold text-white shadow-inner font-mono">
              {character.char}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {character.name}
                {character.category === 'ligatures' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Ligature cursive
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Unicode: U+{character.unicode.toString(16).padStart(4, '0').toUpperCase()}
              </p>
            </div>
          </div>

          {/* Boutons Suivant / Précédent */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevChar && onSelectCharacter(prevChar.id)}
              disabled={!prevChar}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Caractère précédent (Flèche gauche)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-400 px-1">
              {currentIndex >= 0 ? `${currentIndex + 1} / ${allCharacters.length}` : 'Ligature'}
            </span>
            <button
              onClick={() => nextChar && onSelectCharacter(nextChar.id)}
              disabled={!nextChar}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Caractère suivant (Flèche droite)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Variantes et Bascules Cursives */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 px-1">Variantes :</span>
            {variants.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => setActiveVariantIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeVariantIndex === idx
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                V{idx + 1}
              </button>
            ))}
            {variants.length < 3 && (
              <button
                onClick={handleAddVariant}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-all cursor-pointer"
                title="Ajouter une variante"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Variante</span>
              </button>
            )}
          </div>

          {/* Outils Cursifs d'aide au tracé */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCursiveGuides(!showCursiveGuides)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showCursiveGuides
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Affiche les points d'attache d'entrée (vert) et de sortie (rose) pour une liaison cursive parfaite"
            >
              <Link className="w-3.5 h-3.5" />
              <span>Guides de liaison</span>
            </button>

            <button
              onClick={() => setShowGhostNeighbors(!showGhostNeighbors)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showGhostNeighbors
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Affiche les lettres voisines en filigrane pour voir les raccords en direct"
            >
              {showGhostNeighbors ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Voisins fantômes</span>
            </button>
          </div>
        </div>

        {/* Surface de dessin Canvas */}
        <div className="flex justify-center">
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl bg-white touch-none">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-72 h-72 sm:w-80 sm:h-80 cursor-crosshair select-none"
            />
          </div>
        </div>

        {/* Barre d'outils de dessin */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Outil Plume vs Gomme */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === 'pen' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Plume</span>
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tool === 'eraser' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Gomme</span>
            </button>
          </div>

          {/* Calibre d'épaisseur */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 font-medium">Trait :</span>
            {[4, 8, 14, 22].map((sz) => (
              <button
                key={sz}
                onClick={() => setPenSize(sz)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  penSize === sz ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: Math.max(3, sz * 0.7), height: Math.max(3, sz * 0.7) }}
                />
              </button>
            ))}
          </div>

          {/* Annuler / Rétablir / Vider */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Annuler (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title="Rétablir"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 text-slate-400 transition-all cursor-pointer"
              title="Effacer le dessin"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Colonne droite : Métriques typographiques (Baseline, Marges cursives, Fantômes) */}
      <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Métriques Cursives</h3>
          </div>
        </div>

        {/* Bouton Magique : Calibrage Cursif */}
        <button
          onClick={handleCalibrateCursive}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>🪄 Calibrer pour liaison cursive</span>
        </button>

        {/* Sélecteurs des lettres fantômes */}
        {showGhostNeighbors && (
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" /> Voisins affichés en filigrane :
            </span>
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Avant :</span>
                <select
                  value={ghostLeftChar}
                  onChange={(e) => setGhostLeftChar(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-bold"
                >
                  {['m', 'l', 'c', 'a', 'p', 't', 'b', 'o'].map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-400">Après :</span>
                <select
                  value={ghostRightChar}
                  onChange={(e) => setGhostRightChar(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-bold"
                >
                  {['e', 'a', 's', 'l', 't', 'i', 'u', 'r'].map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Décalage Ligne de base (Baseline) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-300">Ligne de base (Baseline)</span>
            <span className="font-mono text-sky-400 font-bold">{activeVariant.baselineOffset}px</span>
          </div>
          <input
            type="range"
            min={-40}
            max={40}
            value={activeVariant.baselineOffset}
            onChange={(e) => handleUpdateActiveVariantSettings({ baselineOffset: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Marge gauche (Left Sidebearing) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-300">Marge gauche (Entrée)</span>
            <span className="font-mono text-emerald-400 font-bold">{activeVariant.leftMargin}</span>
          </div>
          <input
            type="range"
            min={-30}
            max={100}
            value={activeVariant.leftMargin}
            onChange={(e) => handleUpdateActiveVariantSettings({ leftMargin: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <p className="text-[10px] text-slate-500">Pour le cursif, gardez autour de 0.</p>
        </div>

        {/* Marge droite (Right Sidebearing) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-300">Marge droite (Sortie / Recouvrement)</span>
            <span className="font-mono text-rose-400 font-bold">{activeVariant.rightMargin}</span>
          </div>
          <input
            type="range"
            min={-30}
            max={100}
            value={activeVariant.rightMargin}
            onChange={(e) => handleUpdateActiveVariantSettings({ rightMargin: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <p className="text-[10px] text-slate-500">
            Une valeur négative (-5 à -15) fait chevaucher la queue de sortie sur la lettre suivante.
          </p>
        </div>

        {/* Guide d'or pour police cursive */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-sky-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5 text-white">
            <Link className="w-3.5 h-3.5 text-emerald-400" /> Règle d'or pour lier les lettres :
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            1. Faites débuter votre lettre sur le repère vert <strong>« Entrée »</strong>.
            <br />
            2. Terminez votre trait ascendant sur le repère rose <strong>« Sortie »</strong>.
            <br />
            3. Avec les deux points à la même hauteur, chaque lettre s'enchaînera naturellement à la suivante sans jamais lever la plume !
          </p>
        </div>
      </div>
    </div>
  );
};
