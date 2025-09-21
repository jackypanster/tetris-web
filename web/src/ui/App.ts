/**
 * Main application orchestrator - coordinates game core and UI layers
 */

import { TetrisGame } from '../core/game';
import { CanvasRenderer } from '../render/canvas_renderer';
import { HudRenderer } from '../render/hud';
import { KeyboardHandler } from '../input/keyboard';
import { ScoreClient } from '../net/score-client';
import { OfflineScoreQueue } from '../net/offline-queue';
import { AppStore } from '../state/store';
import { persistence } from '../state/persist';
import { map, distinctUntilChanged } from 'rxjs/operators';

export class TetrisApp {
  private gameEngine: TetrisGame;
  private renderer: CanvasRenderer;
  private hud: HudRenderer;
  private input: KeyboardHandler;
  private scoreClient: ScoreClient;
  private offlineQueue: OfflineScoreQueue;
  private store: AppStore;
  private canvas: HTMLCanvasElement;
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;

  constructor(canvasElement: HTMLCanvasElement) {
    this.canvas = canvasElement;

    // Initialize core systems
    this.store = new AppStore();
    this.gameEngine = new TetrisGame();
    this.renderer = new CanvasRenderer(canvasElement);
    this.hud = new HudRenderer();
    this.input = new KeyboardHandler();
    this.scoreClient = new ScoreClient();
    this.offlineQueue = new OfflineScoreQueue(this.scoreClient);

    this.setupEventListeners();
    this.loadSettings();
  }

  private setupEventListeners(): void {
    // Game state changes
    this.gameEngine.onStateChange((state) => {
      this.store.updateGameSnapshot(state);

      if (state.status === 'game_over') {
        this.handleGameOver();
      }
    });

    // Input handling
    this.input.onInput((inputType, action) => {
      this.gameEngine.handleInput(inputType, action);
    });

    // Settings changes - only react to actual settings changes, not game state updates
    this.store.getState$().pipe(
      map(state => state.settings),
      distinctUntilChanged() // Reference equality check - O(1) vs O(n) JSON serialization
    ).subscribe((settings) => {
      this.input.updateSettings(settings);
      this.saveSettings();
    });

    // Visibility change handling for pause/resume
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await persistence.get('gameSettings');
      if (settings) {
        this.store.updateSettings(settings);
      }

      const keyBindings = await persistence.get('keyBindings');
      if (keyBindings) {
        this.input.setKeyBindings(keyBindings);
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await persistence.set('gameSettings', this.store.getSettings());
      await persistence.set('keyBindings', this.input.getKeyBindings());
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  private async handleGameOver(): Promise<void> {
    const gameState = this.gameEngine.getState();
    const score = {
      nickname: this.store.getSettings().playerName || 'Anonymous',
      points: gameState.score,
      lines: gameState.lines,
      levelReached: gameState.level,
      durationSeconds: Math.floor(gameState.gameTime / 1000),
      seed: gameState.seed || undefined,
    };

    try {
      const scoreId = await this.offlineQueue.enqueueScore(score);
      console.log('Score queued with ID:', scoreId);
    } catch (error) {
      console.error('Failed to queue score:', error);
    }
  }

  public async syncOfflineScores(): Promise<void> {
    try {
      const result = await this.offlineQueue.syncScores();
      console.log(`Sync completed: ${result.processed} processed, ${result.failed} failed`);
      return result;
    } catch (error) {
      console.warn('Failed to sync offline scores:', error);
      throw error;
    }
  }

  public getOfflineQueueStats() {
    return this.offlineQueue.getStats();
  }

  public clearFailedScores(): number {
    return this.offlineQueue.clearFailedScores();
  }

  public get isOnline(): boolean {
    return this.offlineQueue.isConnected;
  }

  public get isSyncing(): boolean {
    return this.offlineQueue.isSyncing;
  }

  public start(): void {
    this.gameEngine.startGame();
    this.startGameLoop();
  }

  public pause(): void {
    this.gameEngine.pauseGame();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume(): void {
    this.gameEngine.resumeGame();
    if (!this.animationFrameId) {
      this.startGameLoop();
    }
  }

  public reset(): void {
    this.gameEngine.resetGame();
  }

  private startGameLoop(): void {
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      // Update game logic
      this.gameEngine.update(deltaTime);

      // Render frame
      const gameState = this.gameEngine.getState();
      this.renderer.render(gameState);
      this.hud.render(gameState, this.store.getSettings());

      // Continue loop
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };

    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.input.destroy();
    this.saveSettings();
  }
}