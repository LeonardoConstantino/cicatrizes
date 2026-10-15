import { adaptiveAudio } from '../audio/AdaptiveAudio';
import { JuiceSystem } from '../presentation/Juice';
import { InputState, PlayerState, World, WorldUpdateResult } from './World';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  isEcho?: boolean;
}

interface ShooterEnemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  color: string;
  shape: 'circle' | 'diamond' | 'triangle';
  pulseAngle: number;
}

interface HazardDebris {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export class ShooterWorld extends World {
  public id = 'IMPACTO';
  public name = 'MUNDO I — IMPACTO';
  public archetype = 'Arcade Shooter Top-Down';
  public dominantColor = '#d85a30';
  public secondaryColor = '#ffffff';

  private bullets: Bullet[] = [];
  private enemies: ShooterEnemy[] = [];
  private debrisList: HazardDebris[] = [];
  private enemyIdCounter = 0;
  private spawnTimer = 0;
  private killCounter = 0;
  private shootCooldown = 0;
  private lastAttackAngle = 0;
  private lastAttackPos = { x: 0, y: 0 };
  private echoQueue: Array<{ triggerTime: number; x: number; y: number; vx: number; vy: number }> = [];
  private shockwaveRings: Array<{ x: number; y: number; radius: number; maxRadius: number }> = [];

  public getEnemies(): ShooterEnemy[] {
    return this.enemies;
  }

  public init(player: PlayerState, width: number, height: number): void {
    player.x = width / 2;
    player.y = height / 2;
    this.bullets = [];
    this.enemies = [];
    this.debrisList = [];
    this.echoQueue = [];
    this.shockwaveRings = [];
    this.spawnTimer = 0;
    this.shootCooldown = 0;

    // Initial batch of enemies
    for (let i = 0; i < 4; i++) {
      this.spawnEnemy(width, height);
    }
  }

  private spawnEnemy(width: number, height: number): void {
    this.enemyIdCounter++;
    // Spawn along border
    let x = 0;
    let y = 0;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      x = Math.random() * width;
      y = -20;
    } else if (side === 1) {
      x = width + 20;
      y = Math.random() * height;
    } else if (side === 2) {
      x = Math.random() * width;
      y = height + 20;
    } else {
      x = -20;
      y = Math.random() * height;
    }

