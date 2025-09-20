/**
 * Main game state machine: Spawn → Active → Lock → Clear → GameOver
 */

import { TetrisBoard, type BoardConfig } from './board.js';
import { createPiece, getPieceBlocks, rotatePiece, getWallKickTests, type Piece, type PieceType } from './piece.js';
import { Bag7Randomizer } from './rng.js';
import { TetrisScoring, type ScoreState, type ClearEvent } from './scoring.js';

export type GameState = 'menu' | 'spawning' | 'active' | 'lockDelay' | 'clearing' | 'gameOver' | 'paused';

export interface GameConfig {
  board: BoardConfig;
  lockDelayMs: number;
  clearDelayMs: number;
  dasMs: number;
  arrMs: number;
  softDropMultiplier: number;
  enable180Rotation: boolean;
}

export interface GameSnapshot {
  state: GameState;
  board: ReturnType<TetrisBoard['getGrid']>;
  currentPiece: Piece | null;
  holdPiece: PieceType | null;
  nextPieces: PieceType[];
  score: ScoreState;
  timeMs: number;
  canHold: boolean;
  ghostPiece: Piece | null;
  config: GameConfig;
}

export type GameInput =
  | 'left' | 'right' | 'softDrop' | 'hardDrop'
  | 'rotateLeft' | 'rotateRight' | 'rotate180'
  | 'hold' | 'pause';

export interface TimeProvider {
  now(): number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  board: { width: 10, height: 20, hiddenRows: 2 },
  lockDelayMs: 500,
  clearDelayMs: 150,
  dasMs: 300,
  arrMs: 100,
  softDropMultiplier: 20,
  enable180Rotation: false,
};

export class TetrisGame {
  private state: GameState = 'menu';
  private board: TetrisBoard;
  private randomizer: Bag7Randomizer;
  private scoring: TetrisScoring;
  private config: GameConfig;
  private timeProvider: TimeProvider;

  // Game state
  private currentPiece: Piece | null = null;
  private holdPiece: PieceType | null = null;
  private canHold = true;
  private lockTimer = 0;
  private clearTimer = 0;
  private gameStartTime = 0;
  private lastUpdateTime = 0;

  // Input state
  private inputBuffer: GameInput[] = [];
  private dasTimer = 0;
  private arrTimer = 0;
  private lastLeftRight: 'left' | 'right' | null = null;

  constructor(config: GameConfig = DEFAULT_GAME_CONFIG, timeProvider?: TimeProvider, seed?: string) {
    this.config = { ...config };
    this.board = new TetrisBoard(config.board);
    this.randomizer = new Bag7Randomizer(seed);
    this.scoring = new TetrisScoring();
    this.timeProvider = timeProvider || { now: () => Date.now() };
  }

  start(): void {
    this.state = 'spawning';
    this.board.reset();
    this.scoring.resetGame();
    this.gameStartTime = this.timeProvider.now();
    this.lastUpdateTime = this.gameStartTime;
    this.spawnNewPiece();
  }

  update(): void {
    const currentTime = this.timeProvider.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    if (this.state === 'paused' || this.state === 'menu' || this.state === 'gameOver') {
      return;
    }

    this.processInputBuffer();
    this.updateTimers(deltaTime);

    switch (this.state) {
      case 'spawning':
        this.state = 'active';
        break;

      case 'active':
        this.updateActivePiece(deltaTime);
        break;

      case 'lockDelay':
        this.updateLockDelay(deltaTime);
        break;

      case 'clearing':
        this.updateClearing(deltaTime);
        break;
    }
  }

  input(action: GameInput): void {
    if (this.inputBuffer.length < 3) {
      this.inputBuffer.push(action);
    }
  }

  private processInputBuffer(): void {
    while (this.inputBuffer.length > 0) {
      const action = this.inputBuffer.shift()!;
      this.handleInput(action);
    }
  }

  private handleInput(action: GameInput): void {
    if (action === 'pause') {
      this.state = this.state === 'paused' ? 'active' : 'paused';
      return;
    }

    if (this.state !== 'active' && this.state !== 'lockDelay') {
      return;
    }

    if (!this.currentPiece) return;

    switch (action) {
      case 'left':
        this.movePiece(-1, 0);
        this.resetDAS('left');
        break;
      case 'right':
        this.movePiece(1, 0);
        this.resetDAS('right');
        break;
      case 'softDrop':
        this.movePiece(0, 1);
        break;
      case 'hardDrop':
        this.hardDrop();
        break;
      case 'rotateLeft':
        this.rotatePiece(false);
        break;
      case 'rotateRight':
        this.rotatePiece(true);
        break;
      case 'rotate180':
        if (this.config.enable180Rotation) {
          this.rotate180();
        }
        break;
      case 'hold':
        this.holdCurrentPiece();
        break;
    }
  }

  private updateTimers(deltaTime: number): void {
    // Update DAS/ARR
    if (this.lastLeftRight) {
      this.dasTimer += deltaTime;
      if (this.dasTimer >= this.config.dasMs) {
        this.arrTimer += deltaTime;
        if (this.arrTimer >= this.config.arrMs) {
          const dx = this.lastLeftRight === 'left' ? -1 : 1;
          this.movePiece(dx, 0);
          this.arrTimer = 0;
        }
      }
    }
  }

  private updateActivePiece(deltaTime: number): void {
    if (!this.currentPiece) return;

    // Auto-drop logic based on level
    const dropDelay = this.scoring.getDropSpeed() * (1000 / 60); // Convert frames to ms
    if (this.timeProvider.now() % dropDelay < deltaTime) {
      if (!this.movePiece(0, 1)) {
        this.state = 'lockDelay';
        this.lockTimer = 0;
      }
    }
  }

