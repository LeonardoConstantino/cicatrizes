import React, { useState, useEffect } from 'react';
import { Target, Zap, Shield, ArrowDown, Activity, Sparkles, X } from 'lucide-react';

interface Props {
  worldId: string;
  worldName: string;
  cycleNumber: number;
  inheritedScarId?: string | null;
}

interface WorldGuide {
  title: string;
  icon: React.ReactNode;
  themeColor: string;
  controls: Array<{ keys: string[]; label: string }>;
  objective: string;
}

const WORLD_GUIDES: Record<string, WorldGuide> = {
  IMPACTO: {
    title: 'MUNDO I — IMPACTO (Shooter Top-Down)',
    icon: <Target className="w-4 h-4 text-cyan-400" />,
    themeColor: '#06b6d4',
    controls: [
      { keys: ['W', 'A', 'S', 'D'], label: 'Navegar Arena' },
      { keys: ['Mouse', 'Espaço'], label: 'Mirar e Disparar' },
    ],
    objective: 'Elimine anomalias para acumular combo e elevar a atenção do Curador.',
  },
  RITMO: {
    title: 'MUNDO II — RITMO (Platformer Rítmico 128 BPM)',
    icon: <Activity className="w-4 h-4 text-emerald-400" />,
    themeColor: '#10b981',
    controls: [
      { keys: ['W', 'Espaço', '↑'], label: 'Pular' },
      { keys: ['Clique', 'Shift'], label: 'Parry no Tempo da Batida' },
    ],
    objective: 'Sincronize seus saltos e golpes no metrônomo para quebrar obstáculos.',
  },
  QUEDA: {
    title: 'MUNDO III — QUEDA (Mergulho no Vazio)',
    icon: <ArrowDown className="w-4 h-4 text-amber-400" />,
    themeColor: '#f59e0b',
    controls: [
      { keys: ['A', 'D', 'Mouse'], label: 'Manobra Lateral Ágil' },
      { keys: ['W', 'Espaço', 'Clique'], label: 'Freio Aerodinâmico (RCS)' },
      { keys: ['S', '↓'], label: 'Mergulho de Ruptura (Dive)' },
    ],
    objective: 'Freie para alinhar com as fendas ou mergulhe veloz para estilhaçar vigas frágeis.',
  },
  FOME: {
    title: 'MUNDO IV — FOME (Arena Melee Slasher)',
    icon: <Zap className="w-4 h-4 text-orange-400" />,
    themeColor: '#f97316',
    controls: [
      { keys: ['W', 'A', 'S', 'D'], label: 'Cortejar Alvos' },
      { keys: ['Clique', 'Espaço'], label: 'Arco de Lâmina Melee' },
    ],
    objective: 'A fome drena sua Identidade; corte inimigos e devore fragmentos caídos para se saciar.',
  },
  SILENCIO: {
    title: 'MUNDO V — SILÊNCIO (Bullet-Hell Cego & Ecolocalização)',
    icon: <Shield className="w-4 h-4 text-slate-300" />,
    themeColor: '#38bdf8',
    controls: [
      { keys: ['W', 'A', 'S', 'D'], label: 'Manobra Cega' },
      { keys: ['Botão Dir.', 'E'], label: 'Pulso de Sonar' },
      { keys: ['Espaço', 'Shift'], label: 'Dash de Fase (Graze)' },
    ],
    objective: 'O vácuo é escuro; emita pulsos de sonar para revelar feixes e sentinelas invisíveis.',
  },
  ESPELHO: {
    title: 'MUNDO VI — ESPELHO (Duelo contra o Próprio Reflexo)',
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    themeColor: '#a855f7',
    controls: [
      { keys: ['W', 'A', 'S', 'D'], label: 'Duelo Simétrico' },
      { keys: ['Clique', 'Espaço'], label: 'Golpe de Contracorrente' },
    ],
    objective: 'A Sombra copia todos os seus movimentos e golpes com 1.1s de atraso. Vença a si mesmo!',
  },
};

export const WorldControlsCard: React.FC<Props> = ({
  worldId,
  worldName,
  cycleNumber,
  inheritedScarId,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Re-trigger banner visibility whenever worldId changes
  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [worldId]);

  if (!isVisible) return null;

  const guide = WORLD_GUIDES[worldId] || WORLD_GUIDES['IMPACTO'];

  return (
    <aside
      aria-label="Controles rápidos do mundo"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300 select-none"
    >
      <div
        className="relative bg-slate-950/92 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex flex-col gap-2.5 font-sans text-slate-200"
        style={{ borderColor: `${guide.themeColor}50` }}
      >
        {/* Header with Title and Cycle Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center border"
              style={{ backgroundColor: `${guide.themeColor}15`, borderColor: `${guide.themeColor}40` }}
            >
              {guide.icon}
            </div>
            <span className="text-xs font-mono font-bold tracking-wide text-white">
              {guide.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cycleNumber > 1 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                CICLO {cycleNumber} (+{Math.round((cycleNumber - 1) * 15)}% VEL)
              </span>
            )}
            {inheritedScarId && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                HERANÇA: {inheritedScarId}
              </span>
            )}
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Fechar dica rápida"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Controls Layout */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {guide.controls.map((ctrl, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg font-mono text-[11px]"
            >
              <div className="flex items-center gap-1">
                {ctrl.keys.map((k, ki) => (
                  <span
                    key={ki}
                    className="bg-slate-800 text-white font-bold px-1.5 py-0.5 rounded border border-slate-600/80 text-[10px]"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <span className="text-slate-300 font-sans text-xs">{ctrl.label}</span>
            </div>
          ))}
        </div>

        {/* Objective Snippet */}
        <p className="text-[11px] text-slate-400 font-sans italic leading-relaxed">
          ✦ {guide.objective}
        </p>
      </div>
    </aside>
  );
};
