import React from 'react';
import { PlayerSignature, BehaviorTraits } from '../player/BehaviorProfile';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';
import { GhostStorage, GhostData } from '../meta/BehavioralGhosts';
import { Trophy, RotateCcw, BookOpen, Sparkles, Check, Share2 } from 'lucide-react';
import { shareGame } from '../utils/shareUtils';

interface Props {
  isOpen: boolean;
  score: number;
  runNumber: number;
  signature: PlayerSignature;
  traits: BehaviorTraits;
  scars: string[];
  onRestartCycle: (inheritedScarId?: string) => void;
  onOpenMuseum: () => void;
}

export const VictoryModal: React.FC<Props> = ({
  isOpen,
  score,
  runNumber,
  signature,
  traits,
  scars,
  onRestartCycle,
  onOpenMuseum,
}) => {
  const [savedGhost, setSavedGhost] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [selectedInheritedScar, setSelectedInheritedScar] = React.useState<string>(
    scars[0] || 'ESPELHO'
  );

  React.useEffect(() => {
    if (scars.length > 0) {
      setSelectedInheritedScar(scars[0]);
    }
  }, [scars]);

  if (!isOpen) return null;

  const handleSaveChampionGhost = () => {
    const championGhost: GhostData = {
      id: `champion_run_${runNumber}_${Date.now()}`,
      name: `🏆 Campeão do Ciclo (Run #${runNumber})`,
      signature,
      traits: { ...traits },
      dominantScar: scars[scars.length - 1] || 'ESPELHO',
      color: '#eab308',
      description: `Venceu o Ciclo Completo com ${score.toLocaleString()} pts como ${signature.name}.`,
      isCustomRecording: true,
      score,
      runNumber,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    GhostStorage.savePersonalGhost(championGhost);
    setSavedGhost(true);
  };

  const handleShareVictory = async () => {
    const text = `🏆 Concluí o Ciclo de CICATRIZ! Pontuação: ${score.toLocaleString()} pts como [${signature.name}]. Cicatrizes herdadas: ${scars.join(', ')}. Desafie o Curador em:`;
    const res = await shareGame(text);
    if (res.success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="relative max-w-2xl w-full bg-slate-950 border border-amber-500/40 rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col max-h-[90vh] overflow-hidden text-slate-200 font-sans">
        
        {/* Glow Header */}
        <div className="relative px-8 pt-8 pb-6 border-b border-amber-500/20 bg-gradient-to-b from-amber-950/40 to-transparent flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
            <Trophy className="w-7 h-7" />
          </div>

          <span className="text-[11px] font-mono tracking-widest text-amber-400 font-bold uppercase mb-1">
            CICLO CONSUMADO · TRANSCENDÊNCIA
          </span>
          <h1 className="text-2xl md:text-3xl font-mono font-black text-white tracking-wide">
            VOCÊ SUPEROU SEU PRÓPRIO REFLEXO
          </h1>
          <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
            A Sombra caiu no Mundo VI. Você não apenas dominou os mundos anteriores: você sobreviveu aos hábitos que deixou para trás.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1">
          
          {/* Score & Profile Banner */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
              <span className="text-[10px] font-mono text-slate-500 tracking-wider">PONTUAÇÃO FINAL</span>
              <span className="text-3xl font-mono font-bold text-amber-300 tracking-tight mt-0.5">
                {score.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-1">Run #{runNumber}</span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono text-slate-500 tracking-wider">ARQUÉTIPO VITORIOSO</span>
              <span className="text-lg font-bold text-white mt-0.5">
                {signature.name}
              </span>
              <span className="text-[10px] font-mono text-amber-400/90 mt-1 line-clamp-1">
                {signature.dominantTraits.join(' · ')}
              </span>
            </div>
          </div>

          {/* Scars Mosaic */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Mosaico de Cicatrizes ({scars.length}) — Clique para Herdar no Ciclo II
              </span>
              <span className="text-[10px] font-mono text-amber-400">
                Herdando: {SCAR_DEFINITIONS[selectedInheritedScar]?.name || selectedInheritedScar}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {scars.map((scarId) => {
                const def = SCAR_DEFINITIONS[scarId];
                if (!def) return null;
                const isSelected = selectedInheritedScar === scarId;

                return (
                  <div
                    key={scarId}
                    onClick={() => setSelectedInheritedScar(scarId)}
                    className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: def.color }}
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          {def.name}
                          {isSelected && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                              HERDADA
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">
                          {def.rarity === 'rare' ? 'Rara' : 'Comum'}
                        </span>
                      </div>
                      <p className="text-[11px] font-serif italic text-amber-200/80 mt-0.5 truncate">
                        “{def.narrative}”
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Curator's Epilogue Verdict */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-center">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block mb-1">
              EPÍLOGO DO CURADOR
            </span>
            <p className="text-sm font-serif italic text-amber-100/90 leading-relaxed">
              “Você desfez o espelho. As cicatrizes que você acumulou não foram correntes, mas degraus. O Arquivo gravou sua vitória no cérebro da máquina.”
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveChampionGhost}
              disabled={savedGhost}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold font-mono transition-all ${
                savedGhost
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
              }`}
            >
              {savedGhost ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {savedGhost ? 'Fantasma Campeão Salvo!' : 'Salvar Fantasma Campeão'}
            </button>

            <button
              onClick={handleShareVictory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              title="Copiar texto de vitória"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copiado!' : 'Compartilhar'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenMuseum}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Museu
            </button>

            <button
              onClick={() => onRestartCycle(selectedInheritedScar)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Iniciar Ciclo II (NG+) · Herdar {SCAR_DEFINITIONS[selectedInheritedScar]?.name || selectedInheritedScar}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
