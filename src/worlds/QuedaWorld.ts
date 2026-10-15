import { adaptiveAudio } from '../audio/AdaptiveAudio';
import { JuiceSystem } from '../presentation/Juice';
import { InputState, PlayerState, World, WorldUpdateResult } from './World';

export interface QuedaMine {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  oscillationPhase: number;
  pulseTimer: number;
  scoredNearMiss?: boolean;
}

export interface QuedaBeam {
  id: number;
  y: number;
  gapX: number;
  gapWidth: number;
  height: number;
  isFragile: boolean;
  broken: boolean;
  speedX: number;
  scoredNearMiss?: boolean;
}

export interface QuedaDataOrb {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  color: string;
}

interface EchoThrusterWave {
  triggerTime: number;
  x: number;
  y: number;
  radius: number;
}

export class QuedaWorld extends World {
  public id = 'QUEDA';
  public name = 'MUNDO III — QUEDA';
  public archetype = 'Mergulho no Vazio & Descida Terminal';
  public dominantColor = '#f59e0b';
  public secondaryColor = '#06b6d4';

  private fallSpeed = 3.2;
  private currentDescentSpeed = 3.2;
  private normalSpeed = 3.2;
  private diveSpeed = 8.0;
  private brakeSpeed = 1.2;

  private beams: QuedaBeam[] = [];
  private mines: QuedaMine[] = [];
  private orbs: QuedaDataOrb[] = [];
  private echoWaves: EchoThrusterWave[] = [];

  private spawnTimer = 0;
  private orbSpawnTimer = 0;
  private entityIdCounter = 0;
  private distanceFallen = 0;
  private isDiving = false;
  private isBraking = false;
  private thrusterAudioCooldown = 0;
  private riskNearMissCooldown = 0;
  private dividaCounter = 0;
  private lastGapX = 400;

  // Background speedlines & tunnel grid
  private tunnelWidth = 800;
  private speedLines: { x: number; y: number; length: number; speed: number }[] = [];

  public getEnemies(): QuedaMine[] {
    return this.mines.filter(m => m.hp > 0);
  }

  public init(player: PlayerState, width: number, height: number): void {
    player.x = width / 2;
    player.y = height * 0.35;
    player.vx = 0;
    player.vy = 0;
    player.facingAngle = Math.PI / 2; // facing downwards

    this.beams = [];
    this.mines = [];
    this.orbs = [];
    this.echoWaves = [];
    this.distanceFallen = 0;
    this.tunnelWidth = Math.min(width * 0.9, 900);
    this.lastGapX = width / 2;

    // Initialize speedlines
    this.speedLines = [];
    for (let i = 0; i < 40; i++) {
      this.speedLines.push({
        x: width * 0.1 + Math.random() * (width * 0.8),
        y: Math.random() * height,
        length: 20 + Math.random() * 60,
        speed: 8 + Math.random() * 12,
      });
    }

    // Seed initial obstacles well below player
    this.spawnBeam(height * 0.85, width);
    this.spawnBeam(height * 1.35, width);
    this.spawnMine(height * 1.10, width);
  }

  private spawnBeam(yPos: number, screenWidth: number): void {
    // Generous and fair gap width (210px to 300px)
    const gapWidth = 210 + Math.random() * 90;
    const minX = (screenWidth - this.tunnelWidth) / 2 + 50;
    const maxX = (screenWidth + this.tunnelWidth) / 2 - gapWidth - 50;

    // Slalom coherence: ensure new gap is comfortably reachable from previous gap position
    const maxDelta = 240;
    const targetGapX = this.lastGapX + (Math.random() - 0.5) * 2 * maxDelta;
    const gapX = Math.max(minX, Math.min(maxX, targetGapX));
    this.lastGapX = gapX;

    this.beams.push({
      id: ++this.entityIdCounter,
      y: yPos,
      gapX,
      gapWidth,
      height: 14,
      isFragile: Math.random() < 0.35,
      broken: false,
      speedX: (Math.random() - 0.5) * 0.7, // smooth, predictable drift
    });
  }

  private spawnMine(yPos: number, screenWidth: number): void {
    const minX = (screenWidth - this.tunnelWidth) / 2 + 50;
    const maxX = (screenWidth + this.tunnelWidth) / 2 - 50;
    const x = minX + Math.random() * (maxX - minX);

    this.mines.push({
      id: ++this.entityIdCounter,
      x,
      y: yPos,
      radius: 13,
      hp: 1,
      maxHp: 1,
      oscillationPhase: Math.random() * Math.PI * 2,
      pulseTimer: 0,
    });
  }

