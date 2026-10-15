import defaultConfigJson from './playtestConfig.json';

export interface PlaytestConfig {
  stimulus: {
    mutationThreshold: number;
    warningThreshold: number;
    masteryWeight: number;
    consistencyWeight: number;
    repetitionWeight: number;
    confidenceWeight: number;
    evaluationWindowSize: number;
  };
  mutations: {
    minTimeFirstMutationSec: number;
    minTimeBetweenMutationsSec: number;
    phases: {
      disturbanceMs: number;
      metamorphosisMs: number;
      emergenceMs: number;
    };
    preserveMomentum: boolean;
    preservePlayerPosition: boolean;
  };
  hud: {
    dissolutionSpeedMultiplier: number;
    hpFadeThreshold: number;
    comboFadeThreshold: number;
    scoreFadeThreshold: number;
    fullMinimalSymbolThreshold: number;
    dramaticReturnDurationMs: number;
  };
  scars: {
    rareScarProbability: number;
    repetitionThresholdEco: number;
    aggressionThresholdFome: number;
    evasionThresholdMedo: number;
    rhythmThresholdRitmo: number;
    hasteThresholdPressa: number;
    hesitationThresholdAnkora: number;
    precisionThresholdReflexo: number;
    silenceThresholdSilencio: number;
    debtThresholdDivida: number;
    mirrorThresholdEspelho: number;
  };
  behavior: {
    decayFactor: number;
    recentActionsMemory: number;
    hesitationHighConfidenceCutoffMs: number;
  };
  juice: {
    hitstopMs: number;
    cameraShakeIntensity: number;
    crtScanlines: boolean;
    screenDistortion: boolean;
  };
  curatorVoice: {
    enabled: boolean;
    volume: number;
    pitch: number;
    rate: number;
    voiceUri: string;
    lang: string;
  };
}

export const DEFAULT_PLAYTEST_CONFIG: PlaytestConfig = defaultConfigJson as PlaytestConfig;

export const PLAYTEST_PRESETS: Record<string, { name: string; description: string; config: PlaytestConfig }> = {
  gdd_default: {
    name: 'Padrão do GDD (0.72)',
    description: 'Equilíbrio canônico do documento de design (90s 1ª mutação, threshold 0.72, 30% raras).',
    config: JSON.parse(JSON.stringify(DEFAULT_PLAYTEST_CONFIG)),
  },
  fast_playtest: {
    name: 'Playtest Acelerado (15s)',
    description: 'Ideal para testar transições rápidas e fluxo de cicatrizes sem esperar 90 segundos.',
    config: {
      ...JSON.parse(JSON.stringify(DEFAULT_PLAYTEST_CONFIG)),
      stimulus: {
        ...DEFAULT_PLAYTEST_CONFIG.stimulus,
        mutationThreshold: 0.60,
        warningThreshold: 0.45,
      },
      mutations: {
        ...DEFAULT_PLAYTEST_CONFIG.mutations,
        minTimeFirstMutationSec: 15,
        minTimeBetweenMutationsSec: 15,
      },
      hud: {
        ...DEFAULT_PLAYTEST_CONFIG.hud,
        dissolutionSpeedMultiplier: 1.8,
      },
    },
  },
  high_chaos: {
    name: 'Caos Total (Mutação Frequente & 60% Raras)',
    description: 'Limiar baixo (0.50), transições rápidas e alta incidência de cicatrizes raras combinadas.',
    config: {
      ...JSON.parse(JSON.stringify(DEFAULT_PLAYTEST_CONFIG)),
      stimulus: {
        ...DEFAULT_PLAYTEST_CONFIG.stimulus,
        mutationThreshold: 0.50,
        warningThreshold: 0.35,
      },
      mutations: {
        ...DEFAULT_PLAYTEST_CONFIG.mutations,
        minTimeFirstMutationSec: 12,
        minTimeBetweenMutationsSec: 12,
      },
      scars: {
        ...DEFAULT_PLAYTEST_CONFIG.scars,
        rareScarProbability: 0.60,
      },
      hud: {
        ...DEFAULT_PLAYTEST_CONFIG.hud,
        dissolutionSpeedMultiplier: 2.2,
      },
    },
  },
  zen_arcade: {
    name: 'Arcade Puro (Mutação Lenta & HUD Estável)',
    description: 'Mutação em 0.85, 180s mínimo, foco em sobrevivência de longo prazo e estabilidade de HUD.',
    config: {
      ...JSON.parse(JSON.stringify(DEFAULT_PLAYTEST_CONFIG)),
      stimulus: {
        ...DEFAULT_PLAYTEST_CONFIG.stimulus,
        mutationThreshold: 0.85,
        warningThreshold: 0.70,
      },
      mutations: {
        ...DEFAULT_PLAYTEST_CONFIG.mutations,
        minTimeFirstMutationSec: 120,
        minTimeBetweenMutationsSec: 90,
      },
      hud: {
        ...DEFAULT_PLAYTEST_CONFIG.hud,
        dissolutionSpeedMultiplier: 0.5,
      },
    },
  },
};

