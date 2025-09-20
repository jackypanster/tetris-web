/**
 * Main application orchestrator - coordinates game core and UI layers
 */

import { GameEngine } from '../core/game';
import { CanvasRenderer } from '../render/canvas_renderer';
import { HUD } from '../render/hud';
import { KeyboardInput } from '../input/keyboard';
import { ScoreClient } from '../net/score-client';
import { GameStore } from '../state/store';
import { persistence } from '../state/persist';

export class TetrisApp {
  private gameEngine: GameEngine;
  private renderer: CanvasRenderer;
  private hud: HUD;
  private input: KeyboardInput;
  private scoreClient: ScoreClient;
  private store: GameStore;
  private canvas: HTMLCanvasElement;
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;

  constructor(canvasElement: HTMLCanvasElement) {
    this.canvas = canvasElement;

    // Initialize core systems
    this.store = new GameStore();
    this.gameEngine = new GameEngine();
    this.renderer = new CanvasRenderer(canvasElement);
    this.hud = new HUD();
    this.input = new KeyboardInput();
    this.scoreClient = new ScoreClient();

    this.setupEventListeners();
    this.loadSettings();
  }

  private setupEventListeners(): void {
    // Game state changes
    this.gameEngine.onStateChange((state) => {
      this.store.updateGameState(state);

      if (state.status === 'game_over') {
        this.handleGameOver();
      }
    });

    // Input handling
    this.input.onInput((inputType, action) => {
      this.gameEngine.handleInput(inputType, action);
    });

    // Settings changes
    this.store.onSettingsChange((settings) => {
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
      nickname: this.store.getPlayerName() || 'Anonymous',
      points: gameState.score,
      lines: gameState.lines,
      levelReached: gameState.level,
      durationSeconds: Math.floor(gameState.gameTime / 1000),
      seed: gameState.seed || undefined,
    };

    try {
      await this.scoreClient.submitScore(score);
      console.log('Score submitted successfully');
    } catch (error) {
      console.warn('Failed to submit score, queuing for later:', error);
      await this.queueOfflineScore(score);
    }
  }

  private async queueOfflineScore(score: any): Promise<void> {
    try {
      const offlineScores = await persistence.get('offlineScores') || [];
      offlineScores.push({ ...score, queuedAt: new Date().toISOString() });
      await persistence.set('offlineScores', offlineScores);
    } catch (error) {
      console.error('Failed to queue offline score:', error);
    }
  }

  public async syncOfflineScores(): Promise<void> {
    try {
      const offlineScores = await persistence.get('offlineScores') || [];
      if (offlineScores.length === 0) return;

      const result = await this.scoreClient.submitScoresBulk(offlineScores);

      // Remove successfully submitted scores
      const remainingScores = offlineScores.filter((_, index) =>
        !result.accepted.some(accepted => accepted.id === offlineScores[index].id)
      );

      await persistence.set('offlineScores', remainingScores);
      console.log(`Synced ${result.accepted.length} offline scores`);
    } catch (error) {
      console.warn('Failed to sync offline scores:', error);
    }
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