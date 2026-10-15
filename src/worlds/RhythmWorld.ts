import { adaptiveAudio } from '../audio/AdaptiveAudio';
import { JuiceSystem } from '../presentation/Juice';
import { InputState, PlayerState, World, WorldUpdateResult } from './World';

interface BeatPlatform {
  x: number;
  y: number;
  width: number;
  height: number;
  beatIndex: number;
  active: boolean;
}

interface RhythmObstacle {
  x: number;
  y: number;
  vx: number;
  radius: number;
  color: string;
  scored: boolean;
}

interface EchoJumpWave {
  triggerTime: number;
  x: number;
  y: number;
  radius: number;
}

export class RhythmWorld extends World {
  public id = 'RITMO';
  public name = 'MUNDO II — RITMO';
  public archetype = 'Rhythm Runner & Platformer Sincronizado';
  public dominantColor = '#1d9e75';
  public secondaryColor = '#38bdf8';

  private groundY = 0;
  private platforms: BeatPlatform[] = [];
  private obstacles: RhythmObstacle[] = [];
  private echoWaves: EchoJumpWave[] = [];
  private rhythmStreak: number = 0;
  private beatTimer = 0;
  private beatIntervalMs = 468; // ~128 BPM
  private beatCounter = 0;
  private jumpVelocity = -12.5;
  private gravity = 0.55;
  public isGrounded = false;
  private parryWindowActive = false;
  private enemyTargets: Array<{ x: number; y: number; radius: number; hp: number; source: RhythmObstacle }> = [];

  public getObstacles(): RhythmObstacle[] {
    return this.obstacles;
  }

  public getEnemies(): Array<{ x: number; y: number; radius: number; hp: number }> {
    this.enemyTargets = this.obstacles.map((o) => ({
      x: o.x,
      y: o.y,
      radius: o.radius,
      hp: 1,
      source: o,
    }));
    return this.enemyTargets;
  }

