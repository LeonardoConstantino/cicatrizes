import { adaptiveAudio } from '../audio/AdaptiveAudio';
import { JuiceSystem } from '../presentation/Juice';
import { InputState, PlayerState, World, WorldUpdateResult } from './World';

export interface SilentBullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  illuminatedTimer: number; // ms remaining of sonar illumination
  scoredGraze?: boolean;
}

export interface SilentSentinel {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  attackTimer: number;
  patternType: 'ring' | 'spiral';
  illuminatedTimer: number;
  angle: number;
}

interface SonarWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  life: number;
}

export class SilencioWorld extends World {
  public id = 'SILENCIO';
  public name = 'MUNDO V — SILÊNCIO';
  public archetype = 'Dança Cega no Bullet-Hell & Ecolocalização';
  public dominantColor = '#94a3b8';
  public secondaryColor = '#38bdf8';

  private sentinels: SilentSentinel[] = [];
  private bullets: SilentBullet[] = [];
  private sonarWaves: SonarWave[] = [];

  private sonarCooldown = 0;
  private phaseDashCooldown = 0;
  private invulnerableTimer = 0;
  private entityIdCounter = 0;
  private grazeStreak = 0;
  private dividaCounter = 0;

  public getEnemies(): SilentSentinel[] {
    return this.sentinels.filter(s => s.hp > 0);
  }

  public init(player: PlayerState, width: number, height: number): void {
    player.x = width / 2;
    player.y = height / 2;
    player.vx = 0;
    player.vy = 0;
    player.speed = 4.2;

    this.sentinels = [];
    this.bullets = [];
    this.sonarWaves = [];
    this.sonarCooldown = 0;
    this.phaseDashCooldown = 0;
    this.invulnerableTimer = 0;

    // Seed initial sentinels
    this.spawnSentinel(width * 0.25, height * 0.3, 'ring');
    this.spawnSentinel(width * 0.75, height * 0.3, 'spiral');
    this.spawnSentinel(width * 0.5, height * 0.75, 'ring');

    // Initial introductory sonar pulse
    this.triggerSonar(player.x, player.y);
  }

  private spawnSentinel(x: number, y: number, patternType: 'ring' | 'spiral'): void {
    this.sentinels.push({
      id: ++this.entityIdCounter,
      x,
      y,
      hp: 3,
      maxHp: 3,
      radius: 18,
      attackTimer: 800 + Math.random() * 600,
      patternType,
      illuminatedTimer: 3000,
      angle: 0,
    });
  }

  private triggerSonar(x: number, y: number): void {
    this.sonarWaves.push({
      x,
      y,
      radius: 10,
      maxRadius: 750,
      speed: 680, // pixels per sec
      life: 1.2,
    });
    adaptiveAudio.playSonarPulse();
    JuiceSystem.spawnParticles(x, y, 12, '#38bdf8', 3);
  }

  public update(
    dtMs: number,
    input: InputState,
    player: PlayerState,
    activeScars: string[],
    width: number,
    height: number
  ): WorldUpdateResult {
    let playerDamage = 0;
    let damageReason: string | undefined;
    let scoreGained = 0;
    let comboIncrease = 0;
    let actionOccurred: WorldUpdateResult['actionOccurred'];

    const dtSec = dtMs / 1000;
    const now = performance.now();

    // PARALISIA Scar: Time slows to 15% when player is not actively pressing movement
    const hasParalisia = activeScars.includes('PARALISIA');
    const isPlayerIdle =
      !input.keys['KeyW'] &&
      !input.keys['KeyS'] &&
      !input.keys['KeyA'] &&
      !input.keys['KeyD'] &&
      !input.keys['ArrowUp'] &&
      !input.keys['ArrowDown'] &&
      !input.keys['ArrowLeft'] &&
      !input.keys['ArrowRight'];

    const timeScale = hasParalisia && isPlayerIdle ? 0.15 : 1.0;
    const scaledDtMs = dtMs * timeScale;
    const scaledDtSec = dtSec * timeScale;

    // Pulse Scar: Heartbeat triggers automatic mini sonar
    if (activeScars.includes('PULSO')) {
      if (Math.random() < 0.015 * timeScale) {
        this.triggerSonar(player.x, player.y);
      }
    }

    // Omnidirectional Movement
    let mx = 0;
    let my = 0;
    if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      player.vx = (mx / len) * player.speed;
      player.vy = (my / len) * player.speed;
      player.facingAngle = Math.atan2(player.vy, player.vx);
    } else {
      player.vx *= 0.88;
      player.vy *= 0.88;
    }

    // ANKORA scar: slower velocity change
    const hasAnkora = activeScars.includes('ANKORA');
    const moveFactor = hasAnkora ? 0.85 : 1.0;

    player.x += player.vx * moveFactor * timeScale;
    player.y += player.vy * moveFactor * timeScale;
    player.x = Math.max(30, Math.min(width - 30, player.x));
    player.y = Math.max(30, Math.min(height - 30, player.y));

