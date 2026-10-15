import { World } from './World';
import { ShooterWorld } from './ShooterWorld';
import { RhythmWorld } from './RhythmWorld';
import { QuedaWorld } from './QuedaWorld';
import { HungerWorld } from './HungerWorld';
import { SilencioWorld } from './SilencioWorld';
import { MirrorWorld } from './MirrorWorld';

export class WorldRegistry {
  private static worlds: Map<string, World> = new Map();

  static {
    const w1 = new ShooterWorld();
    const w2 = new RhythmWorld();
    const w3 = new QuedaWorld();
    const w4 = new HungerWorld();
    const w5 = new SilencioWorld();
    const w6 = new MirrorWorld();

    this.worlds.set(w1.id, w1);
    this.worlds.set(w2.id, w2);
    this.worlds.set(w3.id, w3);
    this.worlds.set(w4.id, w4);
    this.worlds.set(w5.id, w5);
    this.worlds.set(w6.id, w6);
  }

  public static getWorld(id: string): World | undefined {
    return this.worlds.get(id);
  }

  public static getNextWorldId(currentWorldId: string): string {
    const sequence = ['IMPACTO', 'RITMO', 'QUEDA', 'FOME', 'SILENCIO', 'ESPELHO'];
    const idx = sequence.indexOf(currentWorldId);
    if (idx >= 0 && idx < sequence.length - 1) {
      return sequence[idx + 1];
    }
    // Loop back or restart loop with higher difficulty
    return sequence[0];
  }

  public static getAllWorlds(): World[] {
    return Array.from(this.worlds.values());
  }
}
