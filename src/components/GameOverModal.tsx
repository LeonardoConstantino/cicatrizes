import React from 'react';
import { PlayerSignature } from '../player/BehaviorProfile';
import { RotateCcw, Home, Share2 } from 'lucide-react';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';
import { shareGame } from '../utils/shareUtils';

interface Props {
  isOpen: boolean;
  score: number;
  runNumber: number;
  curatorMessage: string;
  signature: PlayerSignature;
  accumulatedScars: string[];
  onRestart: () => void;
  onReturnToTitle?: () => void;
}

export const GameOverModal: React.FC<Props> = ({
  isOpen,
  score,
  runNumber,
  curatorMessage,
  signature,
  accumulatedScars,
  onRestart,
  onReturnToTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg p-6 animate-in fade-in duration-300">
      <div className="max-w-lg w-full text-center space-y-6 font-sans">
        
        {/* Iconic Curator Symbol */}
        <div className="inline-block text-4xl text-rose-500 animate-pulse">
          ◉
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-mono text-white tracking-widest uppercase">
            THE CURATOR LOST YOU.
          </h2>
          <p className="text-sm font-serif italic text-slate-400">
            &quot;{curatorMessage}&quot;
          </p>
        </div>

        {/* Stats card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 text-left">
          <div className="flex justify-between items-center text-xs font-mono border-b border-slate-800 pb-2">
            <span className="text-slate-400">Sessão / Run</span>
            <span className="text-white font-bold">#{runNumber}</span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono border-b border-slate-800 pb-2">
            <span className="text-slate-400">Pontuação Final</span>
            <span className="text-amber-400 font-bold text-base tabular-nums">
              {score.toString().padStart(6, '0')}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono border-b border-slate-800 pb-2">
            <span className="text-slate-400">Assinatura Registrada</span>
            <span className="text-cyan-400 font-bold">{signature.name}</span>
          </div>

          {accumulatedScars.length > 0 && (
            <div className="pt-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">
                Cicatrizes Herdadas Esta Sessão:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {accumulatedScars.map((scarId, idx) => {
                  const def = SCAR_DEFINITIONS[scarId];
                  return (
                    <span
                      key={`game-over-scar-${scarId}-${idx}`}
                      style={{ borderColor: def?.color || '#94a3b8' }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-200 border"
                    >
                      {def?.name || scarId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRestart}
            className="w-full py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold tracking-wide text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Ciclo (Próxima Tentativa)
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                await shareGame(`Minha Identidade colapsou no CICATRIZ com ${score.toLocaleString()} pontos como "${signature.name}"! Venha tentar sobreviver:`);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700/80"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              Compartilhar Run
            </button>

            {onReturnToTitle && (
              <button
                onClick={onReturnToTitle}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700/80"
              >
                <Home className="w-3.5 h-3.5 text-slate-400" />
                Menu Principal
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