    const shapes: Array<'circle' | 'diamond' | 'triangle'> = ['circle', 'diamond', 'triangle'];
    this.enemies.push({
      id: this.enemyIdCounter,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 12 + Math.random() * 6,
      hp: 1,
      color: '#e11d48',
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      pulseAngle: Math.random() * Math.PI * 2,
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

    const hasEco = activeScars.includes('ECO');
    const hasFome = activeScars.includes('FOME');
    const hasMedo = activeScars.includes('MEDO');
    const hasPressa = activeScars.includes('PRESSA');
    const hasAnkora = activeScars.includes('ANKORA');
    const hasDivida = activeScars.includes('DIVIDA');
    const hasColapso = activeScars.includes('COLAPSO');
    const hasParalisia = activeScars.includes('PARALISIA');

    // Movement (WASD or Arrow keys)
    let mx = 0;
    let my = 0;
    if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;

    // Superhot PARALISIA: when player stops moving, world slows to 15%
    const isPlayerStill = mx === 0 && my === 0;
    const timeScale = hasParalisia && isPlayerStill ? 0.15 : 1.0;
    const speedMultiplier = (hasPressa ? 1.3 : 1.0) * (hasParalisia && isPlayerStill ? 1.0 : 1.0);

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      player.vx = (mx / len) * player.speed * (hasPressa ? 1.3 : 1.0);
      player.vy = (my / len) * player.speed * (hasPressa ? 1.3 : 1.0);
    } else {
      player.vx *= 0.85;
      player.vy *= 0.85;
    }

    player.x += player.vx;
    player.y += player.vy;

    // COLAPSO: bounds contract inward with kills
    const arenaMargin = hasColapso ? Math.min(160, this.killCounter * 6) : 0;
    player.x = Math.max(player.width + arenaMargin, Math.min(width - player.width - arenaMargin, player.x));
    player.y = Math.max(player.height + arenaMargin, Math.min(height - player.height - arenaMargin, player.y));

    // Facing angle (smooth aim with deadzone to eliminate oscillation)
    const dx = input.mouseX - player.x;
    const dy = input.mouseY - player.y;
    const distToMouse = Math.hypot(dx, dy);

    if (input.hasMovedMouse && distToMouse > 18) {
      player.facingAngle = Math.atan2(dy, dx);
    } else if (mx !== 0 || my !== 0) {
      player.facingAngle = Math.atan2(my, mx);
    }

    // Shooting
    if (this.shootCooldown > 0) {
      this.shootCooldown -= dtMs;
    }

    const wantsToShoot = input.mouseDown || input.keys['Space'];
    if (wantsToShoot && this.shootCooldown <= 0) {
      const cooldownBase = hasAnkora ? 240 : 150;
      this.shootCooldown = cooldownBase;
      const angle = player.facingAngle;
      const bulletSpeed = 9;
      const bVx = Math.cos(angle) * bulletSpeed;
      const bVy = Math.sin(angle) * bulletSpeed;

      this.bullets.push({
        x: player.x,
        y: player.y,
        vx: bVx,
        vy: bVy,
        radius: 4,
        color: '#fbbf24',
        life: 0,
        maxLife: 60,
      });

      this.lastAttackAngle = angle;
      this.lastAttackPos = { x: player.x, y: player.y };

      // Queue ECO if scar is active
      if (hasEco) {
        this.echoQueue.push({
          triggerTime: performance.now() + 800,
          x: player.x,
          y: player.y,
          vx: bVx,
          vy: bVy,
        });
      }

      adaptiveAudio.playLaser();
      JuiceSystem.cameraShake(2, 60);
      actionOccurred = 'attack';
    }

    // Process ECO queue
    const now = performance.now();
    for (let i = this.echoQueue.length - 1; i >= 0; i--) {
      const eco = this.echoQueue[i];
      if (now >= eco.triggerTime) {
        this.bullets.push({
          x: eco.x,
          y: eco.y,
          vx: eco.vx,
          vy: eco.vy,
          radius: 3.5,
          color: '#06b6d4',
          life: 0,
          maxLife: 60,
          isEcho: true,
        });
        JuiceSystem.spawnParticles(eco.x, eco.y, 4, '#06b6d4', 2);
        this.echoQueue.splice(i, 1);
      }
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life++;
      if (b.life >= b.maxLife || b.x < 0 || b.x > width || b.y < 0 || b.y > height) {
        this.bullets.splice(i, 1);
      }
    }

    // Spawning enemies
    this.spawnTimer += dtMs;
    const spawnInterval = Math.max(600, 1500 - player.combo * 25);
    if (this.spawnTimer >= spawnInterval && this.enemies.length < 14) {
      this.spawnTimer = 0;
      this.spawnEnemy(width, height);
    }

    // Update debris (from FOME scar)
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.life += dtMs;
      // Check collision with player
      const dist = Math.hypot(player.x - d.x, player.y - d.y);
      if (dist < player.width + d.radius) {
        playerDamage += 12;
        damageReason = 'Contaminação por fragmento de FOME';
        JuiceSystem.cameraShake(6, 120);
        JuiceSystem.spawnParticles(d.x, d.y, 8, '#f97316', 3);
        this.debrisList.splice(i, 1);
        continue;
      }
      if (d.life >= d.maxLife) {
        this.debrisList.splice(i, 1);
      }
    }

