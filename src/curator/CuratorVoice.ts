import { playtestConfigManager } from '../config/playtestConfig';

export type CuratorMood = 'observation' | 'warning' | 'judgment' | 'revelation';

export interface CuratorWhisper {
  id: string;
  text: string;
  subtext?: string;
  mood: CuratorMood;
  timestamp: number;
}

type WhisperListener = (whisper: CuratorWhisper | null) => void;

class CuratorVoiceEngine {
  private listeners: WhisperListener[] = [];
  private currentWhisper: CuratorWhisper | null = null;
  private lastWhisperTime: number = 0;
  private dismissTimer: number | null = null;

  // Trackers
  private consecutiveDodges: number = 0;
  private consecutiveAttacks: number = 0;
  private rapidKills: number = 0;
  private lastKillTime: number = 0;
  private wasInCriticalState: boolean = false;

  public subscribe(listener: WhisperListener): () => void {
    this.listeners.push(listener);
    listener(this.currentWhisper);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(whisper: CuratorWhisper | null): void {
    this.currentWhisper = whisper;
    for (const l of this.listeners) {
      l(whisper);
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }
    return window.speechSynthesis.getVoices();
  }

  public stopVoice(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public speakSynthesizer(
    text: string,
    customConfig?: {
      volume?: number;
      pitch?: number;
      rate?: number;
      voiceUri?: string;
      lang?: string;
    }
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const config = playtestConfigManager.get().curatorVoice;
    const enabled = customConfig?.volume !== undefined ? true : config.enabled;
    if (!enabled) return;

    try {
      window.speechSynthesis.cancel();

      // Clean text for speech: short, clear and mysterious
      const cleanText = text
        .replace(/[“"”]/g, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Volume is deliberately kept low initially (~0.28) so it doesn't scare the player
      utterance.volume = Math.max(0.01, Math.min(1.0, customConfig?.volume ?? config.volume ?? 0.28));
      utterance.pitch = Math.max(0.5, Math.min(1.8, customConfig?.pitch ?? config.pitch ?? 0.85));
      utterance.rate = Math.max(0.5, Math.min(1.8, customConfig?.rate ?? config.rate ?? 0.92));
      utterance.lang = customConfig?.lang || config.lang || 'pt-BR';

      const voices = window.speechSynthesis.getVoices();
      const targetVoiceUri = customConfig?.voiceUri !== undefined ? customConfig.voiceUri : config.voiceUri;

      if (targetVoiceUri && voices.length > 0) {
        const found = voices.find(v => v.voiceURI === targetVoiceUri);
        if (found) {
          utterance.voice = found;
        }
      } else if (voices.length > 0) {
        // Auto-select preferred Portuguese voice or atmospheric default
        const ptVoice = voices.find(v => v.lang.startsWith('pt')) ||
          voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural')));
        if (ptVoice) {
          utterance.voice = ptVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis fallback without error
    }
  }

  public speak(text: string, mood: CuratorMood = 'observation', subtext?: string, force: boolean = false): void {
    const now = performance.now();
    // Throttle messages to avoid clutter (min 8 seconds between normal messages)
    if (!force && now - this.lastWhisperTime < 8000) {
      return;
    }

    this.lastWhisperTime = now;
    if (this.dismissTimer !== null) {
      window.clearTimeout(this.dismissTimer);
    }

    const whisper: CuratorWhisper = {
      id: `curator_${now}`,
      text,
      subtext,
      mood,
      timestamp: now,
    };

    this.emit(whisper);

    // Speak audio line through Speech Synthesis
    this.speakSynthesizer(text);

    // Auto-dismiss visual banner after 4.2 seconds
    this.dismissTimer = window.setTimeout(() => {
      this.emit(null);
      this.dismissTimer = null;
    }, 4200);
  }

  public onPlayerAction(action: string, combo: number, identity: number, maxIdentity: number): void {
    const now = performance.now();

    // Check critical state
    const isCritical = identity < maxIdentity * 0.25;
    if (isCritical && !this.wasInCriticalState) {
      this.wasInCriticalState = true;
      this.speak('A hesitação cobra seu preço.', 'warning', 'Sua integridade está se esvaindo.', true);
      return;
    }
    if (!isCritical && this.wasInCriticalState) {
      this.wasInCriticalState = false;
      this.speak('Você recusa o esquecimento.', 'revelation', 'Integridade recuperada.');
    }

    // Check combo milestones (short, poignant phrases)
    if (combo === 8) {
      this.speak('Você encontrou uma cadência.', 'observation');
      return;
    }
    if (combo === 16) {
      this.speak('O ritmo agora comanda sua mão.', 'judgment');
      return;
    }
    if (combo === 24) {
      this.speak('Perfeição é apenas um hábito repetido.', 'revelation');
      return;
    }

    // Check rapid kills
    if (action === 'kill') {
      if (now - this.lastKillTime < 2200) {
        this.rapidKills++;
        if (this.rapidKills >= 4) {
          this.rapidKills = 0;
          this.speak('Sua fome é insaciável.', 'judgment', 'O mundo registra sua agressividade.');
          return;
        }
      } else {
        this.rapidKills = 1;
      }
      this.lastKillTime = now;
    }

    // Check dodges
    if (action === 'dodge' || action === 'parry') {
      this.consecutiveDodges++;
      this.consecutiveAttacks = 0;
      if (this.consecutiveDodges >= 5) {
        this.consecutiveDodges = 0;
        this.speak('Você dança entre as lâminas.', 'observation', 'Evasão cirúrgica registrada.');
        return;
      }
    } else if (action === 'attack') {
      this.consecutiveAttacks++;
      this.consecutiveDodges = 0;
      if (this.consecutiveAttacks >= 12) {
        this.consecutiveAttacks = 0;
        this.speak('Previsível na sua insistência.', 'judgment', 'Hábito repetitivo em escalada.');
        return;
      }
    }
  }

  public onMutationTriggered(scarName: string, narrative: string): void {
    this.speak(
      `O novo mundo herdou sua cicatriz: ${scarName}.`,
      'revelation',
      `“${narrative}”`,
      true
    );
  }
}

export const curatorVoice = new CuratorVoiceEngine();
