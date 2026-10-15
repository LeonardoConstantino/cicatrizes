import React from 'react';
import { CuratorMemory, RunHistoryEntry } from '../curator/CuratorMemory';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';
import { Trophy, Flame, Clock, Award, X, RotateCcw, Hash, Crown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  curatorMemory: CuratorMemory;
}

export const RunHistoryModal: React.FC<Props> = ({ isOpen, onClose, curatorMemory }) => {
  const [history, setHistory] = React.useState<RunHistoryEntry[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setHistory(curatorMemory.getHistory());
    }
  }, [isOpen, curatorMemory]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bestScore = curatorMemory.getBestScore();
  const totalRuns = curatorMemory.getRunCount();
  const maxCycle = curatorMemory.getMaxCycle();
  const topArchetype = curatorMemory.getMostFrequentArchetype();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                Hall das Cinzas · Histórico de Runs
              </h2>
              <p className="text-xs text-slate-400">
                O arquivo permanente de todas as suas tentativas, cicatrizes e transcendências.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Fechar (Esc)
          </button>
        </div>

        {/* Global Statistics Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-3.5 flex flex-col">
            <span className="text-[10px] font-mono text-amber-400/80 uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> Recorde Histórico
            </span>
            <span className="text-xl font-mono font-bold text-amber-300 mt-1">
              {bestScore.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Pontuação máxima</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col">
            <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3 h-3 text-cyan-400" /> Runs Registradas
            </span>
            <span className="text-xl font-mono font-bold text-white mt-1">
              {totalRuns}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Ciclos catalogados</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col">
            <span className="text-[10px] font-mono text-purple-400/80 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-purple-400" /> Ciclo Máximo
            </span>
            <span className="text-xl font-mono font-bold text-purple-300 mt-1">
              Ciclo {maxCycle} {maxCycle > 1 ? '(NG+)' : ''}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Profundidade alcançada</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col">
            <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3 text-emerald-400" /> Arquétipo Frequente
            </span>
            <span className="text-sm font-semibold text-white mt-1 truncate" title={topArchetype}>
              {topArchetype}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Assinatura comportamental</span>
          </div>
        </div>

        {/* History Runs List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Últimas Gravações ({history.length})
            </span>
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Deseja limpar o histórico das cinzas?')) {
                    curatorMemory.clearHistory();
                    setHistory([]);
                  }
                }}
                className="text-[10px] font-mono text-slate-500 hover:text-rose-400 transition-colors"
              >
                Limpar Histórico
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center">
              <Clock className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm">Nenhuma run arquivada ainda.</p>
              <p className="text-xs text-slate-600 mt-1">
                Jogue uma partida para que o Curador comece a registrar suas cinzas.
              </p>
            </div>
          ) : (
            history.map((run) => {
              const isBest = run.score === bestScore && bestScore > 0;

              return (
                <div
                  key={run.runNumber}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isBest
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-mono shrink-0 border ${
                        isBest
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="text-[9px] text-slate-400">RUN</span>
                      <span className="text-xs font-bold leading-none">#{run.runNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-wide">
                          {run.signatureName}
                        </span>
                        {run.cycleNumber > 1 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/60">
                            Ciclo {run.cycleNumber} (NG+)
                          </span>
                        )}
                        {isBest && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 font-semibold">
                            <Crown className="w-2.5 h-2.5" /> RECORDE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="font-mono text-[11px] text-slate-500">{run.date}</span>
                        <span>·</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {run.scars.length === 0 ? (
                            <span className="text-[11px] text-slate-500 italic">Sem cicatrizes</span>
                          ) : (
                            run.scars.map((sId) => {
                              const sDef = SCAR_DEFINITIONS[sId];
                              return (
                                <span
                                  key={sId}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700"
                                  style={{ borderColor: sDef?.color ? `${sDef.color}50` : undefined }}
                                >
                                  {sDef?.name || sId}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">
                        Pontuação Final
                      </span>
                      <span
                        className={`text-lg font-mono font-bold ${
                          isBest ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        {run.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
