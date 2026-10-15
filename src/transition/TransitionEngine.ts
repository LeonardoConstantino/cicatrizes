import { playtestConfigManager } from '../config/playtestConfig';
import { adaptiveAudio } from '../audio/AdaptiveAudio';
import { eventBus } from '../core/EventBus';
import { JuiceSystem } from '../presentation/Juice';
import { SCAR_DEFINITIONS } from '../scars/ScarDefinitions';

export type TransitionPhase = 'idle' | 'disturbance' | 'metamorphosis' | 'emergence';

export interface TransitionState {
  isActive: boolean;
  phase: TransitionPhase;
  progress: number; // 0 to 1
  sourceWorldId: string;
  destinationWorldId: string;
  scarId: string;
  timeElapsedMs: number;
  totalDurationMs: number;
  glitchIntensity: number; // 0 to 1
}

export class TransitionEngine {
  private state: TransitionState = {
    isActive: false,
    phase: 'idle',
    progress: 0,
    sourceWorldId: 'IMPACTO',
    destinationWorldId: 'RITMO',
    scarId: '',
    timeElapsedMs: 0,
    totalDurationMs: 2200,
    glitchIntensity: 0,
  };

  public startTransition(fromWorld: string, toWorld: string, scarId: string): void {
    const config = playtestConfigManager.get();
    const phases = config.mutations.phases;
    const totalDuration = phases.disturbanceMs + phases.metamorphosisMs + phases.emergenceMs;

    this.state = {
      isActive: true,
      phase: 'disturbance',
      progress: 0,
      sourceWorldId: fromWorld,
      destinationWorldId: toWorld,
      scarId,
      timeElapsedMs: 0,
      totalDurationMs: totalDuration,
      glitchIntensity: 0.15,
    };

    adaptiveAudio.playTransitionWarp();
    JuiceSystem.hitstop(phases.disturbanceMs);
    JuiceSystem.cameraShake(14, 250);
    JuiceSystem.screenFlash('#ffffff', 0.5);

    eventBus.emit('transition:begin', {
      fromWorld,
      toWorld,
      scarId,
      duration: totalDuration,
    });
  }

  public update(dtMs: number): { completed: boolean; morphProgress: number; phase: TransitionPhase } {
    if (!this.state.isActive) {
      return { completed: false, morphProgress: 0, phase: 'idle' };
    }

    this.state.timeElapsedMs += dtMs;
    const config = playtestConfigManager.get();
    const phases = config.mutations.phases;

    const t = this.state.timeElapsedMs;
    const tDisturbance = phases.disturbanceMs;
    const tMetamorphosis = tDisturbance + phases.metamorphosisMs;
    const tEmergence = tMetamorphosis + phases.emergenceMs;

    this.state.progress = Math.min(1, t / tEmergence);

    if (t < tDisturbance) {
      this.state.phase = 'disturbance';
      this.state.glitchIntensity = 0.35 + Math.random() * 0.2;
    } else if (t < tMetamorphosis) {
      this.state.phase = 'metamorphosis';
      const metaProgress = (t - tDisturbance) / phases.metamorphosisMs;
      this.state.glitchIntensity = 0.5 * (1 - Math.abs(metaProgress - 0.5) * 2);
    } else if (t < tEmergence) {
      this.state.phase = 'emergence';
      const emergeProgress = (t - tMetamorphosis) / phases.emergenceMs;
      this.state.glitchIntensity = 0.25 * (1 - emergeProgress);
    } else {
      // Complete!
      this.state.isActive = false;
      this.state.phase = 'idle';
      this.state.glitchIntensity = 0;

      const scar = SCAR_DEFINITIONS[this.state.scarId];
      if (scar) {
        eventBus.emit('scar:applied', {
          scarId: scar.id,
          name: scar.name,
          description: scar.description,
          rarity: scar.rarity,
        });
      }

      eventBus.emit('transition:complete', {
        worldId: this.state.destinationWorldId,
        scarId: this.state.scarId,
      });

      adaptiveAudio.playScarApplied();
      adaptiveAudio.setWorld(this.state.destinationWorldId);

      return { completed: true, morphProgress: 1, phase: 'idle' };
    }

    eventBus.emit('transition:phase', {
      phase: this.state.phase,
      progress: this.state.progress,
      timeRemainingMs: Math.max(0, tEmergence - t),
    });

    return {
      completed: false,
      morphProgress: this.state.progress,
      phase: this.state.phase,
    };
  }

  public getState(): TransitionState {
    return { ...this.state };
  }

  public isTransitioning(): boolean {
    return this.state.isActive;
  }
}
