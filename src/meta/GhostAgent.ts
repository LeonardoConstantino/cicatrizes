import { GhostData, GhostFrame } from './BehavioralGhosts';
import { PlayerState } from '../worlds/World';
import { JuiceSystem } from '../presentation/Juice';

export interface GhostProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface GhostSlash {
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export class GhostAgent {
  public data: GhostData;
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public facingAngle: number = 0;
  public isGrounded: boolean = true;
  public activeAction: string = 'none';

  public projectiles: GhostProjectile[] = [];
  public slashes: GhostSlash[] = [];

  private startTime: number = 0;
  private currentFrameIndex: number = 0;
  private attackTimer: number = 0;
  private rhythmStep: number = 0;
  private rhythmTimer: number = 0;

  constructor(ghostData: GhostData, startX: number, startY: number) {
    this.data = ghostData;
    this.x = startX;
    this.y = startY;
    this.startTime = performance.now();
  }

  public reset(startX: number, startY: number): void {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.projectiles = [];
    this.slashes = [];
    this.currentFrameIndex = 0;
    this.startTime = performance.now();
  }

  public update(
    dtMs: number,
    player: PlayerState,
    worldId: string,
    width: number,
    height: number,
    enemies: Array<{ x: number; y: number; radius: number; hp: number }> = []
  ): void {
    const elapsed = performance.now() - this.startTime;
    this.activeAction = 'none';

    // 1. If recorded frames exist, replay recorded sequence
    if (this.data.recordedFrames && this.data.recordedFrames.length > 0) {
      this.updateReplay(elapsed, worldId);
    } else {
      // 2. Autonomous Behavioral AI by Archetype
      this.updateAutonomousAI(dtMs, player, worldId, width, height, enemies);
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Check collision with enemies (generous radius for reliable ghost hits)
      for (const e of enemies) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 14) {
          e.hp -= 1;
          JuiceSystem.spawnParticles(e.x, e.y, 8, this.data.color, 3);
          JuiceSystem.hitstop(15);
          p.life = p.maxLife; // consume
          break;
        }
      }

      if (p.life >= p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update slashes
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life++;

      // Hit detection in arc (generous coverage)
      for (const e of enemies) {
        const d = Math.hypot(e.x - s.x, e.y - s.y);
        if (d <= s.radius + e.radius) {
          const a = Math.atan2(e.y - s.y, e.x - s.x);
          let diff = Math.abs(s.angle - a);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (s.angle === 0 || diff < Math.PI * 0.85) {
            e.hp -= 1;
            JuiceSystem.spawnParticles(e.x, e.y, 10, this.data.color, 3.5);
            JuiceSystem.hitstop(18);
          }
        }
      }

      if (s.life >= s.maxLife) {
        this.slashes.splice(i, 1);
      }
    }
  }

  private updateReplay(elapsed: number, worldId: string): void {
    const frames = this.data.recordedFrames!;
    // Advance frames to match current run time
    while (
      this.currentFrameIndex < frames.length - 1 &&
      frames[this.currentFrameIndex + 1].t <= elapsed
    ) {
      this.currentFrameIndex++;
    }

    const cur = frames[this.currentFrameIndex];
    const next = frames[Math.min(this.currentFrameIndex + 1, frames.length - 1)];

    if (cur && next && cur !== next && next.t > cur.t) {
      const alpha = Math.min(1, Math.max(0, (elapsed - cur.t) / (next.t - cur.t)));
      this.x = cur.x + (next.x - cur.x) * alpha;
      this.y = cur.y + (next.y - cur.y) * alpha;
      this.vx = cur.vx;
      this.vy = cur.vy;
      this.facingAngle = cur.facingAngle;
    } else if (cur) {
      this.x = cur.x;
      this.y = cur.y;
      this.facingAngle = cur.facingAngle;
    }

    if (cur?.action && cur.action !== 'none') {
      this.activeAction = cur.action;
      if (cur.action === 'attack') {
        this.triggerAttack(worldId);
      }
    }
  }

