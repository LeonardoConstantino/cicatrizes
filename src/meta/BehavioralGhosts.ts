import { BehaviorTraits, PlayerSignature } from '../player/BehaviorProfile';

export interface GhostFrame {
  t: number; // Elapsed ms from start of run
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  action?: string;
}

export interface GhostData {
  id: string;
  name: string;
  signature: PlayerSignature;
  traits: BehaviorTraits;
  dominantScar: string;
  color: string;
  description: string;
  isCustomRecording?: boolean;
  score?: number;
  runNumber?: number;
  createdAt?: string;
  recordedFrames?: GhostFrame[];
}

export const PRESET_GHOSTS: GhostData[] = [
  {
    id: 'ghost_predator',
    name: 'Fantasma #01 — O Predador',
    signature: {
      name: 'O Predador',
      archetypeId: 'predator',
      dominantTraits: ['aggression', 'risk'],
      description: 'Ataca sem hesitar, persegue inimigos e controla o espaço pela força bruta.',
    },
    traits: {
      aggression: 0.92,
      risk: 0.85,
      evasion: 0.20,
      repetition: 0.65,
      rhythm: 0.40,
      precision: 0.75,
      hesitation: 0.08,
    },
    dominantScar: 'FOME',
    color: '#ef4444',
    description: 'Agressividade destrutiva. Persegue e desfere ataques espectrais contra inimigos.',
  },
  {
    id: 'ghost_phantom',
    name: 'Fantasma #02 — O Fantasma',
    signature: {
      name: 'O Fantasma',
      archetypeId: 'ghost',
      dominantTraits: ['evasion', 'precision'],
      description: 'Quase intocável. Golpes cirúrgicos e desvios graciosos nos momentos de perigo.',
    },
    traits: {
      aggression: 0.25,
      risk: 0.15,
      evasion: 0.95,
      repetition: 0.30,
      rhythm: 0.50,
      precision: 0.88,
      hesitation: 0.22,
    },
    dominantScar: 'MEDO',
    color: '#38bdf8',
    description: 'Sobrevivência cirúrgica. Executa manobras evasivas autônomas e atrai projéteis.',
  },
  {
    id: 'ghost_metronome',
    name: 'Fantasma #03 — O Metrônomo',
    signature: {
      name: 'O Metrônomo',
      archetypeId: 'metronome',
      dominantTraits: ['rhythm', 'repetition'],
      description: 'Padrões milimetricamente previsíveis em cadência de compasso constante.',
    },
    traits: {
      aggression: 0.50,
      risk: 0.35,
      evasion: 0.45,
      repetition: 0.89,
      rhythm: 0.94,
      precision: 0.60,
      hesitation: 0.10,
    },
    dominantScar: 'RITMO',
    color: '#10b981',
    description: 'Dispara, salta e emite ondas sonoras em intervalos idênticos ao compasso do mundo.',
  },
];

const LOCAL_STORAGE_KEY = 'cicatriz_personal_ghosts_v1';

export class GhostStorage {
  public static getSavedGhosts(): GhostData[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public static savePersonalGhost(ghost: GhostData): void {
    try {
      const list = this.getSavedGhosts().filter(g => g.id !== ghost.id);
      list.unshift(ghost);
      // Keep up to 3 best personal ghosts to manage storage
      const trimmed = list.slice(0, 3);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore
    }
  }

  public static deletePersonalGhost(id: string): void {
    try {
      const list = this.getSavedGhosts().filter(g => g.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignore
    }
  }

  public static exportGhostCode(ghost: GhostData): string {
    const json = JSON.stringify(ghost);
    return btoa(encodeURIComponent(json));
  }

  public static importGhostCode(code: string): GhostData | null {
    try {
      const json = decodeURIComponent(atob(code.trim()));
      const parsed = JSON.parse(json) as GhostData;
      if (parsed.id && parsed.name && parsed.signature && parsed.traits) {
        return parsed;
      }
    } catch {
      // Invalid code
    }
    return null;
  }
}

/**
 * Recorder for active player run to produce reusable GhostData
 */
export class GhostRecorder {
  private startTime: number = 0;
  private frames: GhostFrame[] = [];
  private lastRecordTime: number = 0;
  private isRecording: boolean = false;

  public start(): void {
    this.startTime = performance.now();
    this.frames = [];
    this.lastRecordTime = 0;
    this.isRecording = true;
  }

  public record(
    x: number,
    y: number,
    vx: number,
    vy: number,
    facingAngle: number,
    action: GhostFrame['action'] = 'none'
  ): void {
    if (!this.isRecording) return;
    const now = performance.now();
    const elapsed = now - this.startTime;

    // Record at ~10Hz or immediately upon actions (attack, jump, parry)
    const isAction = action && action !== 'none';
    if (isAction || elapsed - this.lastRecordTime >= 95) {
      this.lastRecordTime = elapsed;
      // Cap at 1500 frames (~2.5 minutes) to ensure fast serialization
      if (this.frames.length < 1500) {
        this.frames.push({
          t: Math.round(elapsed),
          x: Math.round(x),
          y: Math.round(y),
          vx: Math.round(vx * 10) / 10,
          vy: Math.round(vy * 10) / 10,
          facingAngle: Math.round(facingAngle * 100) / 100,
          action: isAction ? action : undefined,
        });
      }
    }
  }

  public finish(
    runNumber: number,
    score: number,
    signature: PlayerSignature,
    traits: BehaviorTraits,
    dominantScar: string
  ): GhostData | null {
    this.isRecording = false;
    if (this.frames.length < 15) return null; // Too short to be meaningful

    const colors: Record<string, string> = {
      predator: '#ef4444',
      ghost: '#38bdf8',
      metronome: '#10b981',
      counter: '#a855f7',
      architect: '#f59e0b',
    };

    const ghost: GhostData = {
      id: `personal_run_${runNumber}_${Date.now()}`,
      name: `Seu Eu Anterior (Run #${runNumber})`,
      signature,
      traits: { ...traits },
      dominantScar: dominantScar || 'ECO',
      color: colors[signature.archetypeId] || '#38bdf8',
      description: `Rastro autêntico gravado no seu ${signature.name} com ${score.toLocaleString()} pts.`,
      isCustomRecording: true,
      score,
      runNumber,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recordedFrames: [...this.frames],
    };

    GhostStorage.savePersonalGhost(ghost);
    return ghost;
  }
}
