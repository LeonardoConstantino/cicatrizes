import { adaptiveAudio } from '../audio/AdaptiveAudio';
import { JuiceSystem } from '../presentation/Juice';
import { InputState, PlayerState, World, WorldUpdateResult } from './World';

interface MeleeEnemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  color: string;
}

interface MeleeSlash {
  x: number;
  y: number;
  angle: number;
  radius: number;
  life: number;
  maxLife: number;
  color?: string;
}

interface EchoMelee {
  triggerTime: number;
  x: number;
  y: number;
  angle: number;
  radius: number;
}

interface MirrorSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class HungerWorld extends World {
  public id = 'FOME';
  public name = 'MUNDO IV — FOME';
  public archetype = 'Arena Melee & Gestão de Consequências';
  public dominantColor = '#ef9f27';
  public secondaryColor = '#dc2626';

  private enemies: MeleeEnemy[] = [];
  private slashes: MeleeSlash[] = [];
  private echoQueue: EchoMelee[] = [];
  private mirrorSparks: MirrorSpark[] = [];
  private killCounter: number = 0;
  private hungerMeter: number = 0; // 0 to 100
  private attackCooldown: number = 0;
  private enemyIdCounter: number = 0;
  private spawnTimer: number = 0;
  private hurtCooldown: number = 0;
  private arenaRadius: number = 280;

  public getEnemies(): MeleeEnemy[] {
    return this.enemies;
  }

  public init(player: PlayerState, width: number, height: number): void {
    player.x = width / 2;
    player.y = height / 2;
    this.enemies = [];
    this.slashes = [];
    this.echoQueue = [];
    this.mirrorSparks = [];
    this.killCounter = 0;
    this.hungerMeter = 10;
    this.attackCooldown = 0;
    this.spawnTimer = 0;
    this.hurtCooldown = 0;
    this.arenaRadius = 280;

    // Start with 3 enemies instead of 5 for a fairer ramp-up
    for (let i = 0; i < 3; i++) {
      this.spawnMeleeEnemy(width, height);
    }
  }

  private spawnMeleeEnemy(width: number, height: number): void {
    this.enemyIdCounter++;
    const angle = Math.random() * Math.PI * 2;
    const dist = 320 + Math.random() * 140;
    const x = width / 2 + Math.cos(angle) * dist;
    const y = height / 2 + Math.sin(angle) * dist;

    // 75% 1-HP swarmers (fast and satisfying to slice), 25% 2-HP heavy brutes
    const isBrute = Math.random() < 0.25;

    this.enemies.push({
      id: this.enemyIdCounter,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: isBrute ? 18 : 13,
      hp: isBrute ? 2 : 1,
      maxHp: isBrute ? 2 : 1,
      color: isBrute ? '#dc2626' : '#f97316',
    });
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

    const hasFome = activeScars.includes('FOME');
    const hasPressa = activeScars.includes('PRESSA');
    const hasAnkora = activeScars.includes('ANKORA');
    const hasEco = activeScars.includes('ECO');
    const hasMedo = activeScars.includes('MEDO');
    const hasDivida = activeScars.includes('DIVIDA');
    const hasReflexo = activeScars.includes('REFLEXO');
    const hasColapso = activeScars.includes('COLAPSO');
    const hasParalisia = activeScars.includes('PARALISIA');

    // Superhot PARALISIA time dilation: when player stops moving, time slows to 15%
    const isPlayerStill = Math.hypot(player.vx, player.vy) < 0.25;
    const timeScale = hasParalisia && isPlayerStill ? 0.15 : 1.0;
    const scaledDt = dtMs * timeScale;

    // COLAPSO: Arena contracts by 7px per kill (minimum 170px)
    if (hasColapso) {
      this.arenaRadius = Math.max(170, 280 - this.killCounter * 7);
      // Boundary check with hazard
      const distFromCenter = Math.hypot(player.x - width / 2, player.y - height / 2);
      if (distFromCenter > this.arenaRadius && this.hurtCooldown <= 0) {
        this.hurtCooldown = 450;
        playerDamage += 8;
        damageReason = 'Fronteira colapsada da arena';
        JuiceSystem.cameraShake(6, 100);
        JuiceSystem.spawnParticles(player.x, player.y, 10, '#f43f5e', 3);
        const ca = Math.atan2(player.y - height / 2, player.x - width / 2);
        player.x = width / 2 + Math.cos(ca) * (this.arenaRadius - 10);
        player.y = height / 2 + Math.sin(ca) * (this.arenaRadius - 10);
      }
    } else {
      this.arenaRadius = 280;
    }

    const speedMultiplier = (hasPressa ? 1.25 : 1.0) * timeScale;

    // Movement: generous speed so player can space and kite melee foes
    let mx = 0;
    let my = 0;
    if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      player.vx = (mx / len) * player.speed * 1.15 * (hasPressa ? 1.25 : 1.0);
      player.vy = (my / len) * player.speed * 1.15 * (hasPressa ? 1.25 : 1.0);
    } else {
      player.vx *= 0.82;
      player.vy *= 0.82;
    }

