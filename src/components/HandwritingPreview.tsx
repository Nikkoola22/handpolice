import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  Sliders,
  Palette,
  FileText,
  Activity,
  Compass,
  RotateCw,
  Waves,
  Link,
  Layers,
} from 'lucide-react';
import { CharacterItem, LigatureItem, Stroke } from '../types';

interface HandwritingPreviewProps {
  characters: CharacterItem[];
  ligatures: LigatureItem[];
  fontName: string;
}

type PaperType = 'seyes' | 'lines' | 'blank' | 'parchment';
type InkColor = 'blue_ink' | 'black_ink' | 'purple_ink' | 'pencil';

const SAMPLE_TEXTS = [
  {
    title: 'Cursive continue',
    text: 'Nous lions chaque lettre avec fluidité et élégance.\nPortez ce vieux whisky au juge blond qui fume.',
  },
  {
    title: 'Extrait de Proust',
    text: 'Longtemps, je me suis couché de bonne heure. Parfois, à peine ma bougie éteinte, mes yeux se fermaient si vite que je n\'avais pas le temps de me dire : « Je m\'endors. »',
  },
  {
    title: 'Lettre manuscrite',
    text: 'Chers amis,\nJe vous écris ces quelques lignes avec ma nouvelle écriture cursive liée. Observez comme les lettres se raccordent sans coupure !',
  },
];

interface TextToken {
  text: string;
  isLigature: boolean;
  strokes?: Stroke[];
  bitmapDataUrl?: string;
  leftMargin: number;
  rightMargin: number;
  baselineOffset: number;
  scale: number;
  minX?: number;
  maxX?: number;
  entryPt?: { x: number; y: number };
  exitPt?: { x: number; y: number };
}

