import React from 'react';
import { BehaviorTraits, PlayerSignature } from '../player/BehaviorProfile';
import { X, Activity, Compass, Cpu } from 'lucide-react';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  traits: BehaviorTraits;
  signature: PlayerSignature;
  stimulusComponents: {
    mastery: number;
    consistency: number;
    repetition: number;
    confidence: number;
  };
  stimulusLevel: number;
  mutationThreshold: number;
  predictedScarId: string;
}

export const CuratorSpectatorPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  traits,
  signature,
  stimulusComponents,
  stimulusLevel,
  mutationThreshold,
  predictedScarId,
}) => {
  if (!isOpen) return null;

  const predictedScar = SCAR_DEFINITIONS[predictedScarId];

  const traitLabels: Array<{ key: keyof BehaviorTraits; label: string; color: string }> = [
    { key: 'aggression', label: 'Agressão', color: 'bg-rose-500' },
    { key: 'risk', label: 'Risco', color: 'bg-amber-500' },
    { key: 'evasion', label: 'Evasão', color: 'bg-cyan-500' },
    { key: 'repetition', label: 'Repetição', color: 'bg-purple-500' },
    { key: 'rhythm', label: 'Ritmo', color: 'bg-emerald-500' },
    { key: 'precision', label: 'Precisão', color: 'bg-pink-500' },
    { key: 'hesitation', label: 'Hesitação', color: 'bg-indigo-500' },
  ];

  return (
    <div className="absolute top-16 right-6 z-40 w-80 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl p-4 text-xs font-sans text-slate-300 backdrop-blur-md animate-in slide-in-from-right-4 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-white tracking-wide">
            Análise do Curador (Espectador)
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Signature Lockup */}
      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 mb-3">
        <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">
          Assinatura Comportamental
        </span>
        <span className="text-sm font-bold text-amber-400 block mt-0.5">
          {signature.name}
        </span>
        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
          {signature.description}
        </p>
      </div>

      {/* 7 Traits Bar breakdown */}
      <div className="space-y-2 mb-4">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
          Perfil em Tempo Real (Média Móvel EMA)
        </span>
        {traitLabels.map(({ key, label, color }) => {
          const val = traits[key];
          return (
            <div key={key} className="space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">{label}</span>
                <span className="font-mono text-slate-400">{(val * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-200`}
                  style={{ width: `${Math.min(100, val * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stimulus 4-Component Decomposition */}
      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Fórmula de Estimulação
          </span>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {(stimulusLevel * 100).toFixed(1)}% <span className="text-slate-500">/ {(mutationThreshold * 100).toFixed(0)}%</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
          <div>Maestria: <span className="text-slate-200">{(stimulusComponents.mastery * 100).toFixed(0)}%</span></div>
          <div>Consistência: <span className="text-slate-200">{(stimulusComponents.consistency * 100).toFixed(0)}%</span></div>
          <div>Repetição: <span className="text-slate-200">{(stimulusComponents.repetition * 100).toFixed(0)}%</span></div>
          <div>Confiança: <span className="text-slate-200">{(stimulusComponents.confidence * 100).toFixed(0)}%</span></div>
        </div>
      </div>

      {/* Next Mutation Prediction */}
      <div className="border border-amber-500/20 bg-amber-500/5 p-2.5 rounded-lg flex items-center gap-2.5">
        <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="text-[11px] leading-tight">
          <span className="text-slate-400 block">Cicatriz mais provável:</span>
          <span className="text-amber-300 font-semibold font-mono">
            {predictedScar ? `${predictedScar.name} (${predictedScar.rarity})` : 'Avaliando...'}
          </span>
        </div>
      </div>

    </div>
  );
};