  private updateLockDelay(deltaTime: number): void {
    this.lockTimer += deltaTime;
    if (this.lockTimer >= this.config.lockDelayMs) {
      this.lockPiece();
    }
  }

  private updateClearing(deltaTime: number): void {
    this.clearTimer += deltaTime;
    if (this.clearTimer >= this.config.clearDelayMs) {
      this.finishClearing();
    }
  }

  private spawnNewPiece(): void {
    const pieceType = this.randomizer.next();
    this.currentPiece = createPiece(pieceType, 4, 1);
    this.canHold = true;

    // Check for game over
    if (!this.isValidPiecePosition(this.currentPiece)) {
      this.state = 'gameOver';
      return;
    }

    this.state = 'active';
  }

  private movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;

    const newPiece = {
      ...this.currentPiece,
      x: this.currentPiece.x + dx,
      y: this.currentPiece.y + dy,
    };

    if (this.isValidPiecePosition(newPiece)) {
      this.currentPiece = newPiece;
      if (dy > 0 && this.state === 'lockDelay') {
        this.lockTimer = 0; // Reset lock delay on successful move down
      }
      return true;
    }

    return false;
  }

  private rotatePiece(clockwise: boolean): boolean {
    if (!this.currentPiece) return false;

    const rotatedPiece = rotatePiece(this.currentPiece, clockwise);

    // Try basic rotation first
    if (this.isValidPiecePosition(rotatedPiece)) {
      this.currentPiece = rotatedPiece;
      if (this.state === 'lockDelay') {
        this.lockTimer = 0;
      }
      return true;
    }

    // Try wall kicks
    const wallKicks = getWallKickTests(this.currentPiece, rotatedPiece.rotation);
    for (const kick of wallKicks) {
      const kickedPiece = {
        ...rotatedPiece,
        x: rotatedPiece.x + kick.x,
        y: rotatedPiece.y + kick.y,
      };

      if (this.isValidPiecePosition(kickedPiece)) {
        this.currentPiece = kickedPiece;
        if (this.state === 'lockDelay') {
          this.lockTimer = 0;
        }
        return true;
      }
    }

    return false;
  }

  private rotate180(): boolean {
    if (!this.currentPiece) return false;

    const rotated180 = {
      ...this.currentPiece,
      rotation: ((this.currentPiece.rotation + 2) % 4) as any,
    };

    if (this.isValidPiecePosition(rotated180)) {
      this.currentPiece = rotated180;
      if (this.state === 'lockDelay') {
        this.lockTimer = 0;
      }
      return true;
    }

    return false;
  }

  private hardDrop(): void {
    if (!this.currentPiece) return;

    while (this.movePiece(0, 1)) {
      // Keep dropping until we can't
    }

    this.lockPiece();
  }

  private holdCurrentPiece(): void {
    if (!this.currentPiece || !this.canHold) return;

    const heldType = this.currentPiece.type;

    if (this.holdPiece) {
      this.currentPiece = createPiece(this.holdPiece, 4, 1);
    } else {
      this.spawnNewPiece();
    }

    this.holdPiece = heldType;
    this.canHold = false;
  }

  private lockPiece(): void {
    if (!this.currentPiece) return;

    // Place piece on board
    const blocks = getPieceBlocks(this.currentPiece);
    for (const block of blocks) {
      this.board.setCellState(block.x, block.y, this.currentPiece.type.charCodeAt(0) - 64);
    }

    // Check for line clears
    const clearedLines = this.board.checkLineClear();

    if (clearedLines.length > 0) {
      this.state = 'clearing';
      this.clearTimer = 0;

      // Calculate score
      const clearEvent: ClearEvent = {
        linesCleared: clearedLines.length,
        isPerfectClear: this.isPerfectClear(),
        isTSpin: false, // T-spin detection would go here
        isDifficult: clearedLines.length === 4, // Simplified
      };

      const scoreResult = this.scoring.calculateScore(clearEvent);
      this.scoring.setState(scoreResult.newState);

      this.board.clearLines(clearedLines);
    } else {
      this.spawnNewPiece();
    }
  }

  private finishClearing(): void {
    this.spawnNewPiece();
  }

  private isValidPiecePosition(piece: Piece): boolean {
    const blocks = getPieceBlocks(piece);
    return blocks.every(block =>
      this.board.isValidPosition(block.x, block.y) &&
      this.board.isCellEmpty(block.x, block.y)
    );
  }

  private isPerfectClear(): boolean {
    const grid = this.board.getVisibleGrid();
    return grid.every(row => row.every(cell => cell === 0));
  }

  private resetDAS(direction: 'left' | 'right'): void {
    this.lastLeftRight = direction;
    this.dasTimer = 0;
    this.arrTimer = 0;
  }

  private calculateGhostPiece(): Piece | null {
    if (!this.currentPiece) return null;

    let ghostPiece = { ...this.currentPiece };
    while (this.isValidPiecePosition({ ...ghostPiece, y: ghostPiece.y + 1 })) {
      ghostPiece.y++;
    }

    return ghostPiece;
  }

  getSnapshot(): GameSnapshot {
    return {
      state: this.state,
      board: this.board.getGrid(),
      currentPiece: this.currentPiece ? { ...this.currentPiece } : null,
      holdPiece: this.holdPiece,
      nextPieces: this.randomizer.peek(5),
      score: this.scoring.getState(),
      timeMs: this.timeProvider.now() - this.gameStartTime,
      canHold: this.canHold,
      ghostPiece: this.calculateGhostPiece(),
      config: { ...this.config },
    };
  }

  getConfig(): GameConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<GameConfig>): void {
    this.config = { ...this.config, ...config };
  }
}