    // Phase Dash (Space or Right Click)
    this.phaseDashCooldown = Math.max(0, this.phaseDashCooldown - scaledDtMs);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - scaledDtMs);

    const wantsPhaseDash = input.spaceJustPressed || (input.keys['Space'] && this.phaseDashCooldown <= 0);
    if (wantsPhaseDash && this.phaseDashCooldown <= 0) {
      this.phaseDashCooldown = 1100;
      this.invulnerableTimer = 220; // 220ms invulnerability
      const dashAngle = (mx !== 0 || my !== 0) ? Math.atan2(my, mx) : player.facingAngle;
      const dashDist = 95;

      player.x += Math.cos(dashAngle) * dashDist;
      player.y += Math.sin(dashAngle) * dashDist;
      player.x = Math.max(30, Math.min(width - 30, player.x));
      player.y = Math.max(30, Math.min(height - 30, player.y));

      adaptiveAudio.playPhaseDash();
      JuiceSystem.spawnParticles(player.x, player.y, 14, '#ffffff', 4);
      JuiceSystem.cameraShake(5, 100);
      actionOccurred = 'dodge';
    }

    // Sonar Pulse (KeyF or Left Click)
    this.sonarCooldown = Math.max(0, this.sonarCooldown - scaledDtMs);
    const wantsSonar = input.keys['KeyF'] || input.mouseClicked;
    if (wantsSonar && this.sonarCooldown <= 0) {
      this.sonarCooldown = 900;
      this.triggerSonar(player.x, player.y);
      actionOccurred = 'parry';

      // Check if player activated sonar right on top of a sentinel to disarm it
      for (const s of this.sentinels) {
        if (Math.hypot(s.x - player.x, s.y - player.y) < 70) {
          s.hp -= 1;
          s.illuminatedTimer = 3500;
          scoreGained += 350 * (player.combo + 1);
          comboIncrease++;
          adaptiveAudio.playExplosion();
          JuiceSystem.spawnParticles(s.x, s.y, 12, '#38bdf8', 4);
          JuiceSystem.hitstop(30);
          actionOccurred = 'kill';
        }
      }
    }

    // Update Sonar Waves
    for (let i = this.sonarWaves.length - 1; i >= 0; i--) {
      const wave = this.sonarWaves[i];
      wave.radius += wave.speed * scaledDtSec;
      wave.life -= scaledDtSec;

      // Illuminate bullets that the wave sweeps across
      for (const bullet of this.bullets) {
        const d = Math.hypot(bullet.x - wave.x, bullet.y - wave.y);
        if (Math.abs(d - wave.radius) < 35) {
          bullet.illuminatedTimer = 2800;
        }
      }

      // Illuminate sentinels
      for (const s of this.sentinels) {
        const d = Math.hypot(s.x - wave.x, s.y - wave.y);
        if (Math.abs(d - wave.radius) < 40) {
          s.illuminatedTimer = 3500;
        }
      }

      if (wave.radius >= wave.maxRadius || wave.life <= 0) {
        this.sonarWaves.splice(i, 1);
      }
    }

    // Update Sentinels & Bullet Spawning
    const hasMedo = activeScars.includes('MEDO');
    for (let i = this.sentinels.length - 1; i >= 0; i--) {
      const s = this.sentinels[i];
      s.illuminatedTimer = Math.max(0, s.illuminatedTimer - scaledDtMs);
      s.angle += 0.02 * timeScale;
      s.attackTimer -= scaledDtMs;

      // Evasion behavior with MEDO scar
      if (hasMedo) {
        const dPlayer = Math.hypot(player.x - s.x, player.y - s.y);
        if (dPlayer < 140) {
          s.x -= ((player.x - s.x) / dPlayer) * 2;
          s.y -= ((player.y - s.y) / dPlayer) * 2;
        }
      }

      // Attack Pattern
      if (s.attackTimer <= 0) {
        s.attackTimer = 1600;
        if (s.patternType === 'ring') {
          // Circular ring of 8 bullets
          const bulletCount = 8;
          for (let j = 0; j < bulletCount; j++) {
            const ang = (j * Math.PI * 2) / bulletCount + s.angle;
            this.bullets.push({
              id: ++this.entityIdCounter,
              x: s.x,
              y: s.y,
              vx: Math.cos(ang) * 1.9,
              vy: Math.sin(ang) * 1.9,
              radius: 5,
              illuminatedTimer: s.illuminatedTimer > 0 ? 1800 : 0,
            });
          }
        } else {
          // Spiral 3-burst
          for (let j = 0; j < 3; j++) {
            const ang = s.angle + j * 0.4;
            this.bullets.push({
              id: ++this.entityIdCounter,
              x: s.x,
              y: s.y,
              vx: Math.cos(ang) * 2.5,
              vy: Math.sin(ang) * 2.5,
              radius: 5,
              illuminatedTimer: s.illuminatedTimer > 0 ? 1800 : 0,
            });
          }
        }
      }

      if (s.hp <= 0) {
        JuiceSystem.spawnParticles(s.x, s.y, 20, '#94a3b8', 5);
        JuiceSystem.spawnText(s.x, s.y - 15, '+300 ABATE', '#38bdf8', 15);
        this.sentinels.splice(i, 1);
        // Respawn replacement sentinel across arena
        const spawnX = player.x < width / 2 ? width * 0.75 : width * 0.25;
        const spawnY = player.y < height / 2 ? height * 0.75 : height * 0.25;
        this.spawnSentinel(spawnX, spawnY, Math.random() < 0.5 ? 'ring' : 'spiral');
      }
    }

    // Update Bullets
    const hasReflexo = activeScars.includes('REFLEXO');
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.illuminatedTimer = Math.max(0, b.illuminatedTimer - scaledDtMs);
      b.x += b.vx * timeScale;
      b.y += b.vy * timeScale;

      // REFLEXO scar: bullets ricochet off screen boundaries
      if (hasReflexo) {
        if (b.x < 15 || b.x > width - 15) b.vx *= -1;
        if (b.y < 15 || b.y > height - 15) b.vy *= -1;
      }

      const dist = Math.hypot(b.x - player.x, b.y - player.y);

      // Grazing Mechanic (passing close to bullets without hitting)
      if (!b.scoredGraze && dist < 26 && dist > b.radius + 6) {
        b.scoredGraze = true;
        this.grazeStreak++;
        scoreGained += 180 * (player.combo + 1);
        comboIncrease++;
        this.phaseDashCooldown = 0; // Graze resets dash immediately!
        this.checkDivida(activeScars);
        adaptiveAudio.playNearMiss();
        JuiceSystem.spawnParticles(player.x, player.y, 6, '#38bdf8', 2.5);
        JuiceSystem.spawnText(player.x, player.y - 18, '+180 GRAZE!', '#38bdf8', 14);
        if (!actionOccurred) actionOccurred = 'risk_take';
      }

      // Collision with player (unless invulnerable during Phase Dash)
      if (dist < b.radius + 6) {
        if (this.invulnerableTimer <= 0) {
          playerDamage += 16;
          damageReason = 'Atingido por Feixe do Silêncio';
          JuiceSystem.hitstop(30);
          JuiceSystem.cameraShake(8, 140);
          JuiceSystem.spawnParticles(b.x, b.y, 10, '#f43f5e', 4);
        } else {
          // Absorbed through phase invulnerability
          scoreGained += 100;
          JuiceSystem.spawnParticles(b.x, b.y, 6, '#ffffff', 2);
        }
        this.bullets.splice(i, 1);
        continue;
      }

      // Out of bounds check (without reflexo)
      if (!hasReflexo && (b.x < -30 || b.x > width + 30 || b.y < -30 || b.y > height + 30)) {
        this.bullets.splice(i, 1);
      }
    }

    return {
      playerDamage,
      damageReason,
      scoreGained,
      comboIncrease,
      actionOccurred,
    };
  }

  private checkDivida(activeScars: string[]): void {
    if (!activeScars.includes('DIVIDA')) return;
    this.dividaCounter++;
    if (this.dividaCounter >= 5) {
      this.dividaCounter = 0;
      JuiceSystem.cameraShake(10, 200);
      JuiceSystem.screenFlash('#eab308', 0.35);
      adaptiveAudio.playExplosion();

      // Clear all bullets on screen
      for (const b of this.bullets) {
        JuiceSystem.spawnParticles(b.x, b.y, 4, '#eab308', 2);
      }
      this.bullets = [];
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    player: PlayerState,
    morphProgress: number,
    isTransitioning: boolean,
    activeScars: string[]
  ): void {
    const now = performance.now();

    // Deep slate void background
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, width, height);

    // Subtle cosmic void dust
    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
    for (let i = 0; i < 35; i++) {
      const px = (Math.sin(i * 99 + now * 0.0001) * 0.5 + 0.5) * width;
      const py = (Math.cos(i * 33 + now * 0.0001) * 0.5 + 0.5) * height;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.restore();

    // Render Sonar Expanding Waves
    for (const wave of this.sonarWaves) {
      ctx.save();
      const alpha = Math.max(0, wave.life / 1.2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Render Sentinels
    for (const s of this.sentinels) {
      ctx.save();
      ctx.translate(s.x, s.y);

      const isIlluminated = s.illuminatedTimer > 0;
      const alpha = isIlluminated ? 0.95 : 0.25;

      ctx.fillStyle = `rgba(203, 213, 225, ${alpha})`;
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = isIlluminated ? 16 : 4;

      // Rotating geometric core
      ctx.rotate(s.angle);
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const ang = (j * Math.PI) / 2;
        const r = s.radius;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner pulsating eye
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Render Bullets
    for (const b of this.bullets) {
      ctx.save();
      const isIlluminated = b.illuminatedTimer > 0;
      const alpha = isIlluminated ? 0.95 : 0.28;

      ctx.fillStyle = isIlluminated ? '#ffffff' : 'rgba(148, 163, 184, 0.4)';
      ctx.shadowColor = isIlluminated ? '#38bdf8' : 'rgba(148, 163, 184, 0.3)';
      ctx.shadowBlur = isIlluminated ? 12 : 2;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Trajectory ghost trail when illuminated
      if (isIlluminated) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 6, b.y - b.vy * 6);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Phase Dash invulnerability glow overlay around player
    if (this.invulnerableTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
