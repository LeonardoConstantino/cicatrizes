import { BehaviorTraits, PlayerSignature } from '../player/BehaviorProfile';

export interface RunHistoryEntry {
  runNumber: number;
  score: number;
  scars: string[];
  signatureName: string;
  cycleNumber: number;
  date: string;
}

export interface CuratorMemoryData {
  runCount: number;
  recentScars: string[];
  allDiscoveredScars: string[];
  bestScore: number;
  secondRunFlags: Record<string, boolean>;
  history: RunHistoryEntry[];
}

const STORAGE_KEY = 'cicatriz_curator_memory_v1';

export class CuratorMemory {
  private data: CuratorMemoryData;

  constructor() {
    this.data = this.load();
  }

  private load(): CuratorMemoryData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          runCount: parsed.runCount || 0,
          recentScars: parsed.recentScars || [],
          allDiscoveredScars: parsed.allDiscoveredScars || [],
          bestScore: parsed.bestScore || 0,
          secondRunFlags: parsed.secondRunFlags || {},
          history: Array.isArray(parsed.history) ? parsed.history : [],
        };
      }
    } catch {
      // fallback
    }
    return {
      runCount: 0,
      recentScars: [],
      allDiscoveredScars: [],
      bestScore: 0,
      secondRunFlags: {},
      history: [],
    };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore
    }
  }

  public recordRun(
    score: number,
    scarsEncountered: string[],
    signatureName: string = 'O Peregrino Cego',
    cycleNumber: number = 1
  ): number {
    this.data.runCount++;
    if (score > this.data.bestScore) {
      this.data.bestScore = score;
    }

    for (const s of scarsEncountered) {
      if (!this.data.allDiscoveredScars.includes(s)) {
        this.data.allDiscoveredScars.push(s);
      }
      this.data.recentScars.unshift(s);
    }
    this.data.recentScars = this.data.recentScars.slice(0, 10);

    const now = new Date();
    const dateStr = `${now.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    this.data.history.unshift({
      runNumber: this.data.runCount,
      score,
      scars: [...scarsEncountered],
      signatureName,
      cycleNumber,
      date: dateStr,
    });
    this.data.history = this.data.history.slice(0, 30);

    this.save();
    return this.data.runCount;
  }

  public getRunCount(): number {
    return this.data.runCount;
  }

  public getRecentScars(): string[] {
    return [...this.data.recentScars];
  }

  public getAllDiscoveredScars(): string[] {
    return [...this.data.allDiscoveredScars];
  }

  public getBestScore(): number {
    return this.data.bestScore;
  }

  public getHistory(): RunHistoryEntry[] {
    return [...this.data.history];
  }

  public getMaxCycle(): number {
    if (!this.data.history.length) return 1;
    return Math.max(1, ...this.data.history.map((h) => h.cycleNumber || 1));
  }

  public getMostFrequentArchetype(): string {
    if (!this.data.history.length) return '—';
    const counts: Record<string, number> = {};
    for (const h of this.data.history) {
      counts[h.signatureName] = (counts[h.signatureName] || 0) + 1;
    }
    let top = '—';
    let max = 0;
    for (const [name, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        top = name;
      }
    }
    return top;
  }

  public clearHistory(): void {
    this.data.history = [];
    this.save();
  }

  public setFlag(key: string, value: boolean): void {
    this.data.secondRunFlags[key] = value;
    this.save();
  }

  public getFlag(key: string): boolean {
    return !!this.data.secondRunFlags[key];
  }
}

export class Curator {
  public static generatePostRunMessage(
    runNumber: number,
    signature: PlayerSignature,
    traits: BehaviorTraits,
    accumulatedScars: string[]
  ): string {
    if (runNumber === 1) {
      return 'The archive watched your first steps.';
    }
    if (runNumber === 2) {
      return 'You are forming habits.';
    }
    if (runNumber === 3) {
      return 'You were very consistent.';
    }
    if (runNumber === 5) {
      return 'You stopped hesitating.';
    }
    if (runNumber === 8) {
      return 'I know what you do next.';
    }
    if (runNumber === 12) {
      return 'Do you?';
    }

    // Dynamic reflection based on signature
    if (signature.archetypeId === 'predator') {
      return 'You seek violence before survival. The next world remembered that blood.';
    }
    if (signature.archetypeId === 'ghost') {
      return 'You never let them touch you. But evasion leaves its own hollow trail.';
    }
    if (signature.archetypeId === 'metronome') {
      return 'Your rhythm was your weapon. Now the rhythm is the cage.';
    }
    if (signature.archetypeId === 'counter') {
      return 'You found the optimal pattern. And became its prisoner.';
    }

    if (traits.aggression > 0.7) {
      return 'Your hunger was unmistakable.';
    }
    if (traits.hesitation > 0.6) {
      return 'You watched the blades too long.';
    }

    return `The Curator logged your mark as ${signature.name}.`;
  }
}

export const curatorMemory = new CuratorMemory();
