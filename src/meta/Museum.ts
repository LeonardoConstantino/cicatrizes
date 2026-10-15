import { SCAR_DEFINITIONS, ScarDefinition } from '../scars/ScarDefinitions';
import { BehaviorTraits } from '../player/BehaviorProfile';

export interface MuseumEntry {
  scarId: string;
  discoveredAtRun: number;
  timestamp: number;
  timesEncountered: number;
  triggerTraitsSnapshot: BehaviorTraits;
  narrativeQuote: string;
}

const STORAGE_KEY = 'cicatriz_museum_entries_v1';

export class MuseumManager {
  private entries: Map<string, MuseumEntry> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const list: MuseumEntry[] = JSON.parse(stored);
        for (const item of list) {
          this.entries.set(item.scarId, item);
        }
      }
    } catch {
      // ignore
    }

    // If museum is empty on first boot, seed with 1 discovered starter entry for nice initial visual
    if (this.entries.size === 0) {
      this.recordDiscovery(
        'ECO',
        1,
        {
          aggression: 0.35,
          evasion: 0.25,
          repetition: 0.82,
          risk: 0.20,
          rhythm: 0.40,
          precision: 0.50,
          hesitation: 0.15,
        }
      );
    }
  }

  private save(): void {
    try {
      const list = Array.from(this.entries.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  public recordDiscovery(scarId: string, runNumber: number, traitsSnapshot: BehaviorTraits): void {
    const existing = this.entries.get(scarId);
    const def = SCAR_DEFINITIONS[scarId];
    if (!def) return;

    if (existing) {
      existing.timesEncountered++;
    } else {
      this.entries.set(scarId, {
        scarId,
        discoveredAtRun: runNumber,
        timestamp: Date.now(),
        timesEncountered: 1,
        triggerTraitsSnapshot: { ...traitsSnapshot },
        narrativeQuote: def.narrative,
      });
    }
    this.save();
  }

  public getAllEntries(): Array<{ entry?: MuseumEntry; def: ScarDefinition }> {
    return Object.values(SCAR_DEFINITIONS).map(def => ({
      def,
      entry: this.entries.get(def.id),
    }));
  }

  public getDiscoveredCount(): number {
    return this.entries.size;
  }

  public getTotalScarsCount(): number {
    return Object.keys(SCAR_DEFINITIONS).length;
  }
}

export const museumManager = new MuseumManager();