  private updateAutonomousAI(
    dtMs: number,
    player: PlayerState,
    worldId: string,
    width: number,
    height: number,
    enemies: Array<{ x: number; y: number; radius: number; hp: number }>
  ): void {
    this.attackTimer += dtMs;
    this.rhythmTimer += dtMs;

    const archetype = this.data.signature.archetypeId;

    if (archetype === 'predator') {
      // PRECEDOR: Persegue e ataca o inimigo mais próximo agressivamente
      let nearest: { x: number; y: number } | null = null;
      let minDist = 999999;
      for (const e of enemies) {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = e;
        }
      }

      const target = nearest || player;
      const tdx = target.x - this.x;
      const tdy = target.y - this.y;
      const dist = Math.hypot(tdx, tdy);

      this.facingAngle = Math.atan2(tdy, tdx);

      if (dist > 80) {
        this.vx = (tdx / (dist || 1)) * 3.6;
        this.vy = (tdy / (dist || 1)) * 3.6;
      } else {
        this.vx *= 0.85;
        this.vy *= 0.85;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Attack if close to enemy or every 600ms
      if (nearest && minDist < 200 && this.attackTimer >= 550) {
        this.attackTimer = 0;
        this.triggerAttack(worldId);
      }
    } else if (archetype === 'ghost') {
      // FANTASMA: Desvia graciosamente de ameaças e mantém perímetro defensivo
      let dangerDx = 0;
      let dangerDy = 0;
      for (const e of enemies) {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < 160) {
          dangerDx -= (e.x - this.x) / (d || 1);
          dangerDy -= (e.y - this.y) / (d || 1);
        }
      }

      // Gravita suavemente em volta do jogador
      const fdx = player.x - this.x;
      const fdy = player.y - this.y;
      const fDist = Math.hypot(fdx, fdy);

      if (dangerDx !== 0 || dangerDy !== 0) {
        this.vx = this.vx * 0.85 + dangerDx * 2.8;
        this.vy = this.vy * 0.85 + dangerDy * 2.8;
      } else if (fDist > 90) {
        this.vx = this.vx * 0.85 + (fdx / fDist) * 2.5;
        this.vy = this.vy * 0.85 + (fdy / fDist) * 2.5;
      } else {
        this.vx *= 0.9;
        this.vy *= 0.9;
      }

      this.facingAngle = Math.atan2(this.vy, this.vx || 0.1);
      this.x += this.vx;
      this.y += this.vy;

      // Sniper shot periodically
      if (enemies.length > 0 && this.attackTimer >= 900) {
        this.attackTimer = 0;
        this.facingAngle = Math.atan2(enemies[0].y - this.y, enemies[0].x - this.x);
        this.triggerAttack(worldId);
      }
    } else {
      // METRÔNOMO / DEFAULT: Age no compasso rítmico estrito (~128 BPM = ~468ms)
      if (this.rhythmTimer >= 468) {
        this.rhythmTimer = 0;
        this.rhythmStep = (this.rhythmStep + 1) % 4;

        // On 4th beat, trigger attack
        if (this.rhythmStep === 0) {
          this.triggerAttack(worldId);
        }
      }

      // Move in smooth cadence
      const fdx = player.x - this.x;
      const fdy = player.y - this.y;
      const fDist = Math.hypot(fdx, fdy);
      if (fDist > 70) {
        this.vx = (fdx / fDist) * 2.4;
        this.vy = (fdy / fDist) * 2.4;
      } else {
        this.vx *= 0.8;
        this.vy *= 0.8;
      }
      this.facingAngle = player.facingAngle;
      this.x += this.vx;
      this.y += this.vy;
    }

    // Keep in screen bounds
    this.x = Math.max(30, Math.min(width - 30, this.x));
    this.y = Math.max(30, Math.min(height - 30, this.y));
  }

  private triggerAttack(worldId: string): void {
    this.activeAction = 'attack';
    if (worldId === 'IMPACTO') {
      // Shoot spectral projectile
      const speed = 7.5;
      this.projectiles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(this.facingAngle) * speed,
        vy: Math.sin(this.facingAngle) * speed,
        color: this.data.color,
        life: 0,
        maxLife: 50,
      });
    } else if (worldId === 'FOME' || worldId === 'ESPELHO') {
      // Spectral sword slash
      this.slashes.push({
        x: this.x,
        y: this.y,
        angle: this.facingAngle,
        radius: 80,
        color: this.data.color,
        life: 0,
        maxLife: 10,
      });
    } else if (worldId === 'RITMO') {
      // Sonic beat wave
      this.activeAction = 'jump';
      this.slashes.push({
        x: this.x,
        y: this.y,
        angle: 0,
        radius: 60,
        color: this.data.color,
        life: 0,
        maxLife: 12,
      });
    } else if (worldId === 'QUEDA') {
      // Downward plasma projectile
      const speed = 8.0;
      this.projectiles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(this.facingAngle) * speed,
        vy: Math.sin(this.facingAngle) * speed,
        color: this.data.color,
        life: 0,
        maxLife: 45,
      });
    } else if (worldId === 'SILENCIO') {
      // Spectral sonar shockwave
      this.slashes.push({
        x: this.x,
        y: this.y,
        angle: 0,
        radius: 75,
        color: this.data.color,
        life: 0,
        maxLife: 15,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D, animTime: number): void {
    // 1. Render active ghost projectiles
    for (const p of this.projectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Render active ghost slashes
    for (const s of this.slashes) {
      ctx.save();
      const progress = s.life / s.maxLife;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = (1 - progress) * 0.75;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, s.angle - Math.PI * 0.45, s.angle + Math.PI * 0.45);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Render ghost aura trail
    ctx.save();
    ctx.translate(this.x, this.y);
    const pulse = Math.sin(animTime * 0.01) * 3;
    ctx.strokeStyle = this.data.color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, 18 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle label above ghost
    ctx.fillStyle = this.data.color;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.75;
    ctx.fillText(`[${this.data.signature.name.toUpperCase()}]`, 0, -22);
    ctx.restore();
  }
}
