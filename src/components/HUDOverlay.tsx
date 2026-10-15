import React, { useEffect, useState } from 'react';
import { PlaytestConfig, playtestConfigManager } from '../config/playtestConfig';
import { Sliders, Eye, BookOpen, Volume2, VolumeX, Home, Pause } from 'lucide-react';
import { PlayerState } from '../worlds/World';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';
import { eventBus } from '../core/EventBus';

interface Props {
  player: PlayerState;
  stimulusLevel: number;
  activeWorldName: string;
  activeScars: string[];
  isTransitioning: boolean;
  transitionPhase: string;
  timeUntilEligibleSec: number;
  onOpenCalibration: () => void;
  onToggleSpectator: () => void;
  onOpenMuseum: () => void;
  onToggleAudio: () => void;
  onReturnToTitle: () => void;
  onTogglePause?: () => void;
  isAudioMuted: boolean;
  spectatorOpen: boolean;
  cycleNumber?: number;
  isLabUnlocked?: boolean;
}

export const HUDOverlay: React.FC<Props> = ({
  player,
  stimulusLevel,
  activeWorldName,
  activeScars,
  isTransitioning,
  transitionPhase,
  timeUntilEligibleSec,
  onOpenCalibration,
  onToggleSpectator,
  onOpenMuseum,
  onToggleAudio,
  onReturnToTitle,
  onTogglePause,
  isAudioMuted,
  spectatorOpen,
  cycleNumber = 1,
  isLabUnlocked = false,
}) => {
  const [config, setConfig] = useState<PlaytestConfig>(playtestConfigManager.get());
  const [dramaticReturnActive, setDramaticReturnActive] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Local reactive score and combo states with pulse animation
  const [localScore, setLocalScore] = useState(player.score);
  const [localCombo, setLocalCombo] = useState(player.combo);
  const [scorePulse, setScorePulse] = useState(false);
  const [comboPulse, setComboPulse] = useState(false);

  useEffect(() => {
    return playtestConfigManager.subscribe(setConfig);
  }, []);

  useEffect(() => {
    setLocalScore(player.score);
  }, [player.score]);

  useEffect(() => {
    setLocalCombo(player.combo);
  }, [player.combo]);

  // Subscribe directly to eventBus for immediate instantaneous feedback
  useEffect(() => {
    const unsub = eventBus.on('score:update', ({ score, combo }) => {
      setLocalScore(score);
      setLocalCombo(combo);
      setScorePulse(true);
      setTimeout(() => setScorePulse(false), 180);
      if (combo > 0) {
        setComboPulse(true);
        setTimeout(() => setComboPulse(false), 180);
      }
    });
    return unsub;
  }, []);

  // Check for dramatic sudden return trigger on combo milestones
  useEffect(() => {
    if (localCombo > 0 && localCombo % 10 === 0) {
      setDramaticReturnActive(true);
      const timer = setTimeout(() => {
        setDramaticReturnActive(false);
      }, config.hud.dramaticReturnDurationMs || 3000);
      return () => clearTimeout(timer);
    }
  }, [localCombo, config.hud.dramaticReturnDurationMs]);

  const hasSilencioScar = activeScars.includes('SILENCIO');
  const hasPulsoScar = activeScars.includes('PULSO');
  const dissolutionMultiplier = config.hud.dissolutionSpeedMultiplier * (hasSilencioScar ? 1.5 : 1.0);

  // Dissolution thresholds only apply when SILENCIO scar is active (as per GDD design)
  // When PULSO is active, HUD is completely extinguished, replaced by audible heartbeat
  const effectiveStimulus = Math.min(1.0, stimulusLevel * dissolutionMultiplier);

  const hpVisible = !hasPulsoScar && (!hasSilencioScar || dramaticReturnActive || effectiveStimulus < config.hud.hpFadeThreshold);
  const comboVisible = !hasPulsoScar && (!hasSilencioScar || dramaticReturnActive || effectiveStimulus < config.hud.comboFadeThreshold);
  const scoreVisible = !hasPulsoScar && (!hasSilencioScar || dramaticReturnActive || effectiveStimulus < config.hud.scoreFadeThreshold);
  const isMinimalSymbolOnly = (hasSilencioScar || hasPulsoScar) && !dramaticReturnActive && (hasPulsoScar || effectiveStimulus >= config.hud.fullMinimalSymbolThreshold);

  // Identity fragments: 10 segments
  const totalSegments = 10;
  const activeSegments = Math.ceil((player.identity / player.maxIdentity) * totalSegments);

  // Upcoming mutation indicator: show ◉ if eligible or stimulus > warningThreshold
  const showCuratorSymbol = stimulusLevel >= config.stimulus.warningThreshold || timeUntilEligibleSec <= 2;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-6 select-none font-sans">
      
      {/* Top Header Row */}
      <div className="flex items-start justify-between w-full">
        
        {/* Left: Score & World & Identity */}
        <div className="flex flex-col gap-2">
          {/* World Name Kicker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-amber-400 tracking-wider">
              {activeWorldName}
            </span>
            {cycleNumber > 1 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                CICLO {cycleNumber} (NG+)
              </span>
            )}
            {isTransitioning && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                MUTANDO [{transitionPhase.toUpperCase()}]
              </span>
            )}
          </div>

          {/* Dramatic Return Callout */}
          {dramaticReturnActive ? (
            <div className="font-mono text-amber-300 font-bold tracking-widest text-lg animate-pulse">
              SCORE ∞ · COMBO ? · SCAR YOU
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {/* Score */}
              <div
                className={`transition-opacity duration-300 ${scoreVisible ? 'opacity-100' : 'opacity-0'}`}
              >
                <span className="text-[10px] font-mono text-slate-400 block tracking-wider">SCORE</span>
                <span
                  className={`text-2xl font-mono font-bold tracking-tight tabular-nums transition-all duration-150 inline-block ${
                    scorePulse ? 'text-amber-300 scale-105' : 'text-white scale-100'
                  }`}
                >
                  {localScore.toString().padStart(6, '0')}
                </span>
              </div>

              {/* Identity Bar (Lives) */}
              <div
                className={`transition-opacity duration-300 flex flex-col gap-1 ${hpVisible ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 w-44">
                  <span>IDENTIDADE</span>
                  <span className="text-slate-300">{player.identity.toFixed(0)}%</span>
                </div>
                {/* Segmented bar */}
                <div className="flex gap-1 w-44 h-2">
                  {Array.from({ length: totalSegments }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 rounded-sm transition-all duration-300 ${
                        idx < activeSegments
                          ? activeSegments <= 3
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                            : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                          : 'bg-slate-800/80 border border-slate-700/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center: The Iconic ◉ Symbol / Stimulus Meter */}
        <div className="flex flex-col items-center">
          {showCuratorSymbol && (
            <div className="flex flex-col items-center animate-pulse duration-1000">
              <span className="text-3xl text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)] select-none">
                ◉
              </span>
              <span className="text-[9px] font-mono text-amber-300 tracking-widest mt-0.5">
                CURADOR OBSERVANDO
              </span>
            </div>
          )}

          {/* Minimal Symbol Mode */}
          {isMinimalSymbolOnly && !showCuratorSymbol && (
            <span className="text-xl text-slate-500/40 font-mono tracking-widest">
              ◉
            </span>
          )}
        </div>

        {/* Right: Controls & Active Scars & Combo */}
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          
          {/* Utility Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800 backdrop-blur-sm">
            {onTogglePause && (
              <button
                onClick={onTogglePause}
                title="Pausar Partida [ESC / P]"
                className="p-1.5 rounded text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}

            {isLabUnlocked && (
              <button
                onClick={onOpenCalibration}
                title="Laboratório do Curador (Thresholds, JSON)"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-amber-400 hover:bg-slate-800 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Laboratório</span>
              </button>
            )}

            <button
              onClick={onToggleSpectator}
              title="Telemetria do Curador"
              className={`p-1.5 rounded transition-colors ${spectatorOpen ? 'text-cyan-400 bg-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenMuseum}
              title="Museu das Cicatrizes"
              className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleAudio}
              title={isAudioMuted ? 'Desmutar Som' : 'Mutar Som'}
              className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowExitConfirm(true)}
              title="Voltar para a Tela Inicial"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-l border-slate-800 pl-2"
            >
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>Início</span>
            </button>
          </div>

          {/* Exit Confirmation Modal */}
          {showExitConfirm && (
            <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-amber-400 text-xl font-mono">
                  ◉
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Retornar ao Menu Inicial?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O progresso do ciclo atual será cancelado e você voltará à tela de título.
                </p>
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Continuar Jogando
                  </button>
                  <button
                    onClick={() => {
                      setShowExitConfirm(false);
                      onReturnToTitle();
                    }}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                  >
                    Voltar ao Início
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Combo Multiplier */}
          <div
            className={`flex flex-col items-end transition-all duration-200 ${
              comboVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">COMBO</span>
              {localCombo > 1 && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                  +{Math.round((localCombo * 0.15) * 100)}%
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={`font-mono font-bold transition-all duration-150 tabular-nums ${
                  localCombo > 0
                    ? 'text-2xl text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'text-lg text-slate-500'
                } ${comboPulse ? 'scale-125 text-amber-200' : 'scale-100'}`}
              >
                x{localCombo}
              </span>
            </div>
          </div>

          {/* Active Scars list */}
          {activeScars.length > 0 && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                Cicatrizes Ativas
              </span>
              <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                {activeScars.map((scarId, idx) => {
                  const def = SCAR_DEFINITIONS[scarId];
                  return (
                    <span
                      key={`hud-scar-${scarId}-${idx}`}
                      style={{ borderColor: def?.color || '#94a3b8' }}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-200 border"
                      title={def?.description}
                    >
                      {def?.name || scarId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Bottom Bar: Subtle Stimulus & Controls hint */}
      <div className="flex items-end justify-between w-full text-xs font-mono text-slate-500">
        <div className="flex items-center gap-4">
          {hasPulsoScar ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              PULSO: A INTERFACE DISSOLVEU · SUA VIDA É O SOM DO CORAÇÃO
            </span>
          ) : (
            <>
              <span>WASD / Setas: Mover</span>
              <span>·</span>
              <span>Clique / Espaço: Ação</span>
            </>
          )}
        </div>

        {/* Stimulus Level Progress */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">ESTIMULAÇÃO:</span>
          <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stimulusLevel >= config.stimulus.mutationThreshold
                  ? 'bg-emerald-400'
                  : stimulusLevel >= config.stimulus.warningThreshold
                  ? 'bg-amber-400'
                  : 'bg-slate-400'
              }`}
              style={{ width: `${Math.min(100, stimulusLevel * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-300">
            {(stimulusLevel * 100).toFixed(0)}%
          </span>
        </div>
      </div>

    </div>
  );
};
