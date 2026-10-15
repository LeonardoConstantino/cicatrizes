import { playtestConfigManager } from '../config/playtestConfig';
import { BehaviorTraits } from '../player/BehaviorProfile';
import { ScarDefinition, SCAR_DEFINITIONS } from './ScarDefinitions';

export class ScarResolver {
  public static selectNextScar(
    traits: BehaviorTraits,
    activeScars: string[],
    recentScarsHistory: string[]
  ): ScarDefinition {
    const config = playtestConfigManager.get();
    const rareChance = config.scars.rareScarProbability;

    // Check if rare scars are unlocked by active scar combinations
    const rareEligible: ScarDefinition[] = [];
    for (const scar of Object.values(SCAR_DEFINITIONS)) {
      if (scar.rarity === 'rare' && scar.prerequisites) {
        const hasPrereqs = scar.prerequisites.every(p => activeScars.includes(p));
        const evalResult = scar.triggerEvaluator(traits);
        if ((hasPrereqs || evalResult.eligible) && !activeScars.includes(scar.id)) {
          rareEligible.push(scar);
        }
      }
    }

    // Roll chance for rare scar if eligible
    if (rareEligible.length > 0 && Math.random() < rareChance) {
      // Pick random eligible rare scar
      return rareEligible[Math.floor(Math.random() * rareEligible.length)];
    }

    // Otherwise evaluate common scars
    const scoredCandidates: Array<{ scar: ScarDefinition; score: number }> = [];

    for (const scar of Object.values(SCAR_DEFINITIONS)) {
      if (scar.rarity === 'common' && !activeScars.includes(scar.id)) {
        const evalResult = scar.triggerEvaluator(traits);
        let score = evalResult.score;

        // Anti-repetition penalty if used recently in previous runs
        if (recentScarsHistory.includes(scar.id)) {
          score *= 0.5;
        }

        if (evalResult.eligible || score > 0.3) {
          scoredCandidates.push({ scar, score });
        }
      }
    }

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    if (scoredCandidates.length > 0) {
      return scoredCandidates[0].scar;
    }

    // Fallback: pick any unapplied common scar, or unapplied rare scar
    const unappliedCommon = Object.values(SCAR_DEFINITIONS).filter(
      s => s.rarity === 'common' && !activeScars.includes(s.id)
    );
    if (unappliedCommon.length > 0) {
      return unappliedCommon[Math.floor(Math.random() * unappliedCommon.length)];
    }

    const unappliedAny = Object.values(SCAR_DEFINITIONS).filter(
      s => !activeScars.includes(s.id)
    );
    if (unappliedAny.length > 0) {
      return unappliedAny[Math.floor(Math.random() * unappliedAny.length)];
    }

    // Ultimate fallback if all 12 scars are already active
    return Object.values(SCAR_DEFINITIONS)[0];
  }
}
