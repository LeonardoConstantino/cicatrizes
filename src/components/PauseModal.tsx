import React, { useState } from 'react';
import { Play, RotateCcw, Home, Settings, Share2, Check, ShieldAlert } from 'lucide-react';
import { shareGame } from '../utils/shareUtils';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';

interface Props {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onOpenSettings: () => void;
  activeWorldName: string;
  activeScars: string[];
  currentScore: number;
  currentCombo: number;
  cycleNumber: number;
}

export const PauseModal: React.FC<Props> = ({
  isOpen,
  onResume,
  onRestart,
  onReturnToTitle,
  onOpenSettings,
  activeWorldName,
  activeScars,
  currentScore,
  currentCombo,
  cycleNumber,
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    const res = await shareGame(
      `Sobrevivendo ao ${activeWorldName} no CICATRIZ com ${currentScore.toLocaleString()} pontos! Venha desafiar o Curador:`
    );
    if (res.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
        
        {/* Top Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-400 font-mono text-lg animate-pulse">
            ◉
          </div>
          <h2 className="text-xl font-bold tracking-widest text-white uppercase font-mono">
            PARTIDA EM PAUSA
          </h2>
          <p className="text-xs font-mono text-amber-400">
            {activeWorldName} {cycleNumber > 1 && `· Ciclo ${cycleNumber} (NG+)`}
          </p>
        </div>

        {/* Current Run Snapshot */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Score Atual</span>
            <span className="text-lg font-mono font-bold text-white tabular-nums">
              {currentScore.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Combo</span>
            <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">
              x{currentCombo}
            </span>
          </div>
        </div>

        {/* Active Scars in this cycle */}
        {activeScars.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Cicatrizes Ativas ({activeScars.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeScars.map((scarId, idx) => {
                const def = SCAR_DEFINITIONS[scarId];
                return (
                  <span
                    key={`${scarId}_${idx}`}
                    style={{ borderColor: def?.color || '#94a3b8' }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-200 border flex items-center gap-1"
                  >
                    <span style={{ backgroundColor: def?.color || '#94a3b8' }} className="w-1.5 h-1.5 rounded-full" />
                    {def?.name || scarId}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {/* Resume */}
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_26px_rgba(245,158,11,0.4)]"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Retomar Partida [ESC / P]
          </button>

          {/* Quick Settings & Share row */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onOpenSettings}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              Opções
            </button>

            <button
              onClick={handleShare}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
              {copied ? 'Copiado!' : 'Compartilhar'}
            </button>
          </div>

          {/* Restart */}
          <button
            onClick={onRestart}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reiniciar Ciclo
          </button>

          {/* Return to Title */}
          {!confirmQuit ? (
            <button
              onClick={() => setConfirmQuit(true)}
              className="w-full py-2 px-3 text-[11px] font-mono text-slate-500 hover:text-rose-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              Desistir e Voltar ao Menu
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2 text-center animate-in fade-in duration-150">
              <span className="text-[11px] font-mono text-rose-300 block flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Confirmar desistência da run atual?
              </span>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setConfirmQuit(false)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={onReturnToTitle}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs font-mono text-white font-bold"
                >
                  Sim, Desistir
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
