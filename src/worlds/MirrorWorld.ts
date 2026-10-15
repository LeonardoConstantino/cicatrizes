import { adaptiveAudio } from '../audio/AdaptiveAudio';
import { JuiceSystem } from '../presentation/Juice';
import { InputState, PlayerState, World, WorldUpdateResult } from './World';

interface RecordedMove {
  timestamp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  attacked: boolean;
}

interface ShadowSlash {
  x: number;
  y: number;
  angle: number;
  life: number;
  maxLife: number;
}

export class MirrorWorld extends World {
  public id = 'ESPELHO';
  public name = 'MUNDO VI — ESPELHO';
  public archetype = 'Duelo 1v1 com Reflexo Adaptativo';
  public dominantColor = '#534ab7';
  public secondaryColor = '#c084fc';

  private shadowX = 0;
  private shadowY = 0;
  private shadowHp = 20;
  private shadowMaxHp = 20;
  private shadowFacingAngle = 0;
  private movementBuffer: RecordedMove[] = [];
  private shadowSlashes: ShadowSlash[] = [];
  private playerSlashes: ShadowSlash[] = [];
  private attackCooldown = 0;
  private shadowEnemyTarget: Array<{ x: number; y: number; radius: number; hp: number }> = [];

  public getEnemies(): Array<{ x: number; y: number; radius: number; hp: number }> {
    if (this.shadowHp <= 0) return [];
    this.shadowEnemyTarget = [{ x: this.shadowX, y: this.shadowY, radius: 22, hp: this.shadowHp }];
    return this.shadowEnemyTarget;
  }

  public init(player: PlayerState, width: number, height: number): void {
    player.x = width * 0.3;
    player.y = height / 2;
    this.shadowX = width * 0.7;
    this.shadowY = height / 2;
    this.shadowHp = 20;
    this.shadowMaxHp = 20;
    this.shadowFacingAngle = Math.PI;
    this.movementBuffer = [];
    this.shadowSlashes = [];
    this.playerSlashes = [];
    this.attackCooldown = 0;
    this.shadowEnemyTarget = [];
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
    let cycleCompleted = false;

    const hasAnkora = activeScars.includes('ANKORA');

    // Movement
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
    } else {
      player.vx *= 0.85;
      player.vy *= 0.85;
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

    // Player attack
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dtMs;
    }

    let playerAttackedThisFrame = false;
    const wantsToAttack = input.mouseDown || input.keys['Space'];
    if (wantsToAttack && this.attackCooldown <= 0) {
      this.attackCooldown = hasAnkora ? 320 : 200;
      playerAttackedThisFrame = true;
      adaptiveAudio.playMelee();
      JuiceSystem.cameraShake(4, 80);
      actionOccurred = 'attack';

      const slashRadius = 70;
      this.playerSlashes.push({
        x: player.x,
        y: player.y,
        angle: player.facingAngle,
        life: 0,
        maxLife: 10,
      });

      // Hit shadow?
      const dist = Math.hypot(this.shadowX - player.x, this.shadowY - player.y);
      if (dist < slashRadius + 18) {
        this.shadowHp -= 1;
        scoreGained += 300 * (player.combo + 1);
        comboIncrease++;
        actionOccurred = 'kill';
        JuiceSystem.hitstop(35);
        JuiceSystem.cameraShake(8, 120);
        JuiceSystem.spawnParticles(this.shadowX, this.shadowY, 14, '#c084fc', 4);
        JuiceSystem.spawnText(this.shadowX, this.shadowY - 22, '-1 HP ESPELHO!', '#c084fc', 16, true);
        JuiceSystem.triggerGlitch(6, 100);
        adaptiveAudio.playExplosion();

        if (this.shadowHp <= 0) {
          // Shadow defeated: Complete Cycle Victory!
          this.shadowHp = this.shadowMaxHp;
          scoreGained += 5000;
          cycleCompleted = true;
          JuiceSystem.spawnText(this.shadowX, this.shadowY - 35, 'CICLO SUPERADO! +5000', '#f59e0b', 20, true);
          JuiceSystem.triggerGlitch(14, 250);
        }
      }
    }

