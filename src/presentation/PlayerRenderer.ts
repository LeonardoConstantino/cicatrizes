import { PlayerState, InputState } from '../worlds/World';

export class PlayerRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    worldId: string,
    input: InputState,
    animTime: number,
    isGrounded: boolean = true,
    isTransitioning: boolean = false,
    morphProgress: number = 0,
    nextWorldId?: string
  ): void {
    ctx.save();
    ctx.translate(player.x, player.y);

    const speed = Math.hypot(player.vx, player.vy);
    const isMoving = speed > 0.2;

    // Kinetic Squash & Stretch along velocity vector
    if (speed > 0.6) {
      const moveAngle = Math.atan2(player.vy, player.vx);
      const stretch = Math.min(0.24, (speed / 7) * 0.24);
      const squash = stretch * 0.55;
      ctx.rotate(moveAngle);
      ctx.scale(1 + stretch, 1 - squash);
      ctx.rotate(-moveAngle);
    }

    if (isTransitioning && nextWorldId && morphProgress > 0) {
      // Cross-fade: corpo antigo se desmonta enquanto o novo se materializa
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - morphProgress * 1.5);
      this.renderAvatarForWorld(ctx, player, worldId, input, animTime, isGrounded, isMoving, speed);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = Math.min(1, morphProgress * 1.5);
      this.renderAvatarForWorld(ctx, player, nextWorldId, input, animTime, isGrounded, isMoving, speed);
      ctx.restore();

      // Anéis de distorção concêntricos — um por mundo; cor indica o próximo
      this.renderTransitionRings(ctx, morphProgress, nextWorldId);
    } else {
      this.renderAvatarForWorld(ctx, player, worldId, input, animTime, isGrounded, isMoving, speed);
    }

    ctx.restore();
  }

  private static renderTransitionRings(
    ctx: CanvasRenderingContext2D,
    morphProgress: number,
    nextWorldId: string
  ): void {
    const colors: Record<string, string> = {
      IMPACTO: '#38bdf8',
      RITMO: '#8b5cf6',
      QUEDA: '#f59e0b',
      FOME: '#f97316',
      SILENCIO: '#94a3b8',
      ESPELHO: '#c084fc',
    };
    const color = colors[nextWorldId] ?? '#38bdf8';
    const alpha = Math.sin(morphProgress * Math.PI) * 0.85;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = alpha * (1 - i * 0.25);
      ctx.beginPath();
      ctx.arc(0, 0, 14 + i * 8 + morphProgress * 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private static renderAvatarForWorld(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    worldId: string,
    input: InputState,
    animTime: number,
    isGrounded: boolean,
    isMoving: boolean,
    speed: number
  ): void {
    switch (worldId) {
      case 'IMPACTO':
        this.renderShooterShip(ctx, player, isMoving, animTime);
        break;

      case 'RITMO':
        this.renderRhythmRunner(ctx, player, isGrounded, isMoving, speed, animTime);
        break;

      case 'QUEDA':
        this.renderFallDescender(ctx, player, isMoving, animTime);
        break;

      case 'FOME':
        this.renderMeleeGladiator(ctx, player, isMoving, animTime);
        break;

      case 'SILENCIO':
        this.renderSilentWeaver(ctx, player, isMoving, animTime);
        break;

      case 'ESPELHO':
        this.renderMirrorDuelist(ctx, player, isMoving, animTime);
        break;

      default:
        this.renderShooterShip(ctx, player, isMoving, animTime);
        break;
    }
  }

  /**
   * MUNDO I: IMPACTO — Nave Interceptora High-Tech
   * Silhueta delta; cockpit hexagonal = "olho" do Núcleo; placas de titânio
   * escuro com linhas de energia ciano; propulsores iônicos laranja/azul.
   */
  private static renderShooterShip(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isMoving: boolean,
    animTime: number
  ): void {
    ctx.rotate(player.facingAngle);

    // Propulsores iônicos (plasma laranja → azul + anel de aceleração)
    if (isMoving) {
      const flameLength = 10 + Math.sin(animTime * 0.03) * 6;
      const grad = ctx.createLinearGradient(
        -player.width * 0.8, 0,
        -player.width * 0.8 - flameLength, 0
      );
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(0.4, '#38bdf8');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-player.width * 0.55, -player.height * 0.35);
      ctx.lineTo(-player.width * 0.8 - flameLength, 0);
      ctx.lineTo(-player.width * 0.55, player.height * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.sin(animTime * 0.05) * 0.3})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(-player.width * 0.9, 0, 3, player.height * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Fuselagem — delta agressivo em titânio escuro
    ctx.fillStyle = '#0f172a';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(player.width * 1.15, 0);
    ctx.lineTo(-player.width * 0.85, -player.height * 0.75);
    ctx.lineTo(-player.width * 0.35, 0);
    ctx.lineTo(-player.width * 0.85, player.height * 0.75);
    ctx.closePath();
    ctx.fill();

    // Placas sobrepostas
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(player.width * 0.7, 0);
    ctx.lineTo(-player.width * 0.6, -player.height * 0.55);
    ctx.lineTo(-player.width * 0.3, -player.height * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(player.width * 0.7, 0);
    ctx.lineTo(-player.width * 0.6, player.height * 0.55);
    ctx.lineTo(-player.width * 0.3, player.height * 0.15);
    ctx.closePath();
    ctx.fill();

    // Linhas de energia ciano vazando pelas frestas
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(player.width * 0.85, 0);
    ctx.lineTo(-player.width * 0.5, -player.height * 0.4);
    ctx.moveTo(player.width * 0.85, 0);
    ctx.lineTo(-player.width * 0.5, player.height * 0.4);
    ctx.stroke();

    // Contorno metálico
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(player.width * 1.15, 0);
    ctx.lineTo(-player.width * 0.85, -player.height * 0.75);
    ctx.lineTo(-player.width * 0.35, 0);
    ctx.lineTo(-player.width * 0.85, player.height * 0.75);
    ctx.closePath();
    ctx.stroke();

    // Cockpit hexagonal — o "olho" do Núcleo
    ctx.save();
    ctx.translate(player.width * 0.1, 0);
    const corePulse = 0.85 + Math.sin(animTime * 0.008) * 0.15;

    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#7dd3fc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * 4.5 * corePulse;
      const y = Math.sin(a) * 4.5 * corePulse;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Núcleo interno
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 1.6 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * MUNDO II: RITMO — Corredor Acrobático Rítmico
   * Silhueta esguia; pernas longas digitígradas; viseira fina com equalizador;
   * Núcleo exposto no peito; juntas com pistões; lenço de partículas.
   */
  private static renderRhythmRunner(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isGrounded: boolean,
    isMoving: boolean,
    speed: number,
    animTime: number
  ): void {
    const facingRight = player.vx >= 0;
    ctx.scale(facingRight ? 1 : -1, 1);

    const beatPulse = (Math.sin(animTime * 0.008) + 1) * 0.5;

    // Onda sonora / pulso de passo aos pés
    if (isGrounded) {
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.3 + beatPulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, player.height + 2, 10 + beatPulse * 5, 3, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(34, 211, 238, ${0.2 + beatPulse * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(0, player.height + 2, 16 + beatPulse * 6, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const runCycle = isMoving && isGrounded ? Math.sin(animTime * 0.016) : 0;
    const legSpread = isMoving && isGrounded ? runCycle * 8 : 0;

    // Pernas longas articuladas (digitígradas) com juntas expostas
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 8;

    if (isGrounded) {
      // Esquerda: quadril → joelho → tornozelo → pé digitígrado
      ctx.beginPath();
      ctx.moveTo(-3, player.height * 0.1);
      ctx.lineTo(-6 - legSpread, player.height * 0.55);
      ctx.lineTo(-3 - legSpread, player.height * 0.85);
      ctx.lineTo(-6 - legSpread, player.height);
      ctx.stroke();
      // Direita
      ctx.beginPath();
      ctx.moveTo(3, player.height * 0.1);
      ctx.lineTo(6 + legSpread, player.height * 0.55);
      ctx.lineTo(3 + legSpread, player.height * 0.85);
      ctx.lineTo(6 + legSpread, player.height);
      ctx.stroke();
    } else {
      // Pose aérea esticada — uma perna à frente, outra atrás
      ctx.beginPath();
      ctx.moveTo(-3, player.height * 0.1);
      ctx.lineTo(-10, player.height * 0.5);
      ctx.lineTo(-3, player.height * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, player.height * 0.1);
      ctx.lineTo(9, player.height * 0.55);
      ctx.lineTo(3, player.height * 0.95);
      ctx.stroke();
    }

    // Tronco — leve inclinação ao correr
    const lean = isMoving ? 0.15 : 0;
    ctx.save();
    ctx.rotate(lean);

    // Tronco em fibra escura com placas leves
    ctx.fillStyle = '#1e1b4b';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(-5, -player.height * 0.4, 10, player.height * 0.55, 3);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Núcleo exposto no peito (pulsa)
    const corePulse = 0.85 + Math.sin(animTime * 0.01) * 0.15;
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, -player.height * 0.15, 2.5 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(0, -player.height * 0.15, 1 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça — viseira fina com equalizador animado
    ctx.fillStyle = '#0f172a';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(2, -player.height * 0.65, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b5cf6';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(2, -player.height * 0.68, 6, 2.5, 1);
    ctx.fill();

    // Barras do equalizador — "olhos" de luz piscando no beat
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) {
      const barH = 1 + ((Math.sin(animTime * 0.015 + i * 1.3) + 1) * 0.5) * 2.5;
      ctx.fillStyle = i === 1 ? '#22d3ee' : '#e0f2fe';
      ctx.fillRect(3 + i * 1.6, -player.height * 0.68 + (2.5 - barH) / 2, 1, barH);
    }

    // Lenço de velocidade — trilha de partículas
    if (isMoving) {
      const trailWave = Math.sin(animTime * 0.02) * 3;
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.9)';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(-4, -player.height * 0.5);
      ctx.quadraticCurveTo(-14, -player.height * 0.5 + trailWave, -24, -player.height * 0.3 - trailWave);
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(-20, -player.height * 0.35 - trailWave, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * MUNDO III: FOME — Gladiador / Mestre de Lâminas
   * Silhueta larga e baixa; ombreiras pesadas com espinhos; armadura de metal
   * queimado/rachado; Núcleo-fornalha no peito; katana de plasma apontando à mira.
   */
  private static renderMeleeGladiator(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isMoving: boolean,
    animTime: number
  ): void {
    ctx.rotate(player.facingAngle);

    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 14;

    // Ombreiras pesadas com espinhos curtos
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.arc(-3, -10, 6, 0, Math.PI * 2);
    ctx.arc(-3, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(-13, -12);
    ctx.moveTo(-8, 10);
    ctx.lineTo(-13, 12);
    ctx.stroke();

    // Torso — metal queimado
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.ellipse(-1, 0, 8.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rachaduras queimadas
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.lineTo(0, -2);
    ctx.lineTo(-2, 3);
    ctx.moveTo(2, 4);
    ctx.lineTo(4, 1);
    ctx.stroke();

    // Núcleo-fornalha (fome) — grelha + brilho pulsante
    const corePulse = 0.85 + Math.sin(animTime * 0.012) * 0.15;
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(-1, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    const coreGrad = ctx.createRadialGradient(-1, 0, 0, -1, 0, 4.5);
    coreGrad.addColorStop(0, '#fef08a');
    coreGrad.addColorStop(0.5, '#f97316');
    coreGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(-1, 0, 4.5 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 0.8;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(2, -2);
    ctx.moveTo(-4, 0);
    ctx.lineTo(2, 0);
    ctx.moveTo(-4, 2);
    ctx.lineTo(2, 2);
    ctx.stroke();

    // Elmo / viseira
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#ffedd5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, -2.5);
    ctx.lineTo(6, 2.5);
    ctx.stroke();

    // Katana de plasma — lâmina aponta à mira; leve oscilação ao mover
    ctx.save();
    ctx.translate(6, 7);
    ctx.rotate(0.15 + (isMoving ? Math.sin(animTime * 0.02) * 0.12 : 0));

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, -1.5, 4, 3);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(0, -1.5, 4, 3);

    const bladeGrad = ctx.createLinearGradient(4, 0, 26, 0);
    bladeGrad.addColorStop(0, '#ea580c');
    bladeGrad.addColorStop(0.6, '#fbbf24');
    bladeGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = bladeGrad;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.lineTo(26, 0);
    ctx.lineTo(4, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * MUNDO IV: ESPELHO — Duelista Espectral
   * Silhueta alta e esguia; corpo em cromo/mercúrio polido; viseira espelhada;
   * manto de energia fluida; fragmento de espelho em órbita; Núcleo visível.
   */
  private static renderMirrorDuelist(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isMoving: boolean,
    animTime: number
  ): void {
    ctx.rotate(player.facingAngle);

    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 14;

    // Manto de energia fluida (fumaça líquida / vidro derretido)
    const capeWiggle = Math.sin(animTime * 0.015) * 4;
    const capeGrad = ctx.createLinearGradient(0, 0, -26, 0);
    capeGrad.addColorStop(0, 'rgba(168, 85, 247, 0.85)');
    capeGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
    capeGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');

    ctx.fillStyle = capeGrad;
    ctx.beginPath();
    ctx.moveTo(-3, -7);
    ctx.quadraticCurveTo(-16, -9 + capeWiggle, -26, -5);
    ctx.quadraticCurveTo(-28, 0, -26, 5);
    ctx.quadraticCurveTo(-16, 9 + capeWiggle, -3, 7);
    ctx.closePath();
    ctx.fill();

    // Corpo em cromo/mercúrio polido
    const bodyGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.5, '#cbd5e1');
    bodyGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Viseira espelhada (reflete a silhueta do inimigo)
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(3, 0, 2.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(4, -1.2, 0.8, 1.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo unificador — luz pequena atravessando o cromo
    const corePulse = 0.85 + Math.sin(animTime * 0.01) * 0.15;
    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 2 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 0.9 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Fragmento de espelho em órbita
    const orbitAngle = animTime * 0.005;
    const shardX = Math.cos(orbitAngle) * 17;
    const shardY = Math.sin(orbitAngle) * 17;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(shardX, shardY, 4.5, 2, orbitAngle, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * MUNDO III: QUEDA — Mergulhador em Queda Livre Aerodinâmico
   * Traje aeroespacial com asas de vetorização em chevron, bicos de retropropulsores
   * e linhas de atrito âmbar/ciano.
   */
  private static renderFallDescender(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isMoving: boolean,
    animTime: number
  ): void {
    ctx.rotate(player.facingAngle - Math.PI / 2);

    // Retrofoguetes / Thruster Plume
    const plumeLength = 10 + Math.sin(animTime * 0.02) * 5;
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-5, -8);
    ctx.lineTo(0, -8 - plumeLength);
    ctx.lineTo(5, -8);
    ctx.closePath();
    ctx.fill();

    // Fuselagem em Chevron / Traje Aerodinâmico
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(0, 14); // Bico frontal
    ctx.lineTo(11, -8); // Asa direita
    ctx.lineTo(4, -5);
    ctx.lineTo(0, -9); // Centro traseiro
    ctx.lineTo(-4, -5);
    ctx.lineTo(-11, -8); // Asa esquerda
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Visor aerodinâmico âmbar
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(0, 3, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * MUNDO V: SILÊNCIO — Tecelão Espectral do Vazio
   * Silhueta minimalista e translúcida com núcleo geométrico flutuante,
   * anel de fase orbital e aura de ecolocalização prateada.
   */
  private static renderSilentWeaver(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isMoving: boolean,
    animTime: number
  ): void {
    ctx.rotate(player.facingAngle);

    // Anel orbital de fase
    const ringAngle = animTime * 0.003;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 7, ringAngle, 0, Math.PI * 2);
    ctx.stroke();

    // Núcleo cristalino em losango / diamante
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-7, 0);
    ctx.lineTo(0, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Olho central de sintonia
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  public static renderGhostAvatar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    facingAngle: number,
    worldId: string,
    color: string,
    animTime: number,
    isMoving: boolean = true,
    isGrounded: boolean = true
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.52;

    const ghostPlayer: PlayerState = {
      x,
      y,
      vx: isMoving ? 1 : 0,
      vy: 0,
      speed: 4,
      width: 14,
      height: 14,
      facingAngle,
      identity: 100,
      maxIdentity: 100,
      score: 0,
      combo: 1,
      comboTimer: 0,
      debt: 0,
    };

    const dummyInput: InputState = {
      keys: {},
      mouseX: x + Math.cos(facingAngle) * 50,
      mouseY: y + Math.sin(facingAngle) * 50,
      mouseDown: false,
      mouseClicked: false,
      hasMovedMouse: false,
      spaceJustPressed: false,
    };

    this.renderAvatarForWorld(
      ctx,
      ghostPlayer,
      worldId,
      dummyInput,
      animTime,
      isGrounded,
      isMoving,
      isMoving ? 2 : 0
    );

    // Ethereal ghost wisp overlay
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}