import { playtestConfigManager } from '../config/playtestConfig';
import { PlayerActionPayload } from '../core/EventBus';

export interface BehaviorTraits {
  aggression: number;
  evasion: number;
  repetition: number;
  risk: number;
  rhythm: number;
  precision: number;
  hesitation: number;
}

export interface PlayerSignature {
  name: string;
  dominantTraits: [keyof BehaviorTraits, keyof BehaviorTraits];
  description: string;
  archetypeId: string;
}

export class BehaviorProfileTracker {
  public traits: BehaviorTraits = {
    aggression: 0.15,
    evasion: 0.20,
    repetition: 0.25,
    risk: 0.10,
    rhythm: 0.20,
    precision: 0.40,
    hesitation: 0.20,
  };

  private actionHistory: Array<{
    type: string;
    timestamp: number;
    successful: boolean;
  }> = [];

  private lastActionTimestamp: number = performance.now();
  private inputIntervals: number[] = [];
  private comboStreak: number = 0;
  private lastActionType: string = '';

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.traits = {
      aggression: 0.15,
      evasion: 0.20,
      repetition: 0.25,
      risk: 0.10,
      rhythm: 0.20,
      precision: 0.40,
      hesitation: 0.20,
    };
    this.actionHistory = [];
    this.lastActionTimestamp = performance.now();
    this.inputIntervals = [];
    this.comboStreak = 0;
    this.lastActionType = '';
  }

  public recordAction(action: PlayerActionPayload): void {
    const now = performance.now();
    const dt = now - this.lastActionTimestamp;
    this.lastActionTimestamp = now;

    // Track input intervals for rhythm & consistency
    if (dt > 40 && dt < 2000) {
      this.inputIntervals.push(dt);
      if (this.inputIntervals.length > 25) {
        this.inputIntervals.shift();
      }
    }

    const config = playtestConfigManager.get();
    const decay = config.behavior.decayFactor;

    // Repetition detection
    if (action.type === this.lastActionType) {
      this.comboStreak++;
    } else {
      this.comboStreak = 1;
      this.lastActionType = action.type;
    }

    const successful = action.successful !== false;
    this.actionHistory.push({
      type: action.type,
      timestamp: now,
      successful,
    });
    if (this.actionHistory.length > config.behavior.recentActionsMemory) {
      this.actionHistory.shift();
    }

    // Helper to update a single trait via EMA
    const updateTrait = (key: keyof BehaviorTraits, targetWeight: number) => {
      this.traits[key] = this.traits[key] * decay + targetWeight * (1 - decay);
      this.traits[key] = Math.max(0, Math.min(1, this.traits[key]));
    };

    // Calculate dynamic rhythm (low standard deviation in intervals = high rhythm)
    if (this.inputIntervals.length >= 5) {
      const avg = this.inputIntervals.reduce((a, b) => a + b, 0) / this.inputIntervals.length;
      const variance = this.inputIntervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / this.inputIntervals.length;
      const stdDev = Math.sqrt(variance);
      // If stdDev < 60ms, very high rhythm
      const rhythmScore = Math.max(0, Math.min(1, 1 - stdDev / 250));
      updateTrait('rhythm', rhythmScore);
    }

    // Map specific actions according to GDD
    switch (action.type) {
      case 'attack':
        updateTrait('aggression', 0.85);
        if (dt < 250) {
          updateTrait('hesitation', 0.1);
        }
        break;

      case 'kill':
        updateTrait('aggression', 0.9);
        updateTrait('precision', 0.8);
        break;

      case 'dodge':
        updateTrait('evasion', 0.85);
        updateTrait('precision', 0.8);
        updateTrait('rhythm', 0.75);
        break;

      case 'parry':
        updateTrait('evasion', 0.85);
        updateTrait('precision', 0.95);
        updateTrait('rhythm', 0.9);
        updateTrait('hesitation', 0.05);
        break;

      case 'jump':
        updateTrait('evasion', 0.6);
        updateTrait('rhythm', 0.65);
        break;

      case 'repeat_combo':
        updateTrait('repetition', 0.95);
        break;

      case 'risk_take':
        updateTrait('risk', 0.9);
        break;

      case 'hesitate':
        updateTrait('hesitation', 0.85);
        break;

      case 'move':
        // Mild evasion or exploration
        updateTrait('evasion', 0.35);
        break;
    }

    // Check repetition if streak is high
    if (this.comboStreak >= 3) {
      updateTrait('repetition', 0.9);
    }

    // Precision calculation: percentage of successful active actions in window
    const recentActiveSkills = this.actionHistory.filter(
      a => a.type === 'attack' || a.type === 'kill' || a.type === 'dodge' || a.type === 'parry'
    );
    if (recentActiveSkills.length >= 3) {
      const successfulCount = recentActiveSkills.filter(a => a.successful).length;
      const precisionScore = successfulCount / recentActiveSkills.length;
      updateTrait('precision', precisionScore);
    }

    // Hesitation evaluation
    if (dt > 800) {
      updateTrait('hesitation', 0.7);
    } else if (dt < config.behavior.hesitationHighConfidenceCutoffMs) {
      updateTrait('hesitation', Math.max(0, this.traits.hesitation - 0.05));
    }
  }

  public getSignature(): PlayerSignature {
    const entries = Object.entries(this.traits) as [keyof BehaviorTraits, number][];
    entries.sort((a, b) => b[1] - a[1]);

    const dominant1 = entries[0][0];
    const dominant2 = entries[1][0];

    const pair = new Set([dominant1, dominant2]);

    if (pair.has('aggression') && pair.has('risk')) {
      return {
        name: 'O Predador',
        archetypeId: 'predator',
        dominantTraits: [dominant1, dominant2],
        description: 'Ataca sem hesitar, aceita danos e controla o espaço pela força bruta.',
      };
    }
    if (pair.has('evasion') && pair.has('precision')) {
      return {
        name: 'O Fantasma',
        archetypeId: 'ghost',
        dominantTraits: [dominant1, dominant2],
        description: 'Quase intocável. Golpes cirúrgicos nos momentos de menor exposição.',
      };
    }
    if (pair.has('rhythm') && pair.has('repetition')) {
      return {
        name: 'O Metrônomo',
        archetypeId: 'metronome',
        dominantTraits: [dominant1, dominant2],
        description: 'Padrões milimetricamente previsíveis em cadência constante.',
      };
    }
    if (pair.has('hesitation') && pair.has('precision')) {
      return {
        name: 'O Analista',
        archetypeId: 'analyst',
        dominantTraits: [dominant1, dominant2],
        description: 'Observa, estuda o timing e só se compromete quando tem certeza.',
      };
    }
    if (pair.has('risk') && pair.has('aggression')) {
      return {
        name: 'O Caótico',
        archetypeId: 'chaotic',
        dominantTraits: [dominant1, dominant2],
        description: 'Alta variação, movimentos arriscados e constante proximidade do perigo.',
      };
    }
    if (pair.has('repetition') && pair.has('precision')) {
      return {
        name: 'O Contador',
        archetypeId: 'counter',
        dominantTraits: [dominant1, dominant2],
        description: 'O mesmo combo executado com máxima eficiência, repetidamente.',
      };
    }

    return {
      name: `O Vigilante (${dominant1} + ${dominant2})`,
      archetypeId: 'hybrid',
      dominantTraits: [dominant1, dominant2],
      description: 'Equilíbrio adaptativo entre múltiplos estilos de jogo.',
    };
  }

  public getDominantTrait(): { trait: keyof BehaviorTraits; value: number } {
    const entries = Object.entries(this.traits) as [keyof BehaviorTraits, number][];
    entries.sort((a, b) => b[1] - a[1]);
    return { trait: entries[0][0], value: entries[0][1] };
  }

  public getRecentActions(): typeof this.actionHistory {
    return [...this.actionHistory];
  }
}