    // Record player movement to buffer (delay: 1100ms)
    const now = performance.now();
    this.movementBuffer.push({
      timestamp: now,
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      facingAngle: player.facingAngle,
      attacked: playerAttackedThisFrame,
    });

    // Shadow replays delayed movement
    const delayedTime = now - 1100;
    while (this.movementBuffer.length > 0 && this.movementBuffer[0].timestamp < delayedTime) {
      const pastMove = this.movementBuffer.shift()!;

      // Mirror horizontally across arena center
      const mirroredX = width - pastMove.x;
      const mirroredY = pastMove.y;

      this.shadowX = mirroredX;
      this.shadowY = mirroredY;
      this.shadowFacingAngle = Math.atan2(player.y - this.shadowY, player.x - this.shadowX);

      // If player attacked 1100ms ago, the shadow counters now!
      if (pastMove.attacked) {
        this.shadowSlashes.push({
          x: this.shadowX,
          y: this.shadowY,
          angle: this.shadowFacingAngle,
          life: 0,
          maxLife: 10,
        });

        // Did shadow hit player?
        const dist = Math.hypot(player.x - this.shadowX, player.y - this.shadowY);
        if (dist < 75) {
          playerDamage += 18;
          damageReason = 'Golpe espelhado pelo seu próprio reflexo';
          JuiceSystem.cameraShake(9, 140);
          JuiceSystem.spawnParticles(player.x, player.y, 10, '#ef4444', 3);
        }
      }
    }

    // Update slashes
    for (let i = this.playerSlashes.length - 1; i >= 0; i--) {
      this.playerSlashes[i].life++;
      if (this.playerSlashes[i].life >= this.playerSlashes[i].maxLife) {
        this.playerSlashes.splice(i, 1);
      }
    }
    for (let i = this.shadowSlashes.length - 1; i >= 0; i--) {
      this.shadowSlashes[i].life++;
      if (this.shadowSlashes[i].life >= this.shadowSlashes[i].maxLife) {
        this.shadowSlashes.splice(i, 1);
      }
    }

    // Did ghost agent damage the shadow?
    if (this.shadowEnemyTarget.length > 0 && this.shadowEnemyTarget[0].hp < this.shadowHp) {
      const damageTaken = this.shadowHp - this.shadowEnemyTarget[0].hp;
      this.shadowHp = Math.max(0, this.shadowHp - damageTaken);
      scoreGained += 250 * (player.combo + 1);
      comboIncrease++;
      JuiceSystem.hitstop(35);
      JuiceSystem.cameraShake(8, 140);
      JuiceSystem.spawnParticles(this.shadowX, this.shadowY, 15, '#c084fc', 4);
      adaptiveAudio.playMelee();

      if (this.shadowHp <= 0 && !cycleCompleted) {
        cycleCompleted = true;
        scoreGained += 5000;
        JuiceSystem.screenFlash('#c084fc', 0.6);
        JuiceSystem.cameraShake(18, 400);
        adaptiveAudio.playExplosion();
      }
    }

    return {
      playerDamage,
      damageReason,
      scoreGained,
      comboIncrease,
      actionOccurred,
      cycleCompleted,
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

    // Mirror center dividing line
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Player slashes
    for (const s of this.playerSlashes) {
      const p = s.life / s.maxLife;
      ctx.strokeStyle = `rgba(251, 191, 36, ${1 - p})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 65, s.angle - 0.7, s.angle + 0.7);
      ctx.stroke();
    }

    // Shadow slashes
    for (const s of this.shadowSlashes) {
      const p = s.life / s.maxLife;
      ctx.strokeStyle = `rgba(168, 85, 247, ${1 - p})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 65, s.angle - 0.7, s.angle + 0.7);
      ctx.stroke();
    }

    // Render Shadow entity
    ctx.save();
    ctx.translate(this.shadowX, this.shadowY);
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Shadow eye indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(Math.cos(this.shadowFacingAngle) * 8, Math.sin(this.shadowFacingAngle) * 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Shadow health ring
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    const hpFraction = this.shadowHp / this.shadowMaxHp;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2 * hpFraction);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
}
