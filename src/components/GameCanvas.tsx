import React, { useRef, useEffect } from 'react';
import { World, PlayerState, InputState } from '../worlds/World';
import { WorldRegistry } from '../worlds/WorldRegistry';
import { TransitionEngine } from '../transition/TransitionEngine';
import { BehaviorProfileTracker } from '../player/BehaviorProfile';
import { StimulusEngine } from '../curator/StimulusEngine';
import { ScarResolver } from '../scars/ScarResolver';
import { eventBus } from '../core/EventBus';
import { JuiceSystem } from '../presentation/Juice';
import { adaptiveAudio } from '../audio/AdaptiveAudio';
import { museumManager } from '../meta/Museum';
import { curatorMemory, Curator } from '../curator/CuratorMemory';
import { GhostData, GhostRecorder } from '../meta/BehavioralGhosts';
import { GhostAgent } from '../meta/GhostAgent';
import { PlayerRenderer } from '../presentation/PlayerRenderer';
import { curatorVoice } from '../curator/CuratorVoice';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';

interface Props {
  onGameOver: (score: number, runNumber: number, curatorMsg: string) => void;
  onCycleVictory?: (
    score: number,
    runNumber: number,
    signature: ReturnType<BehaviorProfileTracker['getSignature']>,
    traits: BehaviorProfileTracker['traits'],
    scars: string[]
  ) => void;
  onMutationNotify?: (data: {
    isVisible: boolean;
    scarId?: string;
    sourceWorldName?: string;
    destinationWorldName?: string;
    phase?: string;
  }) => void;
  onUpdateTelemetry: (data: {
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
    traits: BehaviorProfileTracker['traits'];
    signature: ReturnType<BehaviorProfileTracker['getSignature']>;
  }) => void;
  activeGhost?: GhostData;
  cycleNumber?: number;
  inheritedScarId?: string | null;
  isPaused?: boolean;
}

