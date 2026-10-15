export interface InputState {
  keys: Record<string, boolean>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  mouseClicked: boolean;
  spaceJustPressed: boolean;
  hasMovedMouse?: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facingAngle: number;
  identity: number; // 0 to 100
  maxIdentity: number;
  score: number;
  combo: number;
  comboTimer: number;
  debt: number;
  speed: number;
}

export interface WorldUpdateResult {
  playerDamage: number;
  damageReason?: string;
  scoreGained: number;
  comboIncrease: number;
  actionOccurred?: 'attack' | 'kill' | 'dodge' | 'jump' | 'risk_take' | 'parry' | 'repeat_combo' | 'hesitate';
  cycleCompleted?: boolean;
}

export abstract class World {
  public abstract id: string;
  public abstract name: string;
  public abstract archetype: string;
  public abstract dominantColor: string;
  public abstract secondaryColor: string;

  public abstract init(player: PlayerState, width: number, height: number): void;
  public abstract update(
    dtMs: number,
    input: InputState,
    player: PlayerState,
    activeScars: string[],
    width: number,
    height: number
  ): WorldUpdateResult;
  public abstract render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    player: PlayerState,
    morphProgress: number,
    isTransitioning: boolean,
    activeScars: string[]
  ): void;
}
