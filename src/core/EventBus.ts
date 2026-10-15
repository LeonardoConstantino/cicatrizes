export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerActionPayload {
  type: 'attack' | 'dodge' | 'jump' | 'parry' | 'hesitate' | 'kill' | 'risk_take' | 'move' | 'repeat_combo';
  weight: number;
  position?: Vec2;
  successful?: boolean;
}

export interface StimulusUpdatePayload {
  level: number;
  components: {
    mastery: number;
    consistency: number;
    repetition: number;
    confidence: number;
  };
  dominantBehavior: string;
  isWarning: boolean;
  canMutate: boolean;
  secondsUntilEligible: number;
}

export interface MutationTriggerPayload {
  fromWorld: string;
  toWorld: string;
  scarId: string;
  scarName: string;
}

export interface TransitionProgressPayload {
  phase: 'disturbance' | 'metamorphosis' | 'emergence';
  progress: number;
  timeRemainingMs: number;
}

export interface IdentityFragmentPayload {
  reason: string;
  amount: number;
  remaining: number;
  max: number;
}

export type GameEventMap = {
  'player:action': PlayerActionPayload;
  'player:pattern': { pattern: string; confidence: number };
  'player:death': { cause: string; worldId: string };
  'stimulus:update': StimulusUpdatePayload;
  'stimulus:threshold': { level: number; dominantBehavior: string; isWarning: boolean };
  'mutation:triggered': MutationTriggerPayload;
  'transition:begin': { fromWorld: string; toWorld: string; scarId: string; duration: number };
  'transition:phase': TransitionProgressPayload;
  'transition:complete': { worldId: string; scarId: string };
  'scar:applied': { scarId: string; name: string; description: string; rarity: 'common' | 'rare' | 'secret' };
  'hud:dissolve': { level: number; isMinimal: boolean };
  'curator:message': { text: string; delay?: number };
  'identity:fragment': IdentityFragmentPayload;
  'session:complete': { runNumber: number; score: number; won: boolean; finalReason?: string };
  'score:update': { score: number; combo: number; debt: number };
  'config:updated': void;
};

type EventHandler<T> = (data: T) => void;

class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers: { [K in keyof GameEventMap]?: Set<EventHandler<any>> } = {};

  public on<K extends keyof GameEventMap>(event: K, handler: EventHandler<GameEventMap[K]>): () => void {
    if (!this.handlers[event]) {
      this.handlers[event] = new Set();
    }
    this.handlers[event]!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off<K extends keyof GameEventMap>(event: K, handler: EventHandler<GameEventMap[K]>): void {
    const set = this.handlers[event];
    if (set) {
      set.delete(handler);
    }
  }

  public emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void {
    const set = this.handlers[event];
    if (set) {
      for (const handler of Array.from(set)) {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in EventBus handler for event ${String(event)}:`, err);
        }
      }
    }
  }

  public clear(): void {
    this.handlers = {};
  }
}

export const eventBus = new EventBus();