    // Update shockwaves (from DÍVIDA scar)
    for (let i = this.shockwaveRings.length - 1; i >= 0; i--) {
      const ring = this.shockwaveRings[i];
      ring.radius += 5;
      const dist = Math.hypot(player.x - ring.x, player.y - ring.y);
      if (Math.abs(dist - ring.radius) < 8) {
        playerDamage += 15;
        damageReason = 'Onda de choque de DÍVIDA';
        JuiceSystem.cameraShake(10, 160);
      }
      if (ring.radius >= ring.maxRadius) {
        this.shockwaveRings.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.pulseAngle += 0.05;

      // Behavior: target player, or avoid player if MEDO is active
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);

      let targetVx = (dx / (dist || 1)) * 2.2 * speedMultiplier;
      let targetVy = (dy / (dist || 1)) * 2.2 * speedMultiplier;

      if (hasMedo && dist < 180) {
        // Flee from player!
        targetVx = -(dx / (dist || 1)) * 3.5;
        targetVy = -(dy / (dist || 1)) * 3.5;
      }

      e.vx = e.vx * 0.9 + targetVx * 0.1;
      e.vy = e.vy * 0.9 + targetVy * 0.1;
      e.x += e.vx;
      e.y += e.vy;

      // Enemy hit by bullet or ghost agent?
      let enemyKilled = e.hp <= 0;
      for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
        const b = this.bullets[bi];
        const bDist = Math.hypot(e.x - b.x, e.y - b.y);
        if (bDist < e.radius + b.radius) {
          this.bullets.splice(bi, 1);
          e.hp -= 1;
          if (e.hp <= 0) {
            enemyKilled = true;
            break;
          }
        }
      }

      if (enemyKilled) {
        this.killCounter++;
        JuiceSystem.hitstop(30);
        JuiceSystem.cameraShake(7, 120);
        JuiceSystem.spawnParticles(e.x, e.y, 14, e.color, 4);
        adaptiveAudio.playExplosion();

        scoreGained += 150 * (player.combo + 1);
        comboIncrease++;
        actionOccurred = 'kill';
        const points = 150 * (player.combo + 1);
        JuiceSystem.spawnText(e.x, e.y - 12, `+${points}`, '#06b6d4', 13, player.combo >= 4);

        // FOME scar: leaves hazard debris
        if (hasFome) {
          this.debrisList.push({
            x: e.x,
            y: e.y,
            radius: 9,
            life: 0,
            maxLife: 8000,
          });
        }

        // DIVIDA scar: increments debt and can trigger debt shockwave
        if (hasDivida) {
          player.debt++;
          if (player.debt % 5 === 0) {
            this.shockwaveRings.push({
              x: e.x,
              y: e.y,
              radius: 5,
              maxRadius: 280,
            });
          }
        }

        this.enemies.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (dist < player.width + e.radius) {
        playerDamage += 18;
        damageReason = 'Impacto direto com agressivo';
        JuiceSystem.cameraShake(10, 180);
        JuiceSystem.spawnParticles(player.x, player.y, 10, '#ef4444', 3);
        this.enemies.splice(i, 1);
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
    // Background grid
    ctx.save();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Render Debris (FOME)
    for (const d of this.debrisList) {
      ctx.save();
      const alpha = 0.5 + Math.sin(performance.now() * 0.01) * 0.3;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fdba74';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Render Shockwaves (DÍVIDA)
    for (const s of this.shockwaveRings) {
      ctx.save();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = Math.max(0, 1 - s.radius / s.maxRadius);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Render Bullets
    for (const b of this.bullets) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render Enemies
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.pulseAngle);
      ctx.fillStyle = e.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      if (e.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(e.radius, 0);
        ctx.lineTo(0, e.radius);
        ctx.lineTo(-e.radius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (e.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(e.radius * 0.9, e.radius * 0.8);
        ctx.lineTo(-e.radius * 0.9, e.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // COLAPSO: Render contracted boundary wall
    const hasColapso = activeScars.includes('COLAPSO');
    if (hasColapso) {
      const arenaMargin = Math.min(160, this.killCounter * 6);
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.strokeRect(arenaMargin, arenaMargin, width - arenaMargin * 2, height - arenaMargin * 2);
      ctx.restore();
    }

    // PARALISIA visual indicator
    const hasParalisia = activeScars.includes('PARALISIA');
    if (hasParalisia && Math.hypot(player.vx, player.vy) < 0.2) {
      ctx.save();
      ctx.fillStyle = '#818cf8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[PARALISIA: TEMPO SUSPENSO]', width / 2, 28);
      ctx.restore();
    }
  }
}