export const HandwritingPreview: React.FC<HandwritingPreviewProps> = ({
  characters,
  ligatures,
  fontName,
}) => {
  const [text, setText] = useState<string>(SAMPLE_TEXTS[0].text);
  const [fontSize, setFontSize] = useState<number>(34);
  const [lineHeight, setLineHeight] = useState<number>(2.0);
  const [letterSpacing, setLetterSpacing] = useState<number>(-6); // Valeur par défaut pour liaison cursive sans blanc
  const [paper, setPaper] = useState<PaperType>('seyes');
  const [ink, setInk] = useState<InkColor>('blue_ink');
  const [enableRandomization, setEnableRandomization] = useState<boolean>(true);
  const [enableCursiveOverlap, setEnableCursiveOverlap] = useState<boolean>(true);

  // Fonctionnalités d'écriture non parfaitement horizontale (Organic Slant & Jitter)
  const [slope, setSlope] = useState<number>(1.2); // Pente de la phrase (-5° à +5°)
  const [baselineWave, setBaselineWave] = useState<number>(0.3); // Flottement / ondulation (0 à 1)
  const [letterRotation, setLetterRotation] = useState<number>(1.8); // Micro-rotations des lettres (0° à 6°)
  const [jitter, setJitter] = useState<number>(0.15); // Irrégularités organiques (0 à 1)

  // Dictionnaire des glyphes dessinés pour le rendu visuel
  const charMap = useMemo(() => {
    const map = new Map<string, CharacterItem>();
    for (const c of characters) {
      if (c.variants.some((v) => (v.strokes && v.strokes.length > 0) || v.bitmapDataUrl)) {
        map.set(c.char, c);
      }
    }
    return map;
  }, [characters]);

  // Dictionnaire des ligatures dessinées
  const readyLigatures = useMemo(() => {
    return ligatures.filter((l) =>
      l.variants && l.variants.some((v) => (v.strokes && v.strokes.length > 0) || v.bitmapDataUrl)
    );
  }, [ligatures]);

  // Couleurs d'encre
  const inkStyles: Record<InkColor, { color: string; label: string; shadow: string }> = {
    blue_ink: { color: '#1e40af', label: 'Encre bleue plume', shadow: '0 0 1px rgba(30, 64, 175, 0.4)' },
    black_ink: { color: '#0f172a', label: 'Feutre noir', shadow: '0 0 1px rgba(15, 23, 42, 0.5)' },
    purple_ink: { color: '#7e22ce', label: 'Encre violette', shadow: '0 0 1px rgba(126, 34, 206, 0.4)' },
    pencil: { color: '#475569', label: 'Crayon graphite', shadow: 'none' },
  };

  // Styles de papier
  const getPaperClasses = () => {
    switch (paper) {
      case 'seyes':
        return 'bg-[#fcfdfa] text-slate-900 border-indigo-200';
      case 'lines':
        return 'bg-[#fbfbf9] text-slate-900 border-amber-200';
      case 'parchment':
        return 'bg-[#f7efe1] text-amber-950 border-amber-300';
      case 'blank':
      default:
        return 'bg-white text-slate-900 border-slate-300';
    }
  };

  // Pré-réglages rapides de dérive naturelle
  const applyPreset = (preset: 'straight' | 'subtle' | 'lively' | 'downward' | 'cursive_school') => {
    switch (preset) {
      case 'cursive_school':
        setSlope(0.8);
        setBaselineWave(0.2);
        setLetterRotation(1.2);
        setJitter(0.1);
        setLetterSpacing(-6);
        setEnableCursiveOverlap(true);
        break;
      case 'straight':
        setSlope(0);
        setBaselineWave(0);
        setLetterRotation(0);
        setJitter(0);
        break;
      case 'subtle':
        setSlope(1.2);
        setBaselineWave(0.3);
        setLetterRotation(1.8);
        setJitter(0.2);
        break;
      case 'lively':
        setSlope(2.5);
        setBaselineWave(0.65);
        setLetterRotation(3.5);
        setJitter(0.5);
        break;
      case 'downward':
        setSlope(-2.0);
        setBaselineWave(0.4);
        setLetterRotation(2.0);
        setJitter(0.3);
        break;
    }
  };

  // Découpage de la ligne avec détection des ligatures cursives
  const tokenizeLine = (line: string): TextToken[] => {
    const tokens: TextToken[] = [];
    let i = 0;

    // Trier les ligatures par longueur décroissante
    const sortedLigs = [...readyLigatures].sort((a, b) => b.sequence.length - a.sequence.length);

    while (i < line.length) {
      let matchedLig: LigatureItem | null = null;
      for (const lig of sortedLigs) {
        if (line.substring(i, i + lig.sequence.length) === lig.sequence) {
          matchedLig = lig;
          break;
        }
      }

      if (matchedLig) {
        const v = matchedLig.variants[0];
        let minX = Infinity;
        let maxX = -Infinity;
        let entryPt: { x: number; y: number } | undefined;
        let exitPt: { x: number; y: number } | undefined;

        if (v?.strokes && v.strokes.length > 0) {
          for (const s of v.strokes) {
            for (const pt of s) {
              if (pt.x < minX) minX = pt.x;
              if (pt.x > maxX) maxX = pt.x;
            }
          }
          const firstS = v.strokes[0];
          if (firstS && firstS.length > 0) entryPt = { x: firstS[0].x, y: firstS[0].y };
          const lastS = v.strokes[v.strokes.length - 1];
          if (lastS && lastS.length > 0) exitPt = { x: lastS[lastS.length - 1].x, y: lastS[lastS.length - 1].y };
        }

        tokens.push({
          text: matchedLig.sequence,
          isLigature: true,
          strokes: v?.strokes || [],
          leftMargin: v?.leftMargin ?? 0,
          rightMargin: v?.rightMargin ?? -8,
          baselineOffset: v?.baselineOffset ?? 0,
          scale: v?.scale ?? 1,
          minX: minX !== Infinity ? minX : undefined,
          maxX: maxX !== -Infinity ? maxX : undefined,
          entryPt,
          exitPt,
        });
        i += matchedLig.sequence.length;
      } else {
        const char = line[i];
        const item = charMap.get(char);
        const v = item?.variants[item.selectedVariantIndex] || item?.variants[0];

        let minX = Infinity;
        let maxX = -Infinity;
        let entryPt: { x: number; y: number } | undefined;
        let exitPt: { x: number; y: number } | undefined;

        if (v?.strokes && v.strokes.length > 0) {
          for (const s of v.strokes) {
            for (const pt of s) {
              if (pt.x < minX) minX = pt.x;
              if (pt.x > maxX) maxX = pt.x;
            }
          }
          const firstS = v.strokes[0];
          if (firstS && firstS.length > 0) entryPt = { x: firstS[0].x, y: firstS[0].y };
          const lastS = v.strokes[v.strokes.length - 1];
          if (lastS && lastS.length > 0) exitPt = { x: lastS[lastS.length - 1].x, y: lastS[lastS.length - 1].y };
        }

        tokens.push({
          text: char,
          isLigature: false,
          strokes: v?.strokes,
          bitmapDataUrl: v?.bitmapDataUrl,
          leftMargin: v?.leftMargin ?? 0,
          rightMargin: v?.rightMargin ?? -6,
          baselineOffset: v?.baselineOffset ?? 0,
          scale: v?.scale ?? 1,
          minX: minX !== Infinity ? minX : undefined,
          maxX: maxX !== -Infinity ? maxX : undefined,
          entryPt,
          exitPt,
        });
        i++;
      }
    }

    return tokens;
  };

  // Rendu de la simulation avec liaisons cursives & dérive non horizontale
  const renderSimulatedText = () => {
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      const tokens = tokenizeLine(line);

      return (
        <div
          key={`line-${lineIdx}`}
          className="flex flex-wrap items-baseline min-h-[1.5em]"
          style={{ marginBottom: `${(lineHeight - 1) * fontSize}px` }}
        >
          {tokens.map((tok, tokIdx) => {
            // 1. Dérive de la pente de phrase
            const slopeOffset = -Math.tan((slope * Math.PI) / 180) * (tokIdx * fontSize * 0.45);

            // 2. Ondulation organique de la ligne
            const waveOffset = Math.sin(tokIdx * 0.35 + lineIdx * 1.7) * (baselineWave * fontSize * 0.16);

            // 3. Micro-sautillement et tremblement du poignet
            const pseudoRandY = Math.sin(tokIdx * 91.3 + lineIdx * 37.7);
            const jitterOffset = pseudoRandY * (jitter * fontSize * 0.12);

            // 4. Micro-rotation de chaque lettre
            const pseudoRandRot = Math.cos(tokIdx * 47.1 + lineIdx * 19.3);
            const rotationDeg = pseudoRandRot * letterRotation;

            if (tok.text === ' ') {
              return (
                <span
                  key={`sp-${tokIdx}`}
                  style={{
                    width: `${fontSize * 0.4}px`,
                    display: 'inline-block',
                    transform: `translateY(${slopeOffset + waveOffset}px)`,
                  }}
                >
                  &nbsp;
                </span>
              );
            }

            // Calcul du Y cumulé
            const totalY = (tok.baselineOffset || 0) * 0.2 + slopeOffset + waveOffset + jitterOffset;

            // Calcul de l'espacement pour continuité cursive
            // Une valeur négative fait glisser la lettre sous la queue de la précédente
            const spacingStyle = enableCursiveOverlap
              ? `${letterSpacing + (tok.rightMargin || 0) * 0.12}px`
              : `${letterSpacing}px`;

            if (!tok.strokes || tok.strokes.length === 0) {
              if (tok.bitmapDataUrl) {
                return (
                  <span
                    key={`tok-${tokIdx}`}
                    className="inline-flex items-end relative select-none"
                    style={{
                      height: `${fontSize * 1.05}px`,
                      marginRight: spacingStyle,
                      transform: `translateY(${totalY}px) rotate(${rotationDeg}deg)`,
                      transformOrigin: 'bottom center',
                      zIndex: 10 + tokIdx,
                    }}
                  >
                    <img
                      src={tok.bitmapDataUrl}
                      alt={tok.text}
                      className="h-full w-auto max-w-none inline-block object-contain filter invert pointer-events-none"
                    />
                  </span>
                );
              }

              // Caractère de secours si pas encore tracé
              return (
                <span
                  key={`tok-${tokIdx}`}
                  className="font-serif opacity-75 inline-block select-none"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: inkStyles[ink].color,
                    marginRight: spacingStyle,
                    transform: `translateY(${totalY}px) rotate(${rotationDeg}deg)`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  {tok.text}
                </span>
              );
            }

            // Rendu vectoriel du glyphe tracé (ou de la ligature)
            // Utilise un viewBox cadré serré pour éliminer tout blanc mort et lier les lettres
            const hasValidBounds = tok.minX !== undefined && tok.maxX !== undefined && tok.minX < tok.maxX;
            const strokeW = hasValidBounds ? (tok.maxX! - tok.minX!) : 120;
            const viewMinX = hasValidBounds ? tok.minX! - 4 : 0;
            const viewW = hasValidBounds ? strokeW + 8 : 320;

            const tokenWidth = tok.isLigature
              ? Math.max(fontSize * 0.45, (viewW / 240) * fontSize * (tok.scale || 1))
              : Math.max(fontSize * 0.18, (viewW / 240) * fontSize * (tok.scale || 1));

            return (
              <span
                key={`tok-${tokIdx}`}
                className="inline-block relative select-none"
                style={{
                  width: `${tokenWidth}px`,
                  height: `${fontSize}px`,
                  marginRight: spacingStyle,
                  transform: `translateY(${totalY}px) rotate(${rotationDeg}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: 10 + tokIdx,
                }}
              >
                <svg
                  viewBox={`${viewMinX} 0 ${viewW} 320`}
                  className="w-full h-full overflow-visible"
                  style={{
                    color: inkStyles[ink].color,
                    filter: inkStyles[ink].shadow !== 'none' ? `drop-shadow(${inkStyles[ink].shadow})` : undefined,
                  }}
                >
                  {tok.strokes.map((stroke, sIdx) => {
                    if (stroke.length === 0) return null;
                    if (stroke.length === 1) {
                      return (
                        <circle
                          key={sIdx}
                          cx={stroke[0].x}
                          cy={stroke[0].y}
                          r={4}
                          fill="currentColor"
                        />
                      );
                    }
                    const d = stroke.reduce((acc, pt, idx) => {
                      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                    }, '');
                    return (
                      <path
                        key={sIdx}
                        d={d}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={10 * tok.scale}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}
                </svg>
              </span>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto py-4">
      {/* Panneau latéral de contrôle du simulateur */}
      <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white">Réglages du Simulateur</h3>
        </div>

        {/* SECTION 1 : LIAISON CURSIVE CONTINUE */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-sky-950/30 to-slate-900 border border-emerald-500/30 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Link className="w-4 h-4 text-emerald-400" />
              Liaison Cursive Continue
            </span>
            <button
              onClick={() => applyPreset('cursive_school')}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/30 transition-all cursor-pointer"
            >
              Preset Écolier
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Rapproche les lettres pour que la queue de sortie vienne recouvrir l'amorce de la suivante sans blanc.
          </p>

          {/* Rapprochement / Overlap slider */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-300 font-medium">Recouvrement des liaisons</span>
              <span className="font-mono text-emerald-400 font-bold">{letterSpacing}px</span>
            </div>
            <input
              type="range"
              min={-20}
              max={15}
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <span>Attaché serré (-20px)</span>
              <span>Détaché (+15px)</span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Ligatures actives :</span>
            <span className="font-bold text-emerald-400 font-mono">
              {readyLigatures.length} prête{readyLigatures.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* SECTION 2 : LIGNE NON HORIZONTALE & DÉRIVE ORGANIQUE */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-sky-950/30 to-slate-900 border border-indigo-500/30 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-sky-400" />
              Dérive naturelle & Ligne libre
            </span>
          </div>

          {/* Boutons de pré-réglages rapides */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => applyPreset('subtle')}
              className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-[11px] font-bold text-sky-300 transition-all text-center cursor-pointer"
            >
              ✍️ Naturel léger
            </button>
            <button
              onClick={() => applyPreset('lively')}
              className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-[11px] font-bold text-indigo-300 transition-all text-center cursor-pointer"
            >
              🌊 Manuscrit vif
            </button>
            <button
              onClick={() => applyPreset('downward')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-300 transition-all text-center cursor-pointer"
            >
              📉 Descendant
            </button>
            <button
              onClick={() => applyPreset('straight')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-300 transition-all text-center cursor-pointer"
            >
              📏 Droit machine
            </button>
          </div>

          {/* Curseurs de réglage fin de la dérive */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            {/* Pente de la phrase */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Pente de la phrase (Montée / Descente)</span>
                <span className="font-mono text-sky-400 font-bold">{slope > 0 ? `+${slope}°` : `${slope}°`}</span>
              </div>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.5}
                value={slope}
                onChange={(e) => setSlope(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Ondulation / Flottement de la phrase */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Ondulation de la ligne (Vague)</span>
                <span className="font-mono text-sky-400 font-bold">{Math.round(baselineWave * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={baselineWave}
                onChange={(e) => setBaselineWave(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Micro-inclinaison poignet */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Micro-inclinaison du poignet</span>
                <span className="font-mono text-sky-400 font-bold">±{letterRotation}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={0.5}
                value={letterRotation}
                onChange={(e) => setLetterRotation(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Jitter */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Irrégularité & Tremblement</span>
                <span className="font-mono text-sky-400 font-bold">{Math.round(jitter * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={jitter}
                onChange={(e) => setJitter(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3 : STYLE DE PAPIER ET ENCRE */}
        <div className="space-y-4 pt-1">
          {/* Choix de l'encre */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-sky-400" /> Couleur d'encre
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(inkStyles) as InkColor[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setInk(key)}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    ink === key
                      ? 'bg-slate-800 border-sky-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: inkStyles[key].color }}
                  />
                  <span className="truncate">{inkStyles[key].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Choix du papier */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" /> Style de papier
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'seyes', label: 'Cahier Seyès' },
                { id: 'lines', label: 'Ligné simple' },
                { id: 'parchment', label: 'Parchemin' },
                { id: 'blank', label: 'Blanc pur' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPaper(p.id as PaperType)}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    paper === p.id
                      ? 'bg-slate-800 border-sky-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Taille de police */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Taille de l'écriture</span>
              <span className="font-mono text-sky-400 font-bold">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={20}
              max={64}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Surface principale : Rendu réaliste sur feuille */}
      <div className="flex-1 space-y-4">
        {/* Barre de textes d'exemples */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <BookOpen className="w-3.5 h-3.5" /> Exemples :
          </span>
          {SAMPLE_TEXTS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => setText(sample.text)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 shrink-0 transition-all cursor-pointer"
            >
              {sample.title}
            </button>
          ))}
        </div>

        {/* Zone d'écriture réaliste */}
        <div
          className={`min-h-[500px] p-8 sm:p-12 rounded-3xl border shadow-2xl transition-all relative overflow-hidden ${getPaperClasses()}`}
          style={{
            backgroundImage:
              paper === 'seyes'
                ? `linear-gradient(#e0e7ff 1px, transparent 1px), linear-gradient(90deg, transparent 79px, #fca5a5 80px, transparent 81px)`
                : paper === 'lines'
                ? `linear-gradient(#fde68a 1px, transparent 1px)`
                : undefined,
            backgroundSize:
              paper === 'seyes'
                ? '100% 32px, 100% 100%'
                : paper === 'lines'
                ? '100% 36px'
                : undefined,
          }}
        >
          {/* Marge rouge écolier sur Seyès */}
          {paper === 'seyes' && (
            <div className="absolute top-0 bottom-0 left-20 w-[1px] bg-rose-300 pointer-events-none" />
          )}

          {/* Rendu des lettres et liaisons */}
          <div className="relative z-10">{renderSimulatedText()}</div>
        </div>

        {/* Zone de texte libre modifiable */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
          <label className="text-xs font-bold text-slate-400 block">
            Tapez votre propre texte à tester :
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Tapez ici pour voir vos liaisons cursives et l'ondulation naturelle en action..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none font-sans"
          />
        </div>
      </div>
    </div>
  );
};
