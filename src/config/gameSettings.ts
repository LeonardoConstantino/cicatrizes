export interface GameSettings {
  reduceFlashes: boolean;
  cameraShakeMultiplier: number;
  crtScanlines: boolean;
  screenDistortion: boolean;
  touchControlsEnabled: boolean;
}

const SETTINGS_KEY = 'cicatriz_player_settings_v1';

const DEFAULT_SETTINGS: GameSettings = {
  reduceFlashes: false,
  cameraShakeMultiplier: 1.0,
  crtScanlines: true,
  screenDistortion: true,
  touchControlsEnabled: true,
};

class GameSettingsManager {
  private settings: GameSettings;

  constructor() {
    this.settings = this.load();
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // fallback to defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  public get(): GameSettings {
    return { ...this.settings };
  }

  public update(patch: Partial<GameSettings>): GameSettings {
    this.settings = { ...this.settings, ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore local storage error
    }
    return this.get();
  }

  public reset(): GameSettings {
    this.settings = { ...DEFAULT_SETTINGS };
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch {
      // ignore
    }
    return this.get();
  }
}

export const gameSettingsManager = new GameSettingsManager();