  public init(player: PlayerState, width: number, height: number): void {
    this.groundY = height - 90;
    player.x = width * 0.25;
    player.y = this.groundY - player.height;
    player.vx = 0;
    player.vy = 0;

    this.platforms = [
      { x: width * 0.45, y: height - 160, width: 140, height: 16, beatIndex: 1, active: true },
      { x: width * 0.70, y: height - 230, width: 150, height: 16, beatIndex: 2, active: true },
      { x: width * 0.20, y: height - 200, width: 130, height: 16, beatIndex: 3, active: true },
    ];
    this.obstacles = [];
    this.echoWaves = [];
    this.rhythmStreak = 0;
    this.beatTimer = 0;
    this.beatCounter = 0;
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

    const hasRitmo = activeScars.includes('RITMO');
    const hasPressa = activeScars.includes('PRESSA');
    const hasAnkora = activeScars.includes('ANKORA');
    const hasEco = activeScars.includes('ECO');
    const hasMedo = activeScars.includes('MEDO');
    const hasDivida = activeScars.includes('DIVIDA');
    const hasColapso = activeScars.includes('COLAPSO');
    const hasParalisia = activeScars.includes('PARALISIA');

    // Horizontal input check
    let mx = 0;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;
    const jumpPressed = input.keys['KeyW'] || input.keys['ArrowUp'] || input.keys['Space'] || input.mouseDown;

    // Superhot PARALISIA: if player is idle (no keys pressed), world slows to 20%
    const isPlayerIdle = mx === 0 && !jumpPressed;
    const timeScale = hasParalisia && isPlayerIdle ? 0.20 : 1.0;
    const bpmSpeedMultiplier = (hasPressa ? 1.3 : 1.0) * timeScale;

    // Advance beat timer
    this.beatTimer += dtMs * bpmSpeedMultiplier;
    if (this.beatTimer >= this.beatIntervalMs) {
      this.beatTimer -= this.beatIntervalMs;
      this.beatCounter++;

      // Pulse platforms
      for (const p of this.platforms) {
        p.active = (this.beatCounter % 4) === p.beatIndex || (this.beatCounter % 2 === 0);
      }

      // Spawn rhythmic obstacle on beat
      if (this.beatCounter % 2 === 0 && this.obstacles.length < 8) {
        this.obstacles.push({
          x: width + 30,
          y: Math.random() > 0.4 ? this.groundY - 24 : this.groundY - 140,
          vx: -(4.8 + (hasRitmo ? 1.5 : 0)) * bpmSpeedMultiplier,
          radius: 12,
          color: '#06b6d4',
          scored: false,
        });
      }
    }

    // Horizontal controls
    player.vx = mx * player.speed * 1.1;
    player.x += player.vx;
    player.x = Math.max(player.width, Math.min(width - player.width, player.x));

    // Jump logic
    if (jumpPressed && this.isGrounded) {
      player.vy = this.jumpVelocity * (hasAnkora ? 0.9 : 1.0);
      this.isGrounded = false;
      adaptiveAudio.playLaser();
      JuiceSystem.spawnParticles(player.x, player.y + player.height, 6, '#38bdf8', 2);
      actionOccurred = 'jump';

      // ECO: queue delayed echo jump wave
      if (hasEco) {
        this.echoWaves.push({
          triggerTime: performance.now() + 800,
          x: player.x,
          y: player.y + player.height,
          radius: 40,
        });
      }
    }

    // Process ECO waves
    const now = performance.now();
    for (let i = this.echoWaves.length - 1; i >= 0; i--) {
      const ew = this.echoWaves[i];
      if (now >= ew.triggerTime) {
        JuiceSystem.spawnParticles(ew.x, ew.y, 12, '#06b6d4', 3);
        // Destroy close obstacles
        for (let j = this.obstacles.length - 1; j >= 0; j--) {
          const obs = this.obstacles[j];
          if (Math.hypot(obs.x - ew.x, obs.y - ew.y) < ew.radius + obs.radius) {
            scoreGained += 200;
            comboIncrease++;
            this.obstacles.splice(j, 1);
          }
        }
        this.echoWaves.splice(i, 1);
      }
    }

    // Gravity
    player.vy += this.gravity * timeScale;
    player.y += player.vy;

    // Check collision with ground (rises with COLAPSO)
    const currentGroundY = hasColapso ? this.groundY - Math.min(60, this.rhythmStreak * 4) : this.groundY;
    if (player.y + player.height >= currentGroundY) {
      player.y = currentGroundY - player.height;
      player.vy = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Check collision with floating platforms
    for (const p of this.platforms) {
      if (p.active) {
        const withinX = player.x + player.width > p.x && player.x - player.width < p.x + p.width;
        const falling = player.vy > 0;
        const wasAbove = (player.y + player.height - player.vy) <= p.y + 4;
        const nowBelow = (player.y + player.height) >= p.y;
        if (withinX && falling && wasAbove && nowBelow) {
          player.y = p.y - player.height;
          player.vy = 0;
          this.isGrounded = true;
        }
      }
    }

    // Update rhythmic obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      // Did ghost agent destroy this obstacle?
      const target = this.enemyTargets.find((t) => t.source === obs);
      if (target && target.hp <= 0) {
        this.obstacles.splice(i, 1);
        scoreGained += 200 * (player.combo + 1);
        comboIncrease++;
        if (!actionOccurred) actionOccurred = 'kill';
        JuiceSystem.spawnParticles(obs.x, obs.y, 14, '#10b981', 3.5);
        adaptiveAudio.playExplosion();
        continue;
      }

      obs.x += obs.vx;

      // MEDO: Obstacles oscillate erratically vertically when approaching player
      if (hasMedo && obs.x < player.x + 220 && obs.x > player.x - 40) {
        obs.y += Math.sin((obs.x + now * 0.01) * 0.08) * 2.5;
      }

      // Check collision with player
      const dist = Math.hypot(player.x - obs.x, player.y - obs.y);
      if (dist < player.width + obs.radius) {
        // Did player parry / jump over at the exact beat?
        const isNearBeat = Math.abs(this.beatTimer - this.beatIntervalMs / 2) < 90;
        if (jumpPressed && isNearBeat) {
          // Beat parry success!
          scoreGained += 250 * (player.combo + 1);
          comboIncrease++;
          this.rhythmStreak++;
          actionOccurred = 'parry';
          JuiceSystem.hitstop(35);
          JuiceSystem.cameraShake(5, 100);
          JuiceSystem.spawnParticles(obs.x, obs.y, 14, '#10b981', 3.5);
          JuiceSystem.spawnText(obs.x, obs.y - 20, 'PARRY PERFEITO!', '#10b981', 16, true);
          JuiceSystem.triggerGlitch(5, 90);
          adaptiveAudio.playMelee();

          // DIVIDA: Every 5 parries, detonate debt pulse clearing hazards
          if (hasDivida && this.rhythmStreak % 5 === 0) {
            JuiceSystem.cameraShake(8, 140);
            JuiceSystem.spawnParticles(player.x, player.y, 20, '#eab308', 4);
            adaptiveAudio.playExplosion();
            this.obstacles = [];
            break;
          }

          this.obstacles.splice(i, 1);
          continue;
        } else {
          playerDamage += 16;
          this.rhythmStreak = 0;
          damageReason = 'Descompasso de ritmo com obstáculo';
          JuiceSystem.cameraShake(8, 140);
          JuiceSystem.spawnParticles(player.x, player.y, 8, '#ef4444', 3);
          this.obstacles.splice(i, 1);
          continue;
        }
      }

      // Passed player successfully (clean rhythm dodge)
      if (!obs.scored && obs.x < player.x - 30) {
        obs.scored = true;
        scoreGained += 120 * (player.combo + 1);
        comboIncrease++;
        this.rhythmStreak++;
        actionOccurred = 'dodge';
      }

      if (obs.x < -40) {
        this.obstacles.splice(i, 1);
      }
    }

    // Reward completing rhythmic bars
    if (this.beatCounter > 0 && this.beatCounter % 8 === 0 && this.beatTimer < dtMs * bpmSpeedMultiplier * 1.5) {
      scoreGained += 150;
      comboIncrease++;
      if (!actionOccurred) {
        actionOccurred = 'dodge';
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

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    player: PlayerState,
    morphProgress: number,
    isTransitioning: boolean,
    activeScars: string[]
  ): void {
    // Background rhythmic pulse lines
    ctx.save();
    const beatFraction = this.beatTimer / this.beatIntervalMs;
    const pulseGlow = Math.sin(beatFraction * Math.PI) * 0.15;
    ctx.fillStyle = `rgba(29, 158, 117, ${0.05 + pulseGlow})`;
    ctx.fillRect(0, 0, width, height);

    // Floor
    ctx.strokeStyle = '#1d9e75';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(width, this.groundY);
    ctx.stroke();

    // Equalizer bars along bottom
    const barCount = 32;
    const barWidth = width / barCount;
    for (let i = 0; i < barCount; i++) {
      const h = Math.abs(Math.sin(i * 0.4 + this.beatCounter * 0.5 + beatFraction * Math.PI)) * 36;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.fillRect(i * barWidth + 2, this.groundY, barWidth - 4, h);
    }

    // Platforms
    for (const p of this.platforms) {
      ctx.fillStyle = p.active ? '#10b981' : 'rgba(16, 185, 129, 0.25)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    }

    // Obstacles
    for (const obs of this.obstacles) {
      ctx.fillStyle = obs.color;
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
