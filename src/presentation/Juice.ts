import { playtestConfigManager } from '../config/playtestConfig';
import { gameSettingsManager } from '../config/gameSettings';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  vy: number;
  alpha: number;
  scale: number;
  life: number;
  maxLife: number;
  isCrit: boolean;
}

export interface MotionGhost {
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  avatarType: string;
}

export class JuiceSystem {
  private static shakeOffset: { x: number; y: number } = { x: 0, y: 0 };
  private static shakeDuration: number = 0;
  private static shakeMaxDuration: number = 0;
  private static shakeIntensity: number = 0;

  private static flashAlpha: number = 0;
  private static flashColor: string = '#ffffff';

  private static glitchIntensity: number = 0;
  private static glitchDuration: number = 0;
  private static glitchMaxDuration: number = 0;

  private static hitstopRemainingMs: number = 0;
  private static particles: Particle[] = [];
  private static floatingTexts: FloatingText[] = [];
  private static motionGhosts: MotionGhost[] = [];
  private static textIdCounter = 0;

  public static cameraShake(intensity?: number, durationMs: number = 140): void {
    const defaultIntensity = playtestConfigManager.get().juice.cameraShakeIntensity;
    const mult = gameSettingsManager.get().cameraShakeMultiplier;
    this.shakeIntensity = (intensity ?? defaultIntensity) * mult;
    this.shakeDuration = durationMs;
    this.shakeMaxDuration = durationMs;
  }

  public static hitstop(durationMs?: number): void {
    const defaultDuration = playtestConfigManager.get().juice.hitstopMs;
    this.hitstopRemainingMs = durationMs ?? defaultDuration;
  }