  private spawnOrb(yPos: number, screenWidth: number): void {
    const minX = (screenWidth - this.tunnelWidth) / 2 + 40;
    const maxX = (screenWidth + this.tunnelWidth) / 2 - 40;
    this.orbs.push({
      id: ++this.entityIdCounter,
      x: minX + Math.random() * (maxX - minX),
      y: yPos,
      radius: 8,
      collected: false,
      color: Math.random() < 0.7 ? '#06b6d4' : '#f59e0b',
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

    const dtSec = dtMs / 1000;
    const now = performance.now();

    // Scar: PARALISIA check (time slows down to 15% when player is idle)
    const hasParalisia = activeScars.includes('PARALISIA');
    const isPlayerIdle =
      !input.keys['KeyW'] &&
      !input.keys['KeyS'] &&
      !input.keys['KeyA'] &&
      !input.keys['KeyD'] &&
      !input.keys['ArrowUp'] &&
      !input.keys['ArrowDown'] &&
      !input.keys['ArrowLeft'] &&
      !input.keys['ArrowRight'] &&
      !input.mouseDown &&
      !input.keys['Space'];

    const timeScale = hasParalisia && isPlayerIdle ? 0.15 : 1.0;
    const scaledDtMs = dtMs * timeScale;

    // Tunnel bounds and COLAPSO scar
    let effectiveTunnelWidth = this.tunnelWidth;
    if (activeScars.includes('COLAPSO')) {
      effectiveTunnelWidth = Math.max(340, this.tunnelWidth - (player.score / 1500) * 80);
    }
    const tunnelLeft = (width - effectiveTunnelWidth) / 2;
    const tunnelRight = (width + effectiveTunnelWidth) / 2;

    // Movement & Thrusters Controls
    let moveX = 0;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

    // Direct proportional mouse tracking if no keyboard key is pressed
    if (moveX === 0 && input.hasMovedMouse) {
      const mouseDx = input.mouseX - player.x;
      if (Math.abs(mouseDx) > 4) {
        const mouseStrength = Math.min(1.0, Math.abs(mouseDx) / 40);
        moveX = Math.sign(mouseDx) * mouseStrength;
      }
    }

    // Vertical Descent Modes
    const wantsBrake = input.keys['KeyW'] || input.keys['ArrowUp'] || input.mouseDown || input.keys['Space'];
    const wantsDive = input.keys['KeyS'] || input.keys['ArrowDown'];

    this.isBraking = wantsBrake && !wantsDive;
    this.isDiving = wantsDive;

    // Super agile lateral steering (10.5 base, and 13.5 with RCS retrothruster boost when braking)
    const baseSteerSpeed = 10.5;
    const steerSpeed = this.isBraking ? 13.5 : baseSteerSpeed;
    player.vx = moveX * steerSpeed;
    player.x += player.vx * timeScale;
    player.x = Math.max(tunnelLeft + 15, Math.min(tunnelRight - 15, player.x));

    // ANKORA scar: adds slight inertia lag to thrusters
    const hasAnkora = activeScars.includes('ANKORA');
    const speedLerp = hasAnkora ? 0.06 : 0.16;

    let targetSpeed = this.normalSpeed;
    if (this.isDiving) {
      targetSpeed = this.diveSpeed;
    } else if (this.isBraking) {
      targetSpeed = this.brakeSpeed;
    }

    this.currentDescentSpeed += (targetSpeed - this.currentDescentSpeed) * speedLerp;
    const descentDelta = this.currentDescentSpeed * (scaledDtMs / 16.66);
    this.distanceFallen += descentDelta;

    // Thruster Audio & Particle Effects
    this.thrusterAudioCooldown -= scaledDtMs;
    if (this.isBraking && this.thrusterAudioCooldown <= 0) {
      this.thrusterAudioCooldown = 280;
      adaptiveAudio.playThruster();
      JuiceSystem.spawnParticles(player.x, player.y + 12, 4, '#38bdf8', 3);
      actionOccurred = 'dodge';

      // Scar ECO: spawn lingering burst wave that shatters obstacles below 800ms later
      if (activeScars.includes('ECO')) {
        this.echoWaves.push({
          triggerTime: now + 800,
          x: player.x,
          y: player.y,
          radius: 35,
        });
      }
    }

    if (this.isDiving) {
      JuiceSystem.spawnParticles(player.x, player.y - 12, 3, '#f97316', 4);
      actionOccurred = 'risk_take';
    }

    // Facing angle follows descent and lateral tilt
    player.facingAngle = Math.PI / 2 + (player.vx / steerSpeed) * 0.45;

    // Spawn Obstacles & Orbs based on distance (fairer pacing)
    this.spawnTimer += scaledDtMs;
    const spawnInterval = Math.max(1300, 2000 - (this.distanceFallen / 2500) * 350);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      if (Math.random() < 0.6) {
        this.spawnBeam(height + 40, width);
      } else {
        this.spawnMine(height + 40, width);
      }
    }

    this.orbSpawnTimer += scaledDtMs;
    if (this.orbSpawnTimer >= 1100) {
      this.orbSpawnTimer = 0;
      this.spawnOrb(height + 30, width);
    }

    // Process ECO waves
    for (let i = this.echoWaves.length - 1; i >= 0; i--) {
      const wave = this.echoWaves[i];
      if (now >= wave.triggerTime) {
        adaptiveAudio.playExplosion();
        JuiceSystem.spawnParticles(wave.x, wave.y, 16, '#06b6d4', 4);
        JuiceSystem.cameraShake(6, 120);

        // Break fragile beams or detonate mines near echo position
        for (const mine of this.mines) {
          if (mine.hp > 0 && Math.hypot(mine.x - wave.x, mine.y - wave.y) < 60) {
            mine.hp = 0;
            scoreGained += 200;
            comboIncrease++;
          }
        }
        for (const beam of this.beams) {
          if (!beam.broken && Math.abs(beam.y - wave.y) < 40) {
            beam.broken = true;
            scoreGained += 250;
            comboIncrease++;
          }
        }
        this.echoWaves.splice(i, 1);
      }
    }

    // Update Beams
    const hasMedo = activeScars.includes('MEDO');
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.y -= descentDelta;

      // Move gap horizontally (oscillate)
      if (hasMedo) {
        b.speedX = Math.sin(now * 0.003 + b.id) * 2.2;
      }
      b.gapX += b.speedX * (scaledDtMs / 16.66);
      const minX = tunnelLeft + 20;
      const maxX = tunnelRight - b.gapWidth - 20;
      if (b.gapX < minX || b.gapX > maxX) {
        b.speedX *= -1;
      }

      // Check collision with player with generous 16px cushion margin
      if (!b.broken && Math.abs(b.y - player.y) < b.height + 8) {
        const margin = 16;
        const inGap = player.x >= (b.gapX - margin) && player.x <= (b.gapX + b.gapWidth + margin);
        if (!inGap) {
          if (this.isDiving && b.isFragile) {
            // Shatter barrier through high-speed dive!
            b.broken = true;
            scoreGained += 350 * (player.combo + 1);
            comboIncrease++;
            actionOccurred = 'kill';
            JuiceSystem.hitstop(30);
            JuiceSystem.cameraShake(10, 160);
            adaptiveAudio.playExplosion();
            JuiceSystem.spawnParticles(player.x, player.y, 20, '#f59e0b', 5);
            JuiceSystem.spawnText(player.x, player.y - 24, '+350 RUPTURA!', '#f59e0b', 16, true);
            JuiceSystem.triggerGlitch(6, 100);
          } else {
            // Collision damage
            playerDamage += 16;
            damageReason = 'Impacto com Viga Estrutural';
            b.broken = true;
          }
        } else if (!b.scoredNearMiss && Math.abs(b.y - player.y) < 8) {
          // Near Miss through gap!
          b.scoredNearMiss = true;
          scoreGained += 150 * (player.combo + 1);
          comboIncrease++;
          adaptiveAudio.playNearMiss();
          JuiceSystem.spawnParticles(player.x, player.y, 8, '#38bdf8', 3);
          JuiceSystem.spawnText(player.x, player.y - 18, '+150 RASANTE!', '#38bdf8', 14);
          this.checkDivida(player, activeScars);
          if (!actionOccurred) actionOccurred = 'risk_take';
        }
      }

      if (b.y < -50) {
        this.beams.splice(i, 1);
      }
    }

    // Update Mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.y -= descentDelta;
      m.pulseTimer += scaledDtMs * 0.004;
      if (hasMedo) {
        m.x += Math.sin(now * 0.004 + m.id) * 2;
      }

      if (m.hp > 0) {
        const dist = Math.hypot(m.x - player.x, m.y - player.y);

        // Near-miss detection
        if (!m.scoredNearMiss && dist < 32 && dist > m.radius + 8) {
          m.scoredNearMiss = true;
          scoreGained += 180 * (player.combo + 1);
          comboIncrease++;
          this.checkDivida(player, activeScars);
          JuiceSystem.spawnParticles(player.x, player.y, 4, '#f59e0b', 2);
          if (!actionOccurred) actionOccurred = 'risk_take';
        }

        // Direct hit
        if (dist < m.radius + 8) {
          m.hp = 0;
          playerDamage += 22;
          damageReason = 'Mina de Vácuo Detonada';
          JuiceSystem.spawnParticles(m.x, m.y, 18, '#ef4444', 5);
          adaptiveAudio.playExplosion();
        }
      }

      if (m.y < -50 || m.hp <= 0) {
        this.mines.splice(i, 1);
      }
    }

