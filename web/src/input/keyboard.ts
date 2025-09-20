/**
 * Keyboard input handling with DAS/ARR, rebinding support, and input buffering
 */

import type { GameInput } from '../core/game.js';

export interface KeyBinding {
  left: string[];
  right: string[];
  softDrop: string[];
  hardDrop: string[];
  rotateLeft: string[];
  rotateRight: string[];
  rotate180: string[];
  hold: string[];
  pause: string[];
}

export interface KeyboardConfig {
  bindings: KeyBinding;
  dasMs: number;
  arrMs: number;
}

export const DEFAULT_KEY_BINDINGS: KeyBinding = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  softDrop: ['ArrowDown', 'KeyS'],
  hardDrop: ['ArrowUp', 'KeyW', 'Space'],
  rotateLeft: ['KeyZ', 'ControlLeft'],
  rotateRight: ['KeyX', 'ArrowUp'],
  rotate180: ['KeyA'],
  hold: ['KeyC', 'ShiftLeft'],
  pause: ['Escape', 'KeyP'],
};

export const ALTERNATIVE_KEY_BINDINGS: KeyBinding = {
  left: ['ArrowLeft', 'KeyJ'],
  right: ['ArrowRight', 'KeyL'],
  softDrop: ['ArrowDown', 'KeyK'],
  hardDrop: ['Space', 'KeyI'],
  rotateLeft: ['KeyZ', 'KeyA'],
  rotateRight: ['KeyX', 'KeyS'],
  rotate180: ['KeyQ'],
  hold: ['KeyC', 'KeyD'],
  pause: ['Escape'],
};

export type InputCallback = (action: GameInput) => void;

export class KeyboardHandler {
  private config: KeyboardConfig;
  private callbacks: InputCallback[] = [];
  private pressedKeys = new Set<string>();
  private lastActionTime = new Map<GameInput, number>();
  private repeatState = new Map<GameInput, { dasStarted: boolean; arrActive: boolean }>();

  constructor(config?: Partial<KeyboardConfig>) {
    this.config = {
      bindings: DEFAULT_KEY_BINDINGS,
      dasMs: 300,
      arrMs: 100,
      ...config,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Prevent context menu on certain keys
    document.addEventListener('contextmenu', (e) => {
      if (this.isGameKey(e.code)) {
        e.preventDefault();
      }
    });

    // Prevent default behavior for game keys
    document.addEventListener('keydown', (e) => {
      if (this.isGameKey(e.code)) {
        e.preventDefault();
      }
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const code = event.code;

    // Avoid key repeat from OS
    if (this.pressedKeys.has(code)) {
      return;
    }

    this.pressedKeys.add(code);
    const action = this.getActionForKey(code);

    if (action) {
      const now = Date.now();
      this.lastActionTime.set(action, now);

      // Trigger immediate action
      this.triggerAction(action);

      // Set up repeat state for movement keys
      if (action === 'left' || action === 'right' || action === 'softDrop') {
        this.repeatState.set(action, { dasStarted: false, arrActive: false });
        this.startRepeatTimer(action);
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.pressedKeys.delete(code);

    const action = this.getActionForKey(code);
    if (action) {
      this.repeatState.delete(action);
    }
  }

  private startRepeatTimer(action: GameInput): void {
    const checkRepeat = () => {
      const state = this.repeatState.get(action);
      if (!state) return; // Key was released

      const now = Date.now();
      const lastTime = this.lastActionTime.get(action) || now;
      const timeSincePress = now - lastTime;

      if (!state.dasStarted && timeSincePress >= this.config.dasMs) {
        state.dasStarted = true;
        state.arrActive = true;
        this.triggerAction(action);
        this.lastActionTime.set(action, now);
      } else if (state.arrActive && timeSincePress >= this.config.arrMs) {
        this.triggerAction(action);
        this.lastActionTime.set(action, now);
      }

      // Continue checking if key is still pressed
      if (this.repeatState.has(action)) {
        requestAnimationFrame(checkRepeat);
      }
    };

    requestAnimationFrame(checkRepeat);
  }

  private getActionForKey(keyCode: string): GameInput | null {
    for (const [action, keys] of Object.entries(this.config.bindings)) {
      if (keys.includes(keyCode)) {
        return action as GameInput;
      }
    }
    return null;
  }

  private isGameKey(keyCode: string): boolean {
    return Object.values(this.config.bindings).some(keys => keys.includes(keyCode));
  }

  private triggerAction(action: GameInput): void {
    this.callbacks.forEach(callback => callback(action));
  }

  addCallback(callback: InputCallback): void {
    this.callbacks.push(callback);
  }

  removeCallback(callback: InputCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  setBindings(bindings: KeyBinding): void {
    this.config.bindings = { ...bindings };
  }

  getBindings(): KeyBinding {
    return { ...this.config.bindings };
  }

  setDAS(dasMs: number): void {
    this.config.dasMs = Math.max(0, dasMs);
  }

  setARR(arrMs: number): void {
    this.config.arrMs = Math.max(0, arrMs);
  }

  getConfig(): KeyboardConfig {
    return {
      bindings: { ...this.config.bindings },
      dasMs: this.config.dasMs,
      arrMs: this.config.arrMs,
    };
  }

  exportBindings(): string {
    return JSON.stringify(this.config.bindings, null, 2);
  }

  importBindings(bindingsJson: string): boolean {
    try {
      const bindings = JSON.parse(bindingsJson);
      // Validate bindings structure
      const requiredActions = Object.keys(DEFAULT_KEY_BINDINGS);
      const hasAllActions = requiredActions.every(action =>
        action in bindings && Array.isArray(bindings[action])
      );

      if (hasAllActions) {
        this.setBindings(bindings);
        return true;
      }
    } catch (error) {
      console.error('Invalid key bindings format:', error);
    }
    return false;
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.callbacks.length = 0;
    this.pressedKeys.clear();
    this.lastActionTime.clear();
    this.repeatState.clear();
  }
}