    player.x += player.vx;
    player.y += player.vy;
    player.x = Math.max(player.width, Math.min(width - player.width, player.x));
    player.y = Math.max(player.height, Math.min(height - player.height, player.y));

    // Facing (smooth aim with deadzone to eliminate oscillation)
    const dx = input.mouseX - player.x;
    const dy = input.mouseY - player.y;
    const distToMouse = Math.hypot(dx, dy);

    if (input.hasMovedMouse && distToMouse > 18) {
      player.facingAngle = Math.atan2(dy, dx);
    } else if (mx !== 0 || my !== 0) {
      player.facingAngle = Math.atan2(my, mx);
    }

    // Hurt cooldown decay
    if (this.hurtCooldown > 0) {
      this.hurtCooldown -= scaledDt;
    }

    // Melee attack: faster cooldown (160ms) and wider reach (90px)
    if (this.attackCooldown > 0) {
      this.attackCooldown -= scaledDt;
    }

    const wantsToAttack = input.mouseDown || input.keys['Space'];
    if (wantsToAttack && this.attackCooldown <= 0) {
      this.attackCooldown = hasAnkora ? 240 : 160;
      adaptiveAudio.playMelee();
      JuiceSystem.cameraShake(4, 90);
      actionOccurred = 'attack';

      const slashRadius = 90;
      this.slashes.push({
        x: player.x,
        y: player.y,
        angle: player.facingAngle,
        radius: slashRadius,
        life: 0,
        maxLife: 12,
      });

      // Queue ECO slash if active (repeats 800ms later)
      if (hasEco) {
        this.echoQueue.push({
          triggerTime: performance.now() + 800,
          x: player.x,
          y: player.y,
          angle: player.facingAngle,
          radius: slashRadius,
        });
      }

      // REFLEXO: Leave mirror spark at the tip of blade
      if (hasReflexo) {
        const tipX = player.x + Math.cos(player.facingAngle) * (slashRadius - 5);
        const tipY = player.y + Math.sin(player.facingAngle) * (slashRadius - 5);
        this.mirrorSparks.push({
          x: tipX,
          y: tipY,
          vx: Math.cos(player.facingAngle + Math.PI) * 2,
          vy: Math.sin(player.facingAngle + Math.PI) * 2,
          life: 0,
          maxLife: 40,
        });
      }

      // Hit detection with enemies in slash arc (generous 0.75 PI sweep)
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist <= slashRadius + e.radius) {
          const enemyAngle = Math.atan2(e.y - player.y, e.x - player.x);
          let angleDiff = Math.abs(player.facingAngle - enemyAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          if (angleDiff < Math.PI * 0.75) {
            e.hp -= 1;
            // Knockback
            e.vx += Math.cos(enemyAngle) * 7;
            e.vy += Math.sin(enemyAngle) * 7;
            JuiceSystem.hitstop(30);
            JuiceSystem.cameraShake(6, 110);
            JuiceSystem.spawnParticles(e.x, e.y, 8, '#fbbf24', 3);

            if (e.hp <= 0) {
              this.killCounter++;
              this.hungerMeter = Math.min(100, this.hungerMeter + 8);
              scoreGained += 200 * (player.combo + 1);
              comboIncrease++;
              actionOccurred = 'kill';

              // Feast mechanic: Satiating hunger recovers 5% Identity!
              player.identity = Math.min(player.maxIdentity, player.identity + 5);
              JuiceSystem.spawnText(e.x, e.y - 14, '+5% IDENTIDADE', '#10b981', 13);

              // DIVIDA: Every 5 kills, detonate debt shockwave
              if (hasDivida && this.killCounter % 5 === 0) {
                JuiceSystem.cameraShake(10, 160);
                adaptiveAudio.playExplosion();
                JuiceSystem.spawnParticles(player.x, player.y, 25, '#eab308', 5);
                // Push back all enemies
                for (const other of this.enemies) {
                  const odx = other.x - player.x;
                  const ody = other.y - player.y;
                  const od = Math.hypot(odx, ody) || 1;
                  other.vx += (odx / od) * 12;
                  other.vy += (ody / od) * 12;
                  other.hp -= 1;
                }
              }

              JuiceSystem.spawnParticles(e.x, e.y, 16, '#ea580c', 4);
              adaptiveAudio.playExplosion();
              this.enemies.splice(i, 1);
            }
          }
        }
      }
    }

    // Process ECO queue
    const now = performance.now();
    for (let i = this.echoQueue.length - 1; i >= 0; i--) {
      const eco = this.echoQueue[i];
      if (now >= eco.triggerTime) {
        this.slashes.push({
          x: eco.x,
          y: eco.y,
          angle: eco.angle,
          radius: eco.radius,
          life: 0,
          maxLife: 10,
          color: '#06b6d4',
        });
        // Check hits for echo slash
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(e.x - eco.x, e.y - eco.y) <= eco.radius + e.radius) {
            e.hp -= 1;
            JuiceSystem.spawnParticles(e.x, e.y, 8, '#06b6d4', 3);
            if (e.hp <= 0) {
              this.enemies.splice(j, 1);
              scoreGained += 250;
              comboIncrease++;
            }
          }
        }
        this.echoQueue.splice(i, 1);
      }
    }

    // Update slashes
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].life++;
      if (this.slashes[i].life >= this.slashes[i].maxLife) {
        this.slashes.splice(i, 1);
      }
    }

    // Update mirror sparks
    for (let i = this.mirrorSparks.length - 1; i >= 0; i--) {
      const ms = this.mirrorSparks[i];
      ms.x += ms.vx;
      ms.y += ms.vy;
      ms.life++;
      if (ms.life >= ms.maxLife) {
        this.mirrorSparks.splice(i, 1);
      }
    }

    // Spawning enemies (balanced interval and cap)
    this.spawnTimer += scaledDt;
    if (this.spawnTimer >= 1800 && this.enemies.length < 9) {
      this.spawnTimer = 0;
      this.spawnMeleeEnemy(width, height);
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Check if enemy died from GhostAgent or other damage
      if (e.hp <= 0) {
        this.killCounter++;
        this.hungerMeter = Math.min(100, this.hungerMeter + 8);
        scoreGained += 200 * (player.combo + 1);
        comboIncrease++;
        if (!actionOccurred) actionOccurred = 'kill';
        JuiceSystem.spawnParticles(e.x, e.y, 16, '#ea580c', 4);
        adaptiveAudio.playExplosion();
        this.enemies.splice(i, 1);
        continue;
      }

      const edx = player.x - e.x;
      const edy = player.y - e.y;
      const dist = Math.hypot(edx, edy);

      let chaseSpeed = (1.6 + (this.hungerMeter / 100) * 1.2) * speedMultiplier;

      // MEDO: If enemy is close (<120px), evade player's facing blade
      if (hasMedo && dist < 120) {
        const evadeAngle = Math.atan2(e.y - player.y, e.x - player.x) + (i % 2 === 0 ? 0.8 : -0.8);
        e.vx = e.vx * 0.88 + Math.cos(evadeAngle) * chaseSpeed * 0.16;
        e.vy = e.vy * 0.88 + Math.sin(evadeAngle) * chaseSpeed * 0.16;
      } else {
        e.vx = e.vx * 0.88 + (edx / (dist || 1)) * chaseSpeed * 0.12;
        e.vy = e.vy * 0.88 + (edy / (dist || 1)) * chaseSpeed * 0.12;
      }

      e.x += e.vx;
      e.y += e.vy;

      // Contact damage with 450ms invulnerability window (prevents multi-frame shred)
      if (dist < player.width + e.radius && this.hurtCooldown <= 0) {
        this.hurtCooldown = 450;
        playerDamage += 10;
        damageReason = 'Ataque corpo-a-corpo em FOME';
        JuiceSystem.cameraShake(8, 140);
        JuiceSystem.spawnParticles(player.x, player.y, 8, '#ef4444', 3);
        // Knock enemy back
        e.vx -= (edx / (dist || 1)) * 6;
        e.vy -= (edy / (dist || 1)) * 6;
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
    ctx.save();

    const hasColapso = activeScars.includes('COLAPSO');
    const hasParalisia = activeScars.includes('PARALISIA');

    // Arena circular ring (pulses red if COLAPSO is active)
    ctx.strokeStyle = hasColapso ? '#f43f5e' : '#7c2d12';
    ctx.lineWidth = hasColapso ? 3 : 2;
    if (hasColapso) {
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, this.arenaRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Slashes (including cyan ECO slashes)
    for (const s of this.slashes) {
      ctx.save();
      const progress = s.life / s.maxLife;
      const strokeColor = s.color || `rgba(251, 191, 36, ${1 - progress})`;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, s.angle - Math.PI * 0.45, s.angle + Math.PI * 0.45);
      ctx.stroke();
      ctx.restore();
    }

    // Mirror sparks (REFLEXO)
    for (const ms of this.mirrorSparks) {
      ctx.save();
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) {
      ctx.fillStyle = e.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Superhot PARALISIA visual cue: subtle cyan ice vignette when stationary
    if (hasParalisia && Math.hypot(player.vx, player.vy) < 0.25) {
      ctx.save();
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.fillStyle = '#818cf8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[PARALISIA: TEMPO SUSPENSO]', width / 2, 28);
      ctx.restore();
    }

    ctx.restore();
  }
}