    // Update Data Orbs
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.y -= descentDelta;

      const dist = Math.hypot(orb.x - player.x, orb.y - player.y);
      if (dist < orb.radius + 12) {
        scoreGained += 200 * (player.combo + 1);
        comboIncrease++;
        player.identity = Math.min(player.maxIdentity, player.identity + 1);
        this.checkDivida(player, activeScars);
        adaptiveAudio.playLaser();
        JuiceSystem.spawnParticles(orb.x, orb.y, 8, orb.color, 3);
        actionOccurred = 'kill';
        this.orbs.splice(i, 1);
        continue;
      }

      if (orb.y < -50) {
        this.orbs.splice(i, 1);
      }
    }

    // Continuous score for survival in terminal descent
    scoreGained += Math.floor(this.currentDescentSpeed * 0.4);

    return {
      playerDamage,
      damageReason,
      scoreGained,
      comboIncrease,
      actionOccurred,
    };
  }

  private checkDivida(player: PlayerState, activeScars: string[]): void {
    if (!activeScars.includes('DIVIDA')) return;
    this.dividaCounter++;
    if (this.dividaCounter >= 5) {
      this.dividaCounter = 0;
      JuiceSystem.cameraShake(10, 200);
      JuiceSystem.screenFlash('#eab308', 0.35);
      adaptiveAudio.playExplosion();

      // Clear all active mines on screen
      for (const m of this.mines) {
        m.hp = 0;
        JuiceSystem.spawnParticles(m.x, m.y, 8, '#eab308', 3);
      }
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
    const effectiveTunnelWidth = activeScars.includes('COLAPSO')
      ? Math.max(340, this.tunnelWidth - (player.score / 1500) * 80)
      : this.tunnelWidth;
    const tunnelLeft = (width - effectiveTunnelWidth) / 2;
    const tunnelRight = (width + effectiveTunnelWidth) / 2;

    // Dark cyber-chasm background
    ctx.fillStyle = '#080811';
    ctx.fillRect(0, 0, width, height);

    // Speedlines rushing upwards
    ctx.save();
    ctx.strokeStyle = this.isDiving ? 'rgba(245, 158, 11, 0.45)' : 'rgba(6, 182, 212, 0.22)';
    ctx.lineWidth = this.isDiving ? 2 : 1;
    for (const line of this.speedLines) {
      line.y -= line.speed * (this.currentDescentSpeed / this.normalSpeed);
      if (line.y < -100) {
        line.y = height + 50;
        line.x = tunnelLeft + Math.random() * effectiveTunnelWidth;
      }
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x, line.y - line.length);
      ctx.stroke();
    }
    ctx.restore();

    // Tunnel Cyber Walls
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, tunnelLeft, height);
    ctx.fillRect(tunnelRight, 0, width - tunnelRight, height);

    // Glowing border cables
    ctx.strokeStyle = activeScars.includes('COLAPSO') ? '#f43f5e' : '#f59e0b';
    ctx.lineWidth = 3;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(tunnelLeft, 0);
    ctx.lineTo(tunnelLeft, height);
    ctx.moveTo(tunnelRight, 0);
    ctx.lineTo(tunnelRight, height);
    ctx.stroke();
    ctx.restore();

    // Render Data Orbs
    for (const orb of this.orbs) {
      ctx.save();
      ctx.fillStyle = orb.color;
      ctx.shadowColor = orb.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render Beams
    for (const b of this.beams) {
      if (b.broken) continue;
      ctx.save();
      const beamColor = b.isFragile ? '#f59e0b' : '#38bdf8';
      ctx.fillStyle = b.isFragile ? 'rgba(245, 158, 11, 0.7)' : 'rgba(56, 189, 248, 0.8)';
      ctx.shadowColor = beamColor;
      ctx.shadowBlur = 8;

      // Left segment
      const leftSegWidth = Math.max(0, b.gapX - tunnelLeft);
      if (leftSegWidth > 0) {
        ctx.fillRect(tunnelLeft, b.y - b.height / 2, leftSegWidth, b.height);
      }

      // Right segment
      const rightSegStart = b.gapX + b.gapWidth;
      const rightSegWidth = Math.max(0, tunnelRight - rightSegStart);
      if (rightSegWidth > 0) {
        ctx.fillRect(rightSegStart, b.y - b.height / 2, rightSegWidth, b.height);
      }

      // Gap markers (chevrons)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.gapX, b.y, 4, 0, Math.PI * 2);
      ctx.arc(b.gapX + b.gapWidth, b.y, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Render Mines
    for (const m of this.mines) {
      if (m.hp <= 0) continue;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;

      // Pulsing octagonal hazard
      const scale = 1 + Math.sin(now * 0.008 + m.id) * 0.15;
      ctx.scale(scale, scale);

      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const ang = (j * Math.PI) / 4;
        const r = j % 2 === 0 ? m.radius : m.radius * 0.65;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Render ECO Waves
    for (const wave of this.echoWaves) {
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
