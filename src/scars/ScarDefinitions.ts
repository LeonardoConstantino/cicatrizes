import { playtestConfigManager } from '../config/playtestConfig';
import { BehaviorTraits } from '../player/BehaviorProfile';

export type ScarRarity = 'common' | 'rare' | 'secret';

export interface ScarDefinition {
  id: string;
  name: string;
  narrative: string;
  description: string;
  rarity: ScarRarity;
  triggerEvaluator: (traits: BehaviorTraits) => { eligible: boolean; score: number };
  prerequisites?: string[]; // For rare/combination scars
  color: string;
}

export const SCAR_DEFINITIONS: Record<string, ScarDefinition> = {
  ECO: {
    id: 'ECO',
    name: 'ECO',
    narrative: 'Você repetia.',
    description: 'O próximo mundo repete seu último ataque ou comando com 800ms de atraso em forma de eco ressonante.',
    rarity: 'common',
    color: '#06b6d4',
    triggerEvaluator: (traits) => {
      const threshold = playtestConfigManager.get().scars.repetitionThresholdEco;
      return { eligible: traits.repetition >= threshold, score: traits.repetition };
    },
  },
  FOME: {
    id: 'FOME',
    name: 'FOME',
    narrative: 'Você destruía sem pensar no que ficava.',
    description: 'Inimigos derrotados deixam fragmentos residuais perigosos que exigem gerenciamento de espaço.',
    rarity: 'common',
    color: '#f97316',
    triggerEvaluator: (traits) => {
      const threshold = playtestConfigManager.get().scars.aggressionThresholdFome;
      return { eligible: traits.aggression >= threshold, score: traits.aggression };
    },
  },
  MEDO: {
    id: 'MEDO',
    name: 'MEDO',
    narrative: 'Você aprendeu a não ser tocado.',
    description: 'Inimigos e esferas fogem ativamente de você quando se aproxima, dificultando colisões necessárias.',
    rarity: 'common',
    color: '#6366f1',
    triggerEvaluator: (traits) => {
      const threshold = playtestConfigManager.get().scars.evasionThresholdMedo;
      return { eligible: traits.evasion >= threshold, score: traits.evasion };
    },
  },
  RITMO: {
    id: 'RITMO',
    name: 'RITMO',
    narrative: 'Você criou um compasso.',
    description: 'Pulsos de perigo e plataformas sincronizam diretamente no seu BPM pessoal de inputs.',
    rarity: 'common',
    color: '#10b981',
    triggerEvaluator: (traits) => {
      const threshold = playtestConfigManager.get().scars.rhythmThresholdRitmo;
      return { eligible: traits.rhythm >= threshold, score: traits.rhythm };
    },
  },
  PRESSA: {
    id: 'PRESSA',
    name: 'PRESSA',
    narrative: 'Você nunca parou.',
    description: 'A velocidade geral de jogo e física do mundo acelera progressivamente a cada segundo.',
    rarity: 'common',
    color: '#ef4444',
    triggerEvaluator: (traits) => {
      const avg = (traits.aggression + traits.risk) / 2;
      const threshold = playtestConfigManager.get().scars.hasteThresholdPressa;
      return { eligible: avg >= threshold, score: avg };
    },
  },
  ANKORA: {
    id: 'ANKORA',
    name: 'ÂNCORA',
    narrative: 'Você hesitava antes de comprometer.',
    description: 'Ações de ataque pesam mais: há um atraso de compromisso de 120ms na liberação do golpe.',
    rarity: 'common',
    color: '#8b5cf6',
    triggerEvaluator: (traits) => {
      const threshold = playtestConfigManager.get().scars.hesitationThresholdAnkora;
      return { eligible: traits.hesitation >= threshold, score: traits.hesitation };
    },
  },
  REFLEXO: {
    id: 'REFLEXO',
    name: 'REFLEXO',
    narrative: 'Você era previsível na sua precisão.',
    description: 'Inimigos nascem exatamente onde seus projéteis e ataques costumam terminar.',
    rarity: 'common',
    color: '#ec4899',
    triggerEvaluator: (traits) => {
      const threshold = playtestConfigManager.get().scars.precisionThresholdReflexo;
      return { eligible: traits.precision >= threshold, score: traits.precision };
    },
  },
  SILENCIO: {
    id: 'SILENCIO',
    name: 'SILÊNCIO',
    narrative: 'Você não precisava das muletas.',
    description: 'Elementos da HUD dissolvem de forma acelerada no próximo mundo até restar apenas a intuição.',
    rarity: 'common',
    color: '#e2e8f0',
    triggerEvaluator: (traits) => {
      const avg = (traits.evasion + traits.precision) / 2;
      const threshold = playtestConfigManager.get().scars.silenceThresholdSilencio;
      return { eligible: avg >= threshold, score: avg };
    },
  },
  DIVIDA: {
    id: 'DIVIDA',
    name: 'DÍVIDA',
    narrative: 'Você apostou tudo e ganhou. Por enquanto.',
    description: 'Kills acumulam dívida de risco; a cada 5 eliminações, uma onda de choque de cobrança explode.',
    rarity: 'common',
    color: '#eab308',
    triggerEvaluator: (traits) => {
      const threshold = playtestConfigManager.get().scars.debtThresholdDivida;
      return { eligible: traits.risk >= threshold, score: traits.risk };
    },
  },
  ESPELHO: {
    id: 'ESPELHO',
    name: 'ESPELHO',
    narrative: 'Você ensinou o mundo a ser você.',
    description: 'Inimigos começam a imitar sua rota de esquiva e contra-atacar em tempos idênticos.',
    rarity: 'common',
    color: '#a855f7',
    triggerEvaluator: (traits) => {
      const avg = (traits.aggression + traits.repetition) / 2;
      const threshold = playtestConfigManager.get().scars.mirrorThresholdEspelho;
      return { eligible: avg >= threshold, score: avg };
    },
  },

  // Rare Scars (Combinations)
  FANTASMA: {
    id: 'FANTASMA',
    name: 'FANTASMA',
    narrative: 'O passado não desapareceu. Ele aprendeu a jogar.',
    description: 'Uma silhueta translúcida sua reproduz seus movimentos passados, criando um duplo no campo.',
    rarity: 'rare',
    color: '#38bdf8',
    prerequisites: ['ECO', 'ESPELHO'],
    triggerEvaluator: (traits) => {
      const avg = (traits.repetition + traits.aggression) / 2;
      return { eligible: avg >= 0.65, score: avg };
    },
  },
  PULSO: {
    id: 'PULSO',
    name: 'PULSO',
    narrative: 'A interface morreu. O batimento assumiu.',
    description: 'Toda a HUD é substituída pelo ritmo cardíaco e sonoro. Sua saúde e perigo são audíveis.',
    rarity: 'rare',
    color: '#10b981',
    prerequisites: ['RITMO', 'SILENCIO'],
    triggerEvaluator: (traits) => {
      const avg = (traits.rhythm + traits.precision) / 2;
      return { eligible: avg >= 0.65, score: avg };
    },
  },
  COLAPSO: {
    id: 'COLAPSO',
    name: 'COLAPSO',
    narrative: 'Cada conquista rasgou as bordas da realidade.',
    description: 'A arena se distorce e encolhe/expande dramaticamente a cada abate.',
    rarity: 'rare',
    color: '#f43f5e',
    prerequisites: ['FOME', 'DIVIDA'],
    triggerEvaluator: (traits) => {
      const avg = (traits.aggression + traits.risk) / 2;
      return { eligible: avg >= 0.65, score: avg };
    },
  },
  PARALISIA: {
    id: 'PARALISIA',
    name: 'PARALISIA',
    narrative: 'O tempo se curva à sua inércia.',
    description: 'O mundo desacelera drasticamente quando você para de se mover.',
    rarity: 'rare',
    color: '#818cf8',
    prerequisites: ['ANKORA', 'MEDO'],
    triggerEvaluator: (traits) => {
      const avg = (traits.hesitation + traits.evasion) / 2;
      return { eligible: avg >= 0.65, score: avg };
    },
  },
};
