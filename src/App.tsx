import { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUDOverlay } from './components/HUDOverlay';
import { PlaytestCalibrationModal } from './components/PlaytestCalibrationModal';
import { CuratorSpectatorPanel } from './components/CuratorSpectatorPanel';
import { MuseumModal } from './components/MuseumModal';
import { GameOverModal } from './components/GameOverModal';
import { GhostsModal } from './components/GhostsModal';
import { VictoryModal } from './components/VictoryModal';
import { RunHistoryModal } from './components/RunHistoryModal';
import { WorldControlsCard } from './components/WorldControlsCard';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { TouchControls } from './components/TouchControls';
import { FirstRunTutorial } from './components/FirstRunTutorial';
import { ScarNotificationBanner } from './components/ScarNotificationBanner';
import { CuratorDialogueOverlay } from './components/CuratorDialogueOverlay';
import { PlayerState } from './worlds/World';
import { adaptiveAudio } from './audio/AdaptiveAudio';
import { playtestConfigManager } from './config/playtestConfig';
import { GhostData } from './meta/BehavioralGhosts';
import { BehaviorTraits, PlayerSignature } from './player/BehaviorProfile';
import { curatorMemory } from './curator/CuratorMemory';
import { shareGame } from './utils/shareUtils';
import { Sliders, BookOpen, Users, Volume2, VolumeX, Play, Trophy, Share2, Settings, Check, Smartphone } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'TITLE' | 'PLAYING' | 'GAME_OVER'>('TITLE');
  const [runSessionId, setRunSessionId] = useState(0);
  const [cycleNumber, setCycleNumber] = useState(1);
  const [inheritedScarId, setInheritedScarId] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Modals state
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isSpectatorOpen, setIsSpectatorOpen] = useState(false);
  const [isMuseumOpen, setIsMuseumOpen] = useState(false);
  const [isGhostsOpen, setIsGhostsOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFirstRunTutorial, setShowFirstRunTutorial] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Lab calibration is unlocked ONLY after 30 completed runs
  const isLabUnlocked = curatorMemory.getRunCount() >= 30;

  // Mutation notification banner state
  const [mutationBanner, setMutationBanner] = useState<{
    isVisible: boolean;
    scarId?: string;
    sourceWorldName?: string;
    destinationWorldName?: string;
    phase?: string;
  }>({
    isVisible: false,
  });

  // Victory data state
  const [victoryData, setVictoryData] = useState<{
    score: number;
    runNumber: number;
    signature: PlayerSignature;
    traits: BehaviorTraits;
    scars: string[];
  }>({
    score: 0,
    runNumber: 1,
    signature: { name: 'O Duelista Transcendente', archetypeId: 'predator', dominantTraits: ['aggression', 'risk'], description: '' },
    traits: { aggression: 0.5, evasion: 0.5, repetition: 0.5, rhythm: 0.5, precision: 0.5, risk: 0.5, hesitation: 0.5 },
    scars: [],
  });

  // Telemetry state from GameCanvas
  const [telemetry, setTelemetry] = useState<{
    player: PlayerState;
    stimulusLevel: number;
    stimulusComponents: { mastery: number; consistency: number; repetition: number; confidence: number };
    activeWorldName: string;
    activeScars: string[];
    isTransitioning: boolean;
    transitionPhase: string;
    timeUntilEligibleSec: number;
    timeInWorldSec: number;
    predictedScarId: string;
    traits: BehaviorTraits;
    signature: PlayerSignature;
  }>({
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      width: 14,
      height: 14,
      facingAngle: 0,
      identity: 100,
      maxIdentity: 100,
      score: 0,
      combo: 0,
      comboTimer: 0,
      debt: 0,
      speed: 4.8,
    },
    stimulusLevel: 0,
    stimulusComponents: { mastery: 0.4, consistency: 0.4, repetition: 0.3, confidence: 0.5 },
    activeWorldName: 'MUNDO I — IMPACTO',
    activeScars: [],
    isTransitioning: false,
    transitionPhase: 'idle',
    timeUntilEligibleSec: 90,
    timeInWorldSec: 0,
    predictedScarId: 'ECO',
    traits: {
      aggression: 0.2,
      evasion: 0.2,
      repetition: 0.2,
      risk: 0.1,
      rhythm: 0.3,
      precision: 0.4,
      hesitation: 0.2,
    },
    signature: {
      name: 'O Vigilante',
      archetypeId: 'hybrid',
      dominantTraits: ['precision', 'rhythm'],
      description: 'Equilíbrio adaptativo entre múltiplos estilos de jogo.',
    },
  });

  // Game over state
  const [gameOverStats, setGameOverStats] = useState<{
    score: number;
    runNumber: number;
    curatorMsg: string;
  }>({
    score: 0,
    runNumber: 1,
    curatorMsg: 'The archive watched your first steps.',
  });

  const [activeGhost, setActiveGhost] = useState<GhostData | undefined>(undefined);

  // Keyboard shortcut listener: '~' or 'c' or 'C' toggles calibration
  // Keyboard shortcut listener: Pause (ESC/P) and developer tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      // Secret developer shortcut: Ctrl + Shift + D
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsCalibrationOpen((prev) => !prev);
        return;
      }

      // Calibration shortcut: only if lab is unlocked (>= 30 runs)
      if ((e.key === '`' || e.key === '~') && !isInput && isLabUnlocked) {
        setIsCalibrationOpen((prev) => !prev);
        return;
      }

      // Pause via 'P' / 'p' key during active gameplay
      if ((e.key === 'p' || e.key === 'P') && !isInput && gameState === 'PLAYING') {
        setIsPaused((prev) => !prev);
        return;
      }

      // Escape key handles modal closing or in-game pause toggle
      if (e.key === 'Escape') {
        if (
          isCalibrationOpen ||
          isMuseumOpen ||
          isGhostsOpen ||
          isSpectatorOpen ||
          isHistoryOpen ||
          isSettingsOpen
        ) {
          setIsCalibrationOpen(false);
          setIsMuseumOpen(false);
          setIsGhostsOpen(false);
          setIsSpectatorOpen(false);
          setIsHistoryOpen(false);
          setIsSettingsOpen(false);
        } else if (gameState === 'PLAYING') {
          setIsPaused((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isLabUnlocked, isCalibrationOpen, isMuseumOpen, isGhostsOpen, isSpectatorOpen, isHistoryOpen, isSettingsOpen]);

  const handleStartGame = () => {
    setCycleNumber(1);
    setInheritedScarId(null);
    setIsPaused(false);
    adaptiveAudio.init();
    adaptiveAudio.resume();
    setGameState('PLAYING');
    if (curatorMemory.getRunCount() === 0) {
      setShowFirstRunTutorial(true);
    }
  };

  const handleGameOver = useCallback((score: number, runNumber: number, curatorMsg: string) => {
    setGameOverStats({
      score,
      runNumber,
      curatorMsg,
    });
    setGameState('GAME_OVER');
  }, []);

  const handleCycleVictory = useCallback((
    score: number,
    runNumber: number,
    signature: PlayerSignature,
    traits: BehaviorTraits,
    scars: string[]
  ) => {
    setVictoryData({ score, runNumber, signature, traits, scars });
    setIsVictoryOpen(true);
  }, []);

  const handleRestart = () => {
    setRunSessionId((prev) => prev + 1);
    setGameState('PLAYING');
  };

  const handleToggleAudio = () => {
    const isMuted = adaptiveAudio.toggleMute();
    setIsAudioMuted(isMuted);
  };

  const handleTelemetryUpdate = useCallback((data: typeof telemetry) => {
    setTelemetry(data);
  }, []);

  const handleShareGame = async () => {
    const res = await shareGame();
    if (res.success) {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2400);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans text-slate-100">
      
      {/* Active Game Canvas */}
      {gameState === 'PLAYING' && (
        <GameCanvas
          key={`${gameState}_${runSessionId}`}
          onGameOver={handleGameOver}
          onCycleVictory={handleCycleVictory}
          onMutationNotify={setMutationBanner}
          onUpdateTelemetry={handleTelemetryUpdate}
          activeGhost={activeGhost}
          cycleNumber={cycleNumber}
          inheritedScarId={inheritedScarId}
          isPaused={isPaused}
        />
      )}

      {/* Touchscreen virtual controls for mobile/tablet players */}
      {gameState === 'PLAYING' && (
        <TouchControls
          onTogglePause={() => setIsPaused((prev) => !prev)}
          isPaused={isPaused}
        />
      )}

      {/* In-Game Dynamic HUD */}
      {gameState === 'PLAYING' && (
        <HUDOverlay
          player={telemetry.player}
          stimulusLevel={telemetry.stimulusLevel}
          activeWorldName={telemetry.activeWorldName}
          activeScars={telemetry.activeScars}
          isTransitioning={telemetry.isTransitioning}
          transitionPhase={telemetry.transitionPhase}
          timeUntilEligibleSec={telemetry.timeUntilEligibleSec}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          onToggleSpectator={() => setIsSpectatorOpen((prev) => !prev)}
          onOpenMuseum={() => setIsMuseumOpen(true)}
          onToggleAudio={handleToggleAudio}
          onTogglePause={() => setIsPaused((prev) => !prev)}
          onReturnToTitle={() => {
            setIsPaused(false);
            setCycleNumber(1);
            setInheritedScarId(null);
            setGameState('TITLE');
          }}
          isAudioMuted={isAudioMuted}
          spectatorOpen={isSpectatorOpen}
          cycleNumber={cycleNumber}
          isLabUnlocked={isLabUnlocked}
        />
      )}

      {/* Quick Contextual World Controls Card */}
      {gameState === 'PLAYING' && (
        <WorldControlsCard
          worldId={
            telemetry.activeWorldName.includes('I —')
              ? 'IMPACTO'
              : telemetry.activeWorldName.includes('II —')
              ? 'RITMO'
              : telemetry.activeWorldName.includes('III —')
              ? 'QUEDA'
              : telemetry.activeWorldName.includes('IV —')
              ? 'FOME'
              : telemetry.activeWorldName.includes('V —')
              ? 'SILENCIO'
              : 'ESPELHO'
          }
          worldName={telemetry.activeWorldName}
          cycleNumber={cycleNumber}
          inheritedScarId={inheritedScarId}
        />
      )}

      {/* Spectator / Curator Live Telemetry overlay */}
      {gameState === 'PLAYING' && (
        <CuratorSpectatorPanel
          isOpen={isSpectatorOpen}
          onClose={() => setIsSpectatorOpen(false)}
          traits={telemetry.traits}
          signature={telemetry.signature}
          stimulusComponents={telemetry.stimulusComponents}
          stimulusLevel={telemetry.stimulusLevel}
          mutationThreshold={playtestConfigManager.get().stimulus.mutationThreshold}
          predictedScarId={telemetry.predictedScarId}
        />
      )}

      {/* TITLE SCREEN */}
      {gameState === 'TITLE' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-between p-8 bg-gradient-to-b from-slate-950 via-black to-slate-950">
          
          {/* Top Bar Contract (3 zones) */}
          <header className="w-full flex items-center justify-between px-4 py-2 border-b border-slate-900/80">
            <span className="font-serif text-lg font-bold tracking-widest text-slate-200">
              CICATRIZ
            </span>

            <nav className="flex items-center gap-5 text-xs text-slate-400">
              {isLabUnlocked && (
                <button
                  onClick={() => setIsCalibrationOpen(true)}
                  className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  Laboratório (Run 30+)
                </button>
              )}
              <button
                onClick={() => setIsMuseumOpen(true)}
                className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                Museu
              </button>
              <button
                onClick={() => setIsGhostsOpen(true)}
                className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Fantasmas
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Recordes
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                Opções
              </button>
              <button
                onClick={handleShareGame}
                className="hover:text-amber-300 transition-colors flex items-center gap-1.5 text-amber-400 font-semibold"
              >
                {shareToast ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {shareToast ? 'Copiado!' : 'Compartilhar'}
              </button>
            </nav>

            <button
              onClick={handleToggleAudio}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              title="Alternar Áudio"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </header>

          {/* Center Pitch & Start */}
          <div className="flex flex-col items-center text-center max-w-xl space-y-6">
            <div className="w-14 h-14 rounded-full border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-2xl text-amber-400 animate-pulse duration-1000">
              ◉
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-widest text-white uppercase font-mono">
                CICATRIZ
              </h1>
              <p className="text-base text-amber-400/90 font-serif italic">
                &ldquo;Quanto melhor você fica, mais o jogo muda.&rdquo;
              </p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Um arcade mutante que observa como você joga, aprende sua assinatura comportamental
                e transforma seus hábitos em cicatrizes visíveis no próximo mundo.
              </p>
            </div>

            {/* Play Button & Record Pill */}
            <div className="pt-2 w-full max-w-xs space-y-3">
              {curatorMemory.getRunCount() > 0 && (
                <div className="flex items-center justify-center gap-2.5 text-[11px] font-mono py-1.5 px-3.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Trophy className="w-3 h-3 text-amber-400" /> {curatorMemory.getBestScore().toLocaleString()} pts
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>{curatorMemory.getRunCount()} Runs</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-purple-400">Ciclo {curatorMemory.getMaxCycle()}</span>
                </div>
              )}

              <button
                onClick={handleStartGame}
                className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold tracking-wider text-sm flex items-center justify-center gap-2.5 transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_28px_rgba(251,191,36,0.5)] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                INICIAR CICLO
              </button>

              <div className="flex justify-center gap-3 text-[11px] font-mono text-slate-500">
                <span>WASD: Mover</span>
                <span>·</span>
                <span>Mouse / Espaço: Disparar</span>
                <span>·</span>
                <span>ESC / P: Pausar</span>
              </div>

              {typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-cyan-400/90 pt-1">
                  <Smartphone className="w-3 h-3 text-cyan-400" />
                  Controles de toque habilitados (Melhor com Teclado + Mouse)
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="text-[11px] font-mono text-slate-600 flex items-center gap-4">
            <span>Stack: Vite · TypeScript · WebGL Canvas · Web Audio API · Tailwind</span>
            <span>·</span>
            <span>GDD v0.1 Vertical Slice</span>
          </footer>

        </div>
      )}

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameState === 'GAME_OVER'}
        score={gameOverStats.score}
        runNumber={gameOverStats.runNumber}
        curatorMessage={gameOverStats.curatorMsg}
        signature={telemetry.signature}
        accumulatedScars={telemetry.activeScars}
        onRestart={handleRestart}
        onReturnToTitle={() => setGameState('TITLE')}
      />

      {/* Playtest Calibration Panel */}
      <PlaytestCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentStimulus={telemetry.stimulusLevel}
        timeInWorldSec={telemetry.timeInWorldSec}
        timeUntilEligibleSec={telemetry.timeUntilEligibleSec}
        activeWorldId={telemetry.activeWorldName}
      />

      {/* Museum Modal */}
      <MuseumModal
        isOpen={isMuseumOpen}
        onClose={() => setIsMuseumOpen(false)}
      />

      {/* Behavioral Ghosts Modal */}
      <GhostsModal
        isOpen={isGhostsOpen}
        onClose={() => setIsGhostsOpen(false)}
        onSelectGhost={(ghost) => setActiveGhost(ghost || undefined)}
        activeGhostId={activeGhost?.id}
      />

      {/* Cycle Completed Victory Modal */}
      <VictoryModal
        isOpen={isVictoryOpen}
        score={victoryData.score}
        runNumber={victoryData.runNumber}
        signature={victoryData.signature}
        traits={victoryData.traits}
        scars={victoryData.scars}
        onRestartCycle={(chosenScarId) => {
          setIsVictoryOpen(false);
          setCycleNumber((prev) => prev + 1);
          setInheritedScarId(chosenScarId || victoryData.scars[0] || 'ESPELHO');
          setRunSessionId((prev) => prev + 1);
          setGameState('PLAYING');
          adaptiveAudio.playTransitionWarp();
        }}
        onOpenMuseum={() => {
          setIsVictoryOpen(false);
          setIsMuseumOpen(true);
        }}
      />

      {/* Run History & Records Modal (Hall das Cinzas) */}
      <RunHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        curatorMemory={curatorMemory}
      />

      {/* Dramatic Scar Notification Banner during World Mutation */}
      <ScarNotificationBanner
        isVisible={mutationBanner.isVisible}
        scarId={mutationBanner.scarId}
        sourceWorldName={mutationBanner.sourceWorldName}
        destinationWorldName={mutationBanner.destinationWorldName}
        phase={mutationBanner.phase}
      />

      {/* In-Game Subtle Curator Whispers and Atmospheric Interventions */}
      {gameState === 'PLAYING' && <CuratorDialogueOverlay />}

      {/* First-Run Atmospheric Onboarding Transmission */}
      <FirstRunTutorial
        isVisible={showFirstRunTutorial && gameState === 'PLAYING'}
        onDismiss={() => setShowFirstRunTutorial(false)}
      />

      {/* In-Game Atmospheric Pause Modal */}
      <PauseModal
        isOpen={isPaused && gameState === 'PLAYING'}
        onResume={() => setIsPaused(false)}
        onRestart={handleRestart}
        onReturnToTitle={() => {
          setIsPaused(false);
          setCycleNumber(1);
          setInheritedScarId(null);
          setGameState('TITLE');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeWorldName={telemetry.activeWorldName}
        activeScars={telemetry.activeScars}
        currentScore={telemetry.player.score}
        currentCombo={telemetry.player.combo}
        cycleNumber={cycleNumber}
      />

      {/* Settings & Accessibility Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetSave={() => {
          setRunSessionId((prev) => prev + 1);
          setCycleNumber(1);
          setInheritedScarId(null);
          setGameState('TITLE');
        }}
      />

    </div>
  );
}