  public static screenFlash(color: string = '#ffffff', alpha: number = 0.35): void {
    if (gameSettingsManager.get().reduceFlashes) return;
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  public static triggerGlitch(intensity: number = 8, durationMs: number = 130): void {
    if (!gameSettingsManager.get().screenDistortion) return;
    this.glitchIntensity = intensity;
    this.glitchDuration = durationMs;
    this.glitchMaxDuration = durationMs;
  }

  public static spawnParticles(
    x: number,
    y: number,
    count: number = 12,
    color: string = '#ffffff',
    speed: number = 4
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      const maxLife = 18 + Math.floor(Math.random() * 16);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 2 + Math.random() * 3.5,
        color,
        alpha: 1,
        life: 0,
        maxLife,
      });
    }
  }

  public static spawnText(
    x: number,
    y: number,
    text: string,
    color: string = '#f59e0b',
    size: number = 14,
    isCrit: boolean = false
  ): void {
    this.floatingTexts.push({
      id: ++this.textIdCounter,
      x: x + (Math.random() * 14 - 7),
      y: y + (Math.random() * 6 - 3),
      text,
      color,
      size: isCrit ? size * 1.25 : size,
      vy: isCrit ? -1.8 : -1.3,
      alpha: 1,
      scale: isCrit ? 1.6 : 1.35,
      life: 0,
      maxLife: isCrit ? 42 : 34,
      isCrit,
    });
  }

  public static spawnMotionGhost(
    x: number,
    y: number,
    angle: number,
    width: number,
    height: number,
    color: string = '#38bdf8',
    avatarType: string = 'ship'
  ): void {
    if (this.motionGhosts.length > 25) {
      this.motionGhosts.shift();
    }
    this.motionGhosts.push({
      x,
      y,
      angle,
      width,
      height,
      color,
      alpha: 0.55,
      life: 0,
      maxLife: 14,
      avatarType,
    });
  }

  public static update(dtMs: number): boolean {
    // If in hitstop, freeze gameplay update
    if (this.hitstopRemainingMs > 0) {
      this.hitstopRemainingMs -= dtMs;
      return true; // indicates frozen frame
    }

    // Camera shake decay
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dtMs;
      const progress = Math.max(0, this.shakeDuration / this.shakeMaxDuration);
      this.shakeOffset.x = (Math.random() * 2 - 1) * this.shakeIntensity * progress;
      this.shakeOffset.y = (Math.random() * 2 - 1) * this.shakeIntensity * progress;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // Glitch decay
    if (this.glitchDuration > 0) {
      this.glitchDuration -= dtMs;
    }

    // Flash decay
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dtMs * 0.003);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.vy *= 0.96;
      ft.life++;
      const progress = ft.life / ft.maxLife;
      // Elastic settle from initial punch-in scale
      ft.scale = Math.max(1.0, ft.scale * 0.93);
      ft.alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update motion ghosts
    for (let i = this.motionGhosts.length - 1; i >= 0; i--) {
      const g = this.motionGhosts[i];
      g.life++;
      g.alpha = Math.max(0, 0.55 * (1 - g.life / g.maxLife));
      if (g.life >= g.maxLife) {
        this.motionGhosts.splice(i, 1);
      }
    }

    return false;
  }

  public static renderMotionGhosts(ctx: CanvasRenderingContext2D): void {
    if (this.motionGhosts.length === 0) return;
    for (const g of this.motionGhosts) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      ctx.globalAlpha = g.alpha;
      ctx.strokeStyle = g.color;
      ctx.fillStyle = `${g.color}30`;
      ctx.lineWidth = 1.5;

      // Stylized kinetic ghost silhouette
      ctx.beginPath();
      ctx.moveTo(g.width, 0);
      ctx.lineTo(-g.width * 0.8, -g.height * 0.7);
      ctx.lineTo(-g.width * 0.4, 0);
      ctx.lineTo(-g.width * 0.8, g.height * 0.7);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();

      ctx.restore();
    }
  }

  public static renderOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // 1. Render particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Floating Combat & Score Pop Numbers
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);

      ctx.font = `${ft.isCrit ? '900' : '700'} ${Math.round(ft.size)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // High-contrast drop shadow outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = ft.isCrit ? 4.5 : 3;
      ctx.strokeText(ft.text, 0, 0);

      // Main color fill with glow
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = ft.isCrit ? 12 : 6;
      ctx.fillText(ft.text, 0, 0);

      ctx.restore();
    }

    // 3. Render Screen Flash
    if (this.flashAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 4. Render Chromatic RGB Glitch Shift (CRT Distortion)
    if (this.glitchDuration > 0) {
      const progress = this.glitchDuration / this.glitchMaxDuration;
      const shift = this.glitchIntensity * progress;
      const sliceCount = 3 + Math.floor(Math.random() * 4);

      ctx.save();
      for (let s = 0; s < sliceCount; s++) {
        const sliceY = Math.random() * height;
        const sliceH = 8 + Math.random() * 32;
        const offset = (Math.random() * 2 - 1) * shift;

        // Displace slice horizontally
        try {
          ctx.drawImage(
            ctx.canvas,
            0,
            sliceY,
            width,
            sliceH,
            offset,
            sliceY,
            width,
            sliceH
          );
        } catch {
          // ignore any canvas boundary issues
        }

        // Color fringing lines
        ctx.fillStyle = s % 2 === 0 ? 'rgba(244, 63, 94, 0.18)' : 'rgba(6, 182, 212, 0.18)';
        ctx.fillRect(0, sliceY, width, 1.5);
      }
      ctx.restore();
    }
  }

  public static renderLowIdentityVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    identity: number
  ): void {
    if (identity >= 35) return;

    // Heartbeat pulse frequency accelerates as identity drops
    const freq = identity <= 15 ? 0.014 : 0.009;
    const pulse = Math.sin(performance.now() * freq) * 0.5 + 0.5;
    const severity = (35 - identity) / 35; // 0 to 1
    const baseAlpha = 0.15 + severity * 0.35 + pulse * (0.2 + severity * 0.25);

    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.max(width, height) * 0.72;
    const innerRadius = Math.min(width, height) * (0.25 + (1 - severity) * 0.2);

    const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, maxRadius);
    grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
    grad.addColorStop(0.7, `rgba(225, 29, 72, ${baseAlpha * 0.6})`);
    grad.addColorStop(1, `rgba(159, 18, 57, ${baseAlpha})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // If critical (<15%), add distressed scanning border
    if (identity < 18) {
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.3 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, width - 12, height - 12);
    }
    ctx.restore();
  }

  public static getShake(): { x: number; y: number } {
    return this.shakeOffset;
  }

  public static isFrozen(): boolean {
    return this.hitstopRemainingMs > 0;
  }
}