export const GameCanvas: React.FC<Props> = ({
  onGameOver,
  onCycleVictory,
  onMutationNotify,
  onUpdateTelemetry,
  activeGhost,
  cycleNumber = 1,
  inheritedScarId = null,
  isPaused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const onCycleVictoryRef = useRef(onCycleVictory);
  onCycleVictoryRef.current = onCycleVictory;

  const onMutationNotifyRef = useRef(onMutationNotify);
  onMutationNotifyRef.current = onMutationNotify;

  const onUpdateTelemetryRef = useRef(onUpdateTelemetry);
  onUpdateTelemetryRef.current = onUpdateTelemetry;

  const activeGhostRef = useRef(activeGhost);
  activeGhostRef.current = activeGhost;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sizing
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Systems initialization
    const tracker = new BehaviorProfileTracker();
    const stimulus = new StimulusEngine(tracker);
    const transition = new TransitionEngine();

    let currentWorld: World = WorldRegistry.getWorld('IMPACTO')!;
    const activeScars: string[] = inheritedScarId ? [inheritedScarId] : [];
    if (inheritedScarId) {
      museumManager.recordDiscovery(inheritedScarId, curatorMemory.getRunCount() + 1, tracker.traits);
    }

    const player: PlayerState = {
      x: width / 2,
      y: height / 2,
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
    };

    currentWorld.init(player, width, height);
    adaptiveAudio.setWorld(currentWorld.id);

    // Input state
    const input: InputState = {
      keys: {},
      mouseX: width / 2,
      mouseY: height / 2,
      mouseDown: false,
      mouseClicked: false,
      spaceJustPressed: false,
      hasMovedMouse: false,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      input.keys[e.code] = true;
      if (e.code === 'Space') {
        input.spaceJustPressed = true;
      }
      adaptiveAudio.resume();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      input.keys[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      input.mouseX = e.clientX;
      input.mouseY = e.clientY;
      input.hasMovedMouse = true;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        input.mouseDown = true;
        input.mouseClicked = true;
        adaptiveAudio.init();
        adaptiveAudio.resume();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        input.mouseDown = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Ghost system & Recorder
    const ghostRecorder = new GhostRecorder();
    ghostRecorder.start();
    let ghostAgent: GhostAgent | null = null;
    let pulsoHeartbeatTimer = 0;

    // Main animation loop
    let lastTime = performance.now();
    let lastTelemetryTime = 0;
    let animFrameId: number;
    let isGameOverTriggered = false;

    const gameLoop = (now: number) => {
      if (isPausedRef.current) {
        lastTime = now;
        animFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const dtMs = Math.min(40, now - lastTime);
      lastTime = now;

      // 1. Update Juice (handles hitstop & shake)
      const isFrozen = JuiceSystem.update(dtMs);

      // 2. Combo decay
      if (player.combo > 0) {
        player.comboTimer -= dtMs;
        if (player.comboTimer <= 0) {
          player.combo = 0;
          player.comboTimer = 0;
          eventBus.emit('score:update', { score: player.score, combo: 0, debt: player.debt });
        }
      }

      // 3. World and Gameplay Update (only if not frozen by hitstop)
      if (!isFrozen && !isGameOverTriggered) {
        // Update transition if active
        let morphProgress = 0;
        let transitionPhase = 'idle';

        if (transition.isTransitioning()) {
          const transResult = transition.update(dtMs);
          morphProgress = transResult.morphProgress;
          transitionPhase = transResult.phase;

          if (transResult.completed) {
            const nextWorld = WorldRegistry.getWorld(transition.getState().destinationWorldId);
            if (nextWorld) {
              currentWorld = nextWorld;
              currentWorld.init(player, width, height);
              stimulus.registerMutation();
            }
          }
        }

        // Update current world
        const worldRes = currentWorld.update(dtMs, input, player, activeScars, width, height);

        // Score & Combo
        let scoreOrComboChanged = false;
        if (worldRes.scoreGained > 0) {
          player.score += worldRes.scoreGained;
          scoreOrComboChanged = true;
        }
        if (worldRes.comboIncrease > 0) {
          player.combo += worldRes.comboIncrease;
          player.comboTimer = 3500; // 3.5 seconds to keep combo alive
          scoreOrComboChanged = true;
        }

        if (scoreOrComboChanged) {
          eventBus.emit('score:update', { score: player.score, combo: player.combo, debt: player.debt });
        }

        // Cycle Completed / Victory check
        if (worldRes.cycleCompleted && !isGameOverTriggered) {
          isGameOverTriggered = true;
          const sig = tracker.getSignature();
          const runNum = curatorMemory.recordRun(player.score, activeScars, sig.name, cycleNumber);
          ghostRecorder.finish(runNum, player.score, sig, tracker.traits, activeScars[0] || 'ESPELHO');
          JuiceSystem.cameraShake(16, 300);
          adaptiveAudio.playTransitionWarp();
          if (onCycleVictoryRef.current) {
            onCycleVictoryRef.current(player.score, runNum, sig, tracker.traits, activeScars);
          }
        }

        // Damage & Identity Loss
        if (worldRes.playerDamage > 0) {
          // In NG+, damage has a slight bite (+2 per cycle above 1)
          const extraDamage = cycleNumber > 1 ? (cycleNumber - 1) * 2 : 0;
          const totalDmg = worldRes.playerDamage + extraDamage;
          player.identity = Math.max(0, player.identity - totalDmg);
          player.combo = 0; // combo break
          player.comboTimer = 0;
          eventBus.emit('score:update', { score: player.score, combo: 0, debt: player.debt });
          JuiceSystem.hitstop(40);
          JuiceSystem.cameraShake(12, 200);
          JuiceSystem.screenFlash('#ef4444', 0.4);
          JuiceSystem.triggerGlitch(9, 160);
          JuiceSystem.spawnText(player.x, player.y - 25, `-${Math.round(totalDmg)} IDENTIDADE`, '#ef4444', 15, true);
          adaptiveAudio.playHeartbeat();

          eventBus.emit('identity:fragment', {
            reason: worldRes.damageReason || 'Dano recebido',
            amount: totalDmg,
            remaining: player.identity,
            max: player.maxIdentity,
          });

          // Game Over check
          if (player.identity <= 0 && !isGameOverTriggered) {
            isGameOverTriggered = true;
            const sig = tracker.getSignature();
            const runNum = curatorMemory.recordRun(player.score, activeScars, sig.name, cycleNumber);
            // Finish and save personal ghost recording to local storage
            ghostRecorder.finish(runNum, player.score, sig, tracker.traits, activeScars[0] || 'ECO');
            const msg = Curator.generatePostRunMessage(runNum, sig, tracker.traits, activeScars);
            onGameOverRef.current(player.score, runNum, msg);
            return;
          }
        }

        // Record active player trajectory for Ghost Replay
        ghostRecorder.record(
          player.x,
          player.y,
          player.vx,
          player.vy,
          player.facingAngle,
          worldRes.actionOccurred || 'none'
        );

        // Spawn kinetic neon motion ghosts when moving fast or dashing
        const currentSpeed = Math.hypot(player.vx, player.vy);
        if (currentSpeed > 2.6 || input.spaceJustPressed) {
          if (Math.random() < 0.42) {
            JuiceSystem.spawnMotionGhost(
              player.x,
              player.y,
              player.facingAngle,
              player.width,
              player.height,
              currentWorld.dominantColor || '#38bdf8',
              currentWorld.id
            );
          }
        }

        // PULSO Scar: Continuous audible heartbeat replacing visual HUD
        if (activeScars.includes('PULSO')) {
          pulsoHeartbeatTimer += dtMs;
          const heartbeatInterval = Math.max(280, 850 * (player.identity / player.maxIdentity));
          if (pulsoHeartbeatTimer >= heartbeatInterval) {
            pulsoHeartbeatTimer = 0;
            adaptiveAudio.playHeartbeat();
          }
        }

        // Record player action into BehaviorProfile & notify Curator Voice
        if (worldRes.actionOccurred) {
          tracker.recordAction({
            type: worldRes.actionOccurred,
            weight: 0.8,
            position: { x: player.x, y: player.y },
          });
          curatorVoice.onPlayerAction(worldRes.actionOccurred, player.combo, player.identity, player.maxIdentity);
        }

        // Update Stimulus Engine
        const stimState = stimulus.update();
        adaptiveAudio.setStimulus(stimState.level);

        // Check if ready for mutation
        if (stimState.canMutate && !transition.isTransitioning()) {
          const nextWorldId = WorldRegistry.getNextWorldId(currentWorld.id);
          const nextScar = ScarResolver.selectNextScar(
            tracker.traits,
            activeScars,
            curatorMemory.getRecentScars()
          );

          if (!activeScars.includes(nextScar.id)) {
            activeScars.push(nextScar.id);
          }
          museumManager.recordDiscovery(nextScar.id, curatorMemory.getRunCount() + 1, tracker.traits);

          const nextWorld = WorldRegistry.getWorld(nextWorldId);
          curatorVoice.onMutationTriggered(nextScar.name, nextScar.narrative);

          if (onMutationNotifyRef.current) {
            onMutationNotifyRef.current({
              isVisible: true,
              scarId: nextScar.id,
              sourceWorldName: currentWorld.name,
              destinationWorldName: nextWorld?.name || nextWorldId,
              phase: 'disturbance',
            });
          }

          transition.startTransition(currentWorld.id, nextWorldId, nextScar.id);
        }

        // Keep mutation notification synced with transition progress
        if (onMutationNotifyRef.current && transition.isTransitioning()) {
          const tState = transition.getState();
          const nextWorld = WorldRegistry.getWorld(tState.destinationWorldId);
          onMutationNotifyRef.current({
            isVisible: true,
            scarId: tState.scarId,
            sourceWorldName: currentWorld.name,
            destinationWorldName: nextWorld?.name || tState.destinationWorldId,
            phase: transitionPhase,
          });
        } else if (onMutationNotifyRef.current && !transition.isTransitioning()) {
          onMutationNotifyRef.current({ isVisible: false });
        }

        // Update Autonomous GhostAgent (for selected Ghost or FANTASMA rare scar)
        const selectedGhost = activeGhostRef.current;
        const hasFantasmaScar = activeScars.includes('FANTASMA');

        if (!ghostAgent && (selectedGhost || hasFantasmaScar)) {
          const ghostDataToUse = selectedGhost || {
            id: 'fantasma_scar_double',
            name: 'Duplo de Ressonância (FANTASMA)',
            signature: {
              name: 'O Duplo',
              archetypeId: 'predator',
              dominantTraits: ['aggression', 'repetition'],
              description: 'Duplo espectral conjurado pela união de ECO e ESPELHO.',
            },
            traits: { ...tracker.traits },
            dominantScar: 'FANTASMA',
            color: '#c084fc',
            description: 'Luta ao seu lado replicando seus hábitos em combate.',
          };
          ghostAgent = new GhostAgent(ghostDataToUse, player.x + 35, player.y + 35);
        }

        if (ghostAgent) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const currentEnemies = (currentWorld as any).getEnemies?.() || [];
          ghostAgent.update(dtMs, player, currentWorld.id, width, height, currentEnemies);
        }

        // Next predicted scar for telemetry
        const predicted = ScarResolver.selectNextScar(tracker.traits, activeScars, []);

        // Send telemetry up to React HUD throttled to ~16fps or immediately when score/combo changes
        if (scoreOrComboChanged || now - lastTelemetryTime > 60) {
          lastTelemetryTime = now;
          onUpdateTelemetryRef.current({
            player: { ...player },
            stimulusLevel: stimState.level,
            stimulusComponents: stimState.components,
            activeWorldName: currentWorld.name,
            activeScars: [...activeScars],
            isTransitioning: transition.isTransitioning(),
            transitionPhase,
            timeUntilEligibleSec: stimState.secondsUntilEligible,
            timeInWorldSec: stimState.secondsInCurrentWorld,
            predictedScarId: predicted.id,
            traits: { ...tracker.traits },
            signature: tracker.getSignature(),
          });
        }
      }

      // Reset per-frame inputs
      input.mouseClicked = false;
      input.spaceJustPressed = false;

      // 4. Render Phase
      ctx.save();
      // Apply camera shake
      const shake = JuiceSystem.getShake();
      ctx.translate(shake.x, shake.y);

      // Clear Canvas
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, width, height);

      // Render Active World
      const morphProgress = transition.isTransitioning() ? transition.getState().progress : 0;
      currentWorld.render(
        ctx,
        width,
        height,
        player,
        morphProgress,
        transition.isTransitioning(),
        activeScars
      );

      // Render Motion Ghosts before active player avatar
      JuiceSystem.renderMotionGhosts(ctx);

      // Render Dynamic Player Character tailored for each World
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isGrounded = currentWorld.id === 'RITMO' ? ((currentWorld as any).isGrounded ?? true) : true;
      const destinationWorldId = transition.isTransitioning() ? transition.getState().destinationWorldId : undefined;

      PlayerRenderer.render(
        ctx,
        player,
        currentWorld.id,
        input,
        now,
        isGrounded,
        transition.isTransitioning(),
        morphProgress,
        destinationWorldId
      );

      // Render Ghost Agent if active
      if (ghostAgent) {
        ghostAgent.render(ctx, now);
        PlayerRenderer.renderGhostAvatar(
          ctx,
          ghostAgent.x,
          ghostAgent.y,
          ghostAgent.facingAngle,
          currentWorld.id,
          ghostAgent.data.color,
          now,
          Math.hypot(ghostAgent.vx, ghostAgent.vy) > 0.2,
          ghostAgent.isGrounded
        );
      }

      // Render Particles and Juice Overlays
      JuiceSystem.renderOverlay(ctx, width, height);

      // CRT Scanlines & Vignette overlay
      ctx.restore(); // restore shake translation

      // Scanline effect
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }

      // Subtle vignette
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.4,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Low Identity Heartbeat Vignette (<35% HP)
      JuiceSystem.renderLowIdentityVignette(ctx, width, height, player.identity);

      ctx.restore();

      animFrameId = requestAnimationFrame(gameLoop);
    };

    animFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full cursor-crosshair" />;
};
