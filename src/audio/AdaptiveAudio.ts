export class AdaptiveAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Master and Layer Gains
  private masterGain: GainNode | null = null;
  private layerGains: {
    beat: GainNode | null;
    bass: GainNode | null;
    melody: GainNode | null;
    texture: GainNode | null;
    noise: GainNode | null;
    memory: GainNode | null;
  } = {
    beat: null,
    bass: null,
    melody: null,
    texture: null,
    noise: null,
    memory: null,
  };

  // Clock & Sequencer
  private bpm: number = 140;
  private step: number = 0;
  private intervalId: number | null = null;
  private currentWorld: string = 'IMPACTO';
  private stimulusLevel: number = 0;

  constructor() {
    // AudioContext will be created on first user interaction
  }

  public init(): void {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create layers
      const createLayer = () => {
        if (!this.ctx || !this.masterGain) return null;
        const g = this.ctx.createGain();
        g.connect(this.masterGain);
        return g;
      };

      this.layerGains.beat = createLayer();
      this.layerGains.bass = createLayer();
      this.layerGains.melody = createLayer();
      this.layerGains.texture = createLayer();
      this.layerGains.noise = createLayer();
      this.layerGains.memory = createLayer();

      // Initialize default volumes
      this.setStimulus(0);

      this.isInitialized = true;
      this.startSequencer();
    } catch (err) {
      console.warn('AudioContext initialization failed or blocked:', err);
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setWorld(worldId: string, customBpm?: number): void {
    this.currentWorld = worldId;
    if (customBpm) {
      this.bpm = customBpm;
    } else {
      switch (worldId) {
        case 'IMPACTO':
          this.bpm = 140;
          break;
        case 'RITMO':
          this.bpm = 128;
          break;
        case 'QUEDA':
          this.bpm = 110;
          break;
        case 'FOME':
          this.bpm = 155;
          break;
        case 'SILENCIO':
          this.bpm = 70;
          break;
        case 'ESPELHO':
          this.bpm = 135;
          break;
        case 'ARQUIVO':
          this.bpm = 145;
          break;
        default:
          this.bpm = 130;
      }
    }
    this.startSequencer();
  }

  public setStimulus(level: number): void {
    this.stimulusLevel = level;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // According to GDD section 13:
    // Bass drops when stimulus > 0.40
    // Melody drops when stimulus > 0.55
    // Texture drops when stimulus > 0.65
    // Restless Noise rises when stimulus > 0.70
    const bassVol = level > 0.40 ? Math.max(0, 1 - (level - 0.40) * 3) : 1;
    const melVol = level > 0.55 ? Math.max(0, 1 - (level - 0.55) * 4) : 1;
    const texVol = level > 0.65 ? Math.max(0, 1 - (level - 0.65) * 5) : 0.8;
    const noiseVol = level > 0.68 ? Math.min(0.4, (level - 0.68) * 2) : 0;
    const memoryVol = level > 0.60 ? Math.min(0.5, (level - 0.60) * 1.5) : 0;

    this.layerGains.beat?.gain.setTargetAtTime(0.8, now, 0.1);
    this.layerGains.bass?.gain.setTargetAtTime(bassVol * 0.7, now, 0.2);
    this.layerGains.melody?.gain.setTargetAtTime(melVol * 0.6, now, 0.2);
    this.layerGains.texture?.gain.setTargetAtTime(texVol * 0.4, now, 0.3);
    this.layerGains.noise?.gain.setTargetAtTime(noiseVol, now, 0.2);
    this.layerGains.memory?.gain.setTargetAtTime(memoryVol, now, 0.3);
  }

  private startSequencer(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
    }
    const msPerStep = (60000 / this.bpm) / 4; // 16th notes
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, msPerStep);
  }

  private tick(): void {
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
    this.step = (this.step + 1) % 16;
    const now = this.ctx.currentTime;

    // 1. Kick on quarter notes
    if (this.step % 4 === 0) {
      this.playSynthKick(now);
    }

    // 2. Snare / Clack on beats 2 and 4
    if (this.step === 4 || this.step === 12) {
      this.playSynthSnare(now);
    }

    // 3. Hi-hat on 8th notes
    if (this.step % 2 === 0) {
      this.playSynthHihat(now);
    }

    // 4. Bass note (E minor / Cyber progression)
    if (this.step % 4 === 0) {
      const notes = [41.2, 41.2, 49.0, 36.7]; // E1, E1, G1, D1
      const note = notes[Math.floor(this.step / 4) % notes.length];
      this.playSynthBass(note, now);
    }

    // 5. Arpeggio / Melody based on current world
    if (this.step % 2 === 1) {
      const scale = this.currentWorld === 'RITMO'
        ? [220, 261.6, 293.66, 329.63, 392]
        : [164.81, 196.0, 220.0, 246.94, 293.66];
      const note = scale[this.step % scale.length];
      this.playSynthMelody(note, now);
    }

    // 6. Restless glitch noise pulse when stimulus is high
    if (this.stimulusLevel > 0.70 && Math.random() < 0.3) {
      this.playGlitchBursts(now);
    }
  }

  private playSynthKick(time: number): void {
    if (!this.ctx || !this.layerGains.beat) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.09);

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.layerGains.beat);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  private playSynthSnare(time: number): void {
    if (!this.ctx || !this.layerGains.beat) return;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.beat);

    noise.start(time);
    noise.stop(time + 0.09);
  }

  private playSynthHihat(time: number): void {
    if (!this.ctx || !this.layerGains.beat) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(4500, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    osc.connect(gain);
    gain.connect(this.layerGains.beat);

    osc.start(time);
    osc.stop(time + 0.035);
  }

  private playSynthBass(freq: number, time: number): void {
    if (!this.ctx || !this.layerGains.bass) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.layerGains.bass);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  private playSynthMelody(freq: number, time: number): void {
    if (!this.ctx || !this.layerGains.melody) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.layerGains.melody);

    osc.start(time);
    osc.stop(time + 0.19);
  }

  private playGlitchBursts(time: number): void {
    if (!this.ctx || !this.layerGains.noise) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 + Math.random() * 400, time);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(gain);
    gain.connect(this.layerGains.noise);

    osc.start(time);
    osc.stop(time + 0.07);
  }

  // Synthesized Sound Effects (SFX)
  public playLaser(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const pitchJitter = 1 + (Math.random() - 0.5) * 0.15;
    osc.frequency.setValueAtTime(880 * pitchJitter, time);
    osc.frequency.exponentialRampToValueAtTime(120, time + 0.09);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  public playMelee(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.12);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  public playExplosion(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.22;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, time);
    filter.frequency.linearRampToValueAtTime(80, time + 0.22);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.23);
  }

  public playTransitionWarp(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(880, time + 0.4);
    osc.frequency.exponentialRampToValueAtTime(90, time + 1.2);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 1.25);
  }

  public playScarApplied(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const chord = [220, 277.18, 329.63, 415.3]; // Major 7th mystery chord
    for (let i = 0; i < chord.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(chord[i], time + i * 0.05);

      gain.gain.setValueAtTime(0.18, time + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time + i * 0.05);
      osc.stop(time + 0.75);
    }
  }

  public playHeartbeat(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.1);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  public playThruster(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.linearRampToValueAtTime(70, time + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, time);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  public playSonarPulse(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, time);
    osc.frequency.exponentialRampToValueAtTime(440, time + 0.35);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.36);
  }

  public playPhaseDash(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, time);
    osc.frequency.exponentialRampToValueAtTime(880, time + 0.18);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.19);
  }

  public playNearMiss(): void {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(1900, time + 0.06);
    osc.frequency.exponentialRampToValueAtTime(380, time + 0.2);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.21);
  }
}

export const adaptiveAudio = new AdaptiveAudioManager();
