import { playtestConfigManager } from '../config/playtestConfig';
import { eventBus } from '../core/EventBus';
import { BehaviorProfileTracker } from '../player/BehaviorProfile';

export interface StimulusState {
  level: number;
  components: {
    mastery: number;
    consistency: number;
    repetition: number;
    confidence: number;
  };
  isWarning: boolean;
  canMutate: boolean;
  secondsInCurrentWorld: number;
  secondsUntilEligible: number;
  dominantBehavior: string;
}

export class StimulusEngine {
  private tracker: BehaviorProfileTracker;
  private currentWorldStartTime: number = performance.now();
  private totalRunStartTime: number = performance.now();
  private mutationCount: number = 0;
  private currentStimulus: number = 0;
  private isWarningActive: boolean = false;

  constructor(tracker: BehaviorProfileTracker) {
    this.tracker = tracker;
  }

  public resetRun(): void {
    this.currentWorldStartTime = performance.now();
    this.totalRunStartTime = performance.now();
    this.mutationCount = 0;
    this.currentStimulus = 0;
    this.isWarningActive = false;
  }

  public resetWorldTimer(): void {
    this.currentWorldStartTime = performance.now();
    this.isWarningActive = false;
  }

  public registerMutation(): void {
    this.mutationCount++;
    this.resetWorldTimer();
  }

  public update(): StimulusState {
    const config = playtestConfigManager.get();
    const traits = this.tracker.traits;

    // 1. Mastery: precision and success weight
    const mastery = Math.max(0.15, traits.precision);

    // 2. Consistency: rhythm & steady input pacing
    const consistency = Math.max(0.15, traits.rhythm * 0.7 + (1 - traits.hesitation) * 0.3);

    // 3. Repetition / Pattern habit: in diverse genres, pattern adherence has a sensible floor
    const repetition = Math.max(0.35, traits.repetition);

    // 4. Confidence: low hesitation, decisive execution
    const confidence = Math.max(0.15, 1 - traits.hesitation);

    const now = performance.now();
    const secondsInWorld = (now - this.currentWorldStartTime) / 1000;

    const minTimeRequired =
      this.mutationCount === 0
        ? config.mutations.minTimeFirstMutationSec
        : config.mutations.minTimeBetweenMutationsSec;

    // Stimulus calculation according to GDD formula
    // We apply weights from the playtest configuration
    const rawStimulus =
      Math.pow(mastery, config.stimulus.masteryWeight) *
      Math.pow(consistency, config.stimulus.consistencyWeight) *
      Math.pow(repetition, config.stimulus.repetitionWeight) *
      Math.pow(confidence, config.stimulus.confidenceWeight);

    // Fluency bonus as the player sustains mastery and survival over time
    const flowFactor = Math.min(0.22, (secondsInWorld / Math.max(10, minTimeRequired)) * 0.22);

    // Normalize so that fluent gameplay reaches realistic 0.0 - 1.0 range
    const normalizedStimulus = Math.min(1.0, Math.pow(rawStimulus, 0.38) * 1.15 + flowFactor);

    // Smooth transition for stimulus meter
    this.currentStimulus = this.currentStimulus * 0.85 + normalizedStimulus * 0.15;

    const secondsUntilEligible = Math.max(0, minTimeRequired - secondsInWorld);
    const timeEligible = secondsUntilEligible <= 0;

    const isWarning = this.currentStimulus >= config.stimulus.warningThreshold;
    const canMutate = timeEligible && this.currentStimulus >= config.stimulus.mutationThreshold;

    const dominant = this.tracker.getDominantTrait();

    if (isWarning && !this.isWarningActive) {
      this.isWarningActive = true;
      eventBus.emit('stimulus:threshold', {
        level: this.currentStimulus,
        dominantBehavior: dominant.trait,
        isWarning: true,
      });
    } else if (!isWarning) {
      this.isWarningActive = false;
    }

    const state: StimulusState = {
      level: this.currentStimulus,
      components: {
        mastery,
        consistency,
        repetition,
        confidence,
      },
      isWarning,
      canMutate,
      secondsInCurrentWorld: secondsInWorld,
      secondsUntilEligible,
      dominantBehavior: dominant.trait,
    };

    eventBus.emit('stimulus:update', {
      level: this.currentStimulus,
      components: state.components,
      dominantBehavior: dominant.trait,
      isWarning,
      canMutate,
      secondsUntilEligible,
    });

    return state;
  }

  public getStimulusLevel(): number {
    return this.currentStimulus;
  }
}