const STORAGE_KEY = 'cicatriz_playtest_config_v1';

class PlaytestConfigManager {
  private currentConfig: PlaytestConfig;
  private listeners: Set<(config: PlaytestConfig) => void> = new Set();

  constructor() {
    this.currentConfig = this.loadConfig();
  }

  private loadConfig(): PlaytestConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge deep with default to ensure any new keys are preserved
        return {
          ...DEFAULT_PLAYTEST_CONFIG,
          ...parsed,
          stimulus: { ...DEFAULT_PLAYTEST_CONFIG.stimulus, ...(parsed.stimulus || {}) },
          mutations: { ...DEFAULT_PLAYTEST_CONFIG.mutations, ...(parsed.mutations || {}) },
          hud: { ...DEFAULT_PLAYTEST_CONFIG.hud, ...(parsed.hud || {}) },
          scars: { ...DEFAULT_PLAYTEST_CONFIG.scars, ...(parsed.scars || {}) },
          behavior: { ...DEFAULT_PLAYTEST_CONFIG.behavior, ...(parsed.behavior || {}) },
          juice: { ...DEFAULT_PLAYTEST_CONFIG.juice, ...(parsed.juice || {}) },
        };
      }
    } catch {
      // fallback to default
    }
    return JSON.parse(JSON.stringify(DEFAULT_PLAYTEST_CONFIG));
  }

  public get(): PlaytestConfig {
    return this.currentConfig;
  }

  public set(newConfig: PlaytestConfig) {
    this.currentConfig = JSON.parse(JSON.stringify(newConfig));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentConfig));
    } catch {
      // ignore storage errors
    }
    this.notify();
  }

  public resetToDefault() {
    this.set(DEFAULT_PLAYTEST_CONFIG);
  }

  public applyPreset(presetKey: string) {
    const preset = PLAYTEST_PRESETS[presetKey];
    if (preset) {
      this.set(preset.config);
    }
  }

  public exportJsonString(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  public importJsonString(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed.stimulus === 'object') {
        this.set({
          ...DEFAULT_PLAYTEST_CONFIG,
          ...parsed,
          stimulus: { ...DEFAULT_PLAYTEST_CONFIG.stimulus, ...(parsed.stimulus || {}) },
          mutations: { ...DEFAULT_PLAYTEST_CONFIG.mutations, ...(parsed.mutations || {}) },
          hud: { ...DEFAULT_PLAYTEST_CONFIG.hud, ...(parsed.hud || {}) },
          scars: { ...DEFAULT_PLAYTEST_CONFIG.scars, ...(parsed.scars || {}) },
          behavior: { ...DEFAULT_PLAYTEST_CONFIG.behavior, ...(parsed.behavior || {}) },
          juice: { ...DEFAULT_PLAYTEST_CONFIG.juice, ...(parsed.juice || {}) },
        });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  public subscribe(callback: (config: PlaytestConfig) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentConfig);
    }
  }
}

export const playtestConfigManager = new PlaytestConfigManager();
