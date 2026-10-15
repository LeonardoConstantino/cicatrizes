import React, { useState, useEffect, useRef } from 'react';
import { museumManager } from '../meta/Museum';
import { SCAR_DEFINITIONS, ScarDefinition } from '../scars/ScarDefinitions';
import { BookOpen, X, Sparkles, Lock, Play, Pause, RotateCcw, Activity } from 'lucide-react';
import { adaptiveAudio } from '../audio/AdaptiveAudio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MuseumModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selectedScarId, setSelectedScarId] = useState<string>('ECO');
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(true);
  const [replayProgress, setReplayProgress] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const pausedTimeRef = useRef<number>(0);

  const entriesWithDefs = museumManager.getAllEntries();
  const selected = entriesWithDefs.find((e) => e.def.id === selectedScarId) || entriesWithDefs[0];
  const isDiscovered = !!selected?.entry;

  // Handle Play/Pause
  const handleToggleReplay = () => {
    if (isPlayingReplay) {
      pausedTimeRef.current = performance.now();
      setIsPlayingReplay(false);
    } else {
      startTimeRef.current += performance.now() - pausedTimeRef.current;
      setIsPlayingReplay(true);
      adaptiveAudio.playScarApplied();
    }
  };

  const handleRestartReplay = () => {
    startTimeRef.current = performance.now();
    setIsPlayingReplay(true);
    adaptiveAudio.playScarApplied();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Replay Canvas Animation Loop
  useEffect(() => {
    if (!isOpen) return;

    startTimeRef.current = performance.now();

    const renderSimulation = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(renderSimulation);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const now = performance.now();

      const duration = 3600; // 3.6s loop
      const elapsed = isPlayingReplay ? now - startTimeRef.current : pausedTimeRef.current - startTimeRef.current;
      const loopTime = (elapsed % duration + duration) % duration;
      const progress = loopTime / duration;
      setReplayProgress(progress);

      // Clear with dark high-tech slate
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const scarId = selected.def.id;
      const color = selected.def.color;

      // Draw specific behavioral replay animation based on Scar
      drawScarBehavior(ctx, scarId, color, loopTime, duration, width, height);

      // Chamber HUD overlay
      ctx.save();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '9px monospace';
      ctx.fillText(`SIMULAÇÃO NEURAL: ${scarId}`, 10, 15);
      ctx.fillStyle = color;
      ctx.fillText(`LOOP: ${(loopTime / 1000).toFixed(1)}s / 3.6s`, width - 110, 15);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(renderSimulation);
    };

    animFrameRef.current = requestAnimationFrame(renderSimulation);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, selectedScarId, isPlayingReplay]);

  // Specific simulation logic for each scar
  const drawScarBehavior = (
    ctx: CanvasRenderingContext2D,
    scarId: string,
    color: string,
    time: number,
    duration: number,
    w: number,
    h: number
  ) => {
    const cx = w / 2;
    const cy = h / 2;

    switch (scarId) {
      case 'ECO': {
        // Player moves right and attacks; 800ms later an echo duplicate repeats the action
        const playerX = cx - 100 + (time / duration) * 160;
        const playerY = cy;

        // Main Player Avatar
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(playerX, playerY, 9, 0, Math.PI * 2);
        ctx.fill();

        // Player primary beam at t = 1000
        if (time >= 1000 && time < 1600) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(playerX + 10, playerY);
          ctx.lineTo(playerX + 80, playerY);
          ctx.stroke();
        }

        // Echo duplicate (800ms lag)
        if (time >= 800) {
          const echoX = cx - 100 + ((time - 800) / duration) * 160;
          ctx.fillStyle = 'rgba(6, 182, 212, 0.55)';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(echoX, playerY, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Echo ripples
          const ripR = ((time - 800) % 600) * 0.08;
          ctx.beginPath();
          ctx.arc(echoX, playerY, 9 + ripR, 0, Math.PI * 2);
          ctx.stroke();

          // Echo delayed beam at t >= 1800
          if (time >= 1800 && time < 2400) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(echoX + 10, playerY);
            ctx.lineTo(echoX + 80, playerY);
            ctx.stroke();
          }
        }
        ctx.restore();
        break;
      }

      case 'FOME': {
        // Aggressive dashing between targets, leaving debris and consuming
        const tStep = (time / duration) * 4;
        const pts = [
          { x: cx - 120, y: cy - 20 },
          { x: cx + 10, y: cy + 30 },
          { x: cx + 110, y: cy - 25 },
          { x: cx - 120, y: cy - 20 },
        ];
        const seg = Math.floor(tStep) % 3;
        const subT = tStep - Math.floor(tStep);
        const px = pts[seg].x + (pts[seg + 1].x - pts[seg].x) * subT;
        const py = pts[seg].y + (pts[seg + 1].y - pts[seg].y) * subT;

        // Targets / Residues
        pts.slice(0, 3).forEach((p, idx) => {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
          ctx.fill();
          // Debris particles
          for (let k = 0; k < 3; k++) {
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(p.x + Math.sin(time * 0.005 + k) * 14, p.y + Math.cos(time * 0.005 + k) * 14, 3, 3);
          }
        });

        // Slashing blade trail
        ctx.save();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 18, time * 0.01, time * 0.01 + Math.PI * 1.2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'MEDO': {
        // Player moves, geometric hazards flee actively
        const px = cx + Math.sin(time * 0.0025) * 80;
        const py = cy + Math.cos(time * 0.0025) * 35;

        // Player
        ctx.save();
        ctx.fillStyle = '#6366f1';
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();

        // 3 Hazards fleeing
        const hOffsets = [
          { x: cx - 110, y: cy - 40 },
          { x: cx + 120, y: cy + 20 },
          { x: cx - 10, y: cy + 50 },
        ];
        hOffsets.forEach((hPos, idx) => {
          const dx = hPos.x - px;
          const dy = hPos.y - py;
          const dist = Math.hypot(dx, dy);
          const repelX = hPos.x + (dx / dist) * Math.max(0, 70 - dist * 0.6);
          const repelY = hPos.y + (dy / dist) * Math.max(0, 70 - dist * 0.6);

          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.arc(repelX, repelY, 7, 0, Math.PI * 2);
          ctx.fill();

          // Repulsion vector lines
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(repelX, repelY);
          ctx.stroke();
          ctx.setLineDash([]);
        });
        ctx.restore();
        break;
      }

      case 'RITMO': {
        // BPM Metronome sweep line and synchronized parry rings
        const bpmInterval = 468;
        const beatNum = Math.floor(time / bpmInterval);
        const beatFraction = (time % bpmInterval) / bpmInterval;

        // Metronome sweep
        const sweepX = (time / duration) * w;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sweepX, 20);
        ctx.lineTo(sweepX, h - 20);
        ctx.stroke();

        // Player on platform
        ctx.save();
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();

        // Rhythmic Pulse rings expanding on each beat
        const ringR = beatFraction * 45;
        const ringAlpha = 1 - beatFraction;
        ctx.strokeStyle = `rgba(16, 185, 129, ${ringAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 9 + ringR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = '10px monospace';
        ctx.fillText(`BEAT: ${beatNum + 1} (128 BPM)`, cx - 45, cy + 32);
        ctx.restore();
        break;
      }

      case 'PRESSA': {
        // High speed motion blur and mach shock cone
        const px = 30 + ((time * 1.6) % w);
        ctx.save();
        // Mach cone
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.moveTo(px + 15, cy);
        ctx.lineTo(px - 50, cy - 25);
        ctx.lineTo(px - 50, cy + 25);
        ctx.closePath();
        ctx.fill();

        // Ghost trail
        for (let i = 1; i <= 4; i++) {
          ctx.fillStyle = `rgba(239, 68, 68, ${0.8 - i * 0.18})`;
          ctx.beginPath();
          ctx.arc(px - i * 14, cy, 9 - i * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'SILENCIO': {
        // Darkness with sonar wave reveal
        const sonarCycle = (time % 1800) / 1800;
        const sonarR = sonarCycle * 220;

        ctx.save();
        ctx.strokeStyle = `rgba(56, 189, 248, ${1 - sonarCycle})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, sonarR, 0, Math.PI * 2);
        ctx.stroke();

        // Player
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();

        // 3 Hidden sentinels revealed by sonar
        const sentinels = [
          { x: cx - 80, y: cy - 35 },
          { x: cx + 90, y: cy + 20 },
          { x: cx - 40, y: cy + 45 },
        ];
        sentinels.forEach((s) => {
          const d = Math.hypot(s.x - cx, s.y - cy);
          const isRevealed = Math.abs(d - sonarR) < 40 || sonarR > d;
          ctx.fillStyle = isRevealed ? '#38bdf8' : 'rgba(148, 163, 184, 0.15)';
          ctx.shadowBlur = isRevealed ? 12 : 0;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
        break;
      }

      case 'DIVIDA': {
        // Accumulating debt tokens and detonating supernova
        const kills = Math.floor((time / duration) * 6);
        ctx.save();
        ctx.fillStyle = '#eab308';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();

        // Debt tokens circling
        for (let i = 0; i < Math.min(5, kills); i++) {
          const ang = (i * Math.PI * 2) / 5 + time * 0.003;
          const tx = cx + Math.cos(ang) * 28;
          const ty = cy + Math.sin(ang) * 28;
          ctx.fillStyle = '#fde047';
          ctx.fillRect(tx - 3, ty - 3, 6, 6);
        }

        // On 5th kill: Gold shockwave
        if (kills >= 5) {
          const burstAlpha = Math.max(0, 1 - (time % 600) / 600);
          ctx.strokeStyle = `rgba(234, 179, 8, ${burstAlpha})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, ((time % 600) / 600) * 120, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }

      case 'ESPELHO': {
        // Center line, player on left, shadow on right with 1.1s lag
        ctx.save();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 15);
        ctx.lineTo(cx, h - 15);
        ctx.stroke();
        ctx.setLineDash([]);

        // Player
        const pMoveX = cx - 70 + Math.sin(time * 0.003) * 40;
        const pMoveY = cy + Math.cos(time * 0.003) * 30;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pMoveX, pMoveY, 9, 0, Math.PI * 2);
        ctx.fill();

        // Shadow with 1100ms lag
        const lagTime = Math.max(0, time - 1100);
        const sMoveX = cx + 70 - Math.sin(lagTime * 0.003) * 40;
        const sMoveY = cy + Math.cos(lagTime * 0.003) * 30;
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sMoveX, sMoveY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      default: {
        // Universal pulse avatar
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(cx, cy, 10 + Math.sin(time * 0.005) * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 22 + Math.cos(time * 0.005) * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                O Museu das Cicatrizes
              </h2>
              <p className="text-xs text-slate-400">
                Cada cicatriz é o rastro fossilizado de como você jogou nas runs anteriores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-full">
              {museumManager.getDiscoveredCount()} / {museumManager.getTotalScarsCount()} Descobertas
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Fechar (Esc)
            </button>
          </div>
        </div>

        {/* Museum Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          
          {/* Scars Exhibition Gallery List */}
          <div className="p-4 border-r border-slate-800 overflow-y-auto space-y-2 bg-slate-950/40">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block px-1 mb-2">
              Relíquias em Exposição
            </span>
            {entriesWithDefs.map(({ def, entry }) => {
              const discovered = !!entry;
              const isSelected = def.id === selectedScarId;

              return (
                <button
                  key={def.id}
                  onClick={() => {
                    setSelectedScarId(def.id);
                    startTimeRef.current = performance.now();
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 shadow-md'
                      : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: discovered ? def.color : '#475569' }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${discovered ? 'text-white' : 'text-slate-500'}`}>
                          {discovered ? def.name : '???'}
                        </span>
                        {def.rarity === 'rare' && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            RARA
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block line-clamp-1 italic">
                        {discovered ? `"${def.narrative}"` : 'Ainda não descoberta'}
                      </span>
                    </div>
                  </div>

                  {!discovered && <Lock className="w-3.5 h-3.5 text-slate-600" />}
                </button>
              );
            })}
          </div>

          {/* Exhibition Relic Display */}
          <div className="md:col-span-2 p-6 overflow-y-auto flex flex-col justify-between bg-slate-900/40">
            {selected && (
              <div className="space-y-5">
                
                {/* Header */}
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      style={{ backgroundColor: selected.def.color }}
                      className="w-2.5 h-2.5 rounded-full inline-block"
                    />
                    <h3 className="text-xl font-bold text-white tracking-wide">
                      {isDiscovered ? selected.def.name : 'CICATRIZ NÃO REGISTRADA'}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selected.def.rarity.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm text-cyan-300 italic font-serif">
                    {isDiscovered ? `"${selected.def.narrative}"` : '"O Curador ainda aguarda essa assinatura."'}
                  </p>
                </div>

                {/* Description & Effect */}
                <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                    Manifestação no Mundo
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selected.def.description}
                  </p>
                </div>

                {/* Behavioral Replay Sandbox Canvas */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-white tracking-wide">
                        Câmara de Replay Comportamental
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRestartReplay}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Reiniciar Simulação"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={handleToggleReplay}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                          isPlayingReplay
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                      >
                        {isPlayingReplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isPlayingReplay ? 'Pausar Replay' : 'Iniciar Replay'}
                      </button>
                    </div>
                  </div>

                  {/* 2D Simulation Canvas */}
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black">
                    <canvas
                      ref={canvasRef}
                      width={520}
                      height={160}
                      className="w-full h-40 block"
                    />

                    {/* Timeline progress line at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-75"
                        style={{ width: `${replayProgress * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Oscilloscope Trait Metrics */}
                  {selected.entry && (
                    <div className="grid grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">AGRESSIVIDADE</span>
                        <span className="text-amber-400 font-bold">
                          {((selected.entry.triggerTraitsSnapshot?.aggression ?? 0.5) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">EVASÃO</span>
                        <span className="text-cyan-400 font-bold">
                          {((selected.entry.triggerTraitsSnapshot?.evasion ?? 0.5) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">REPETIÇÃO</span>
                        <span className="text-purple-400 font-bold">
                          {((selected.entry.triggerTraitsSnapshot?.repetition ?? 0.5) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">PRECISÃO</span>
                        <span className="text-emerald-400 font-bold">
                          {((selected.entry.triggerTraitsSnapshot?.precision ?? 0.5) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
