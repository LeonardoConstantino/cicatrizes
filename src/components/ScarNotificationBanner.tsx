import React from 'react';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';

interface Props {
  isVisible: boolean;
  scarId?: string;
  sourceWorldName?: string;
  destinationWorldName?: string;
  phase?: string;
}

export const ScarNotificationBanner: React.FC<Props> = ({
  isVisible,
  scarId,
  sourceWorldName,
  destinationWorldName,
  phase = 'disturbance',
}) => {
  if (!isVisible || !scarId) return null;

  const def = SCAR_DEFINITIONS[scarId];
  if (!def) return null;

  const isRare = def.rarity === 'rare';

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between select-none animate-in fade-in duration-200">
      
      {/* Top Cinematic Letterbox Bar */}
      <div className="w-full h-16 bg-gradient-to-b from-black via-black/90 to-transparent border-b border-rose-500/20 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[11px] font-mono tracking-widest text-rose-400 font-bold uppercase">
            MUTAÇÃO DE MUNDO · FASE: [{phase.toUpperCase()}]
          </span>
        </div>
        {sourceWorldName && destinationWorldName && (
          <span className="text-[11px] font-mono text-slate-400">
            {sourceWorldName} <span className="text-amber-400 font-bold">➔</span> {destinationWorldName}
          </span>
        )}
      </div>

      {/* Central Dramatic Scar Announcement Card */}
      <div className="flex flex-col items-center justify-center px-4 -mt-10">
        <div className="relative max-w-xl w-full text-center p-8 rounded-2xl bg-black/85 backdrop-blur-xl border border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-250">
          
          {/* Subtle Accent Glow based on Scar Color */}
          <div
            className="absolute inset-0 rounded-2xl opacity-20 blur-xl pointer-events-none transition-all"
            style={{ backgroundColor: def.color }}
          />

          {/* Rarity & Header */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span
              style={{ backgroundColor: def.color }}
              className="w-2.5 h-2.5 rounded-full animate-pulse"
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              {isRare ? '⚡ CICATRIZ RARA (COMBINAÇÃO)' : 'CICATRIZ COMPORTAMENTAL HERDADA'}
            </span>
          </div>

          {/* Big Scar Name */}
          <h1
            style={{ color: def.color, textShadow: `0 0 25px ${def.color}80` }}
            className="text-4xl md:text-5xl font-mono font-black tracking-wider uppercase mb-3"
          >
            {def.name}
          </h1>

          {/* The Judgment / Narrative Quote */}
          <p className="text-lg md:text-xl font-serif italic text-amber-200/90 mb-4 tracking-wide">
            “{def.narrative}”
          </p>

          {/* Gameplay Consequence Description */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 mx-auto max-w-md">
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              {def.description}
            </p>
          </div>

          {/* Warning Kicker */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              O CURADOR INCORPOROU SEU HÁBITO NA FÍSICA DO PRÓXIMO MUNDO
            </span>
          </div>

        </div>
      </div>

      {/* Bottom Cinematic Letterbox Bar */}
      <div className="w-full h-16 bg-gradient-to-t from-black via-black/90 to-transparent border-t border-rose-500/20 flex items-center justify-center px-8">
        <span className="text-[10px] font-mono text-slate-500 tracking-widest animate-pulse">
          DESCONSTRUÇÃO GEOMÉTRICA EM CURSO · ADAPTE SEUS REFLEXOS
        </span>
      </div>

    </div>
  );
};
