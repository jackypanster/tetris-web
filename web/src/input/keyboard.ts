/**
 * Lightweight keyboard handler placeholder. 後續可依 docs/ARCH.md 完成 DAS/ARR 與輸入緩衝邏輯。
 */

import type { GameSnapshot } from '../core/game'

export type GameInput = 'left' | 'right' | 'softDrop' | 'hardDrop' | 'rotate' | 'pause'

export interface KeyBinding {
  left: string[]
  right: string[]
  softDrop: string[]
  hardDrop: string[]
  rotate: string[]
  pause: string[]
}

export interface KeyboardConfig {
  bindings: KeyBinding
  dasMs: number
  arrMs: number
}

export type InputCallback = (action: GameInput, snapshot?: GameSnapshot) => void

export const DEFAULT_KEY_BINDINGS: KeyBinding = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  softDrop: ['ArrowDown', 'KeyS'],
  hardDrop: ['Space'],
  rotate: ['ArrowUp', 'KeyW', 'KeyZ'],
  pause: ['Escape', 'KeyP'],
}

export class KeyboardHandler {
  private callbacks = new Set<InputCallback>()
  private config: KeyboardConfig

  constructor(config?: Partial<KeyboardConfig>) {
    this.config = {
      bindings: DEFAULT_KEY_BINDINGS,
      dasMs: 300,
      arrMs: 100,
      ...config,
    }
  }

  addCallback(callback: InputCallback): void {
    this.callbacks.add(callback)
  }

  removeCallback(callback: InputCallback): void {
    this.callbacks.delete(callback)
  }

  emit(action: GameInput, snapshot?: GameSnapshot): void {
    this.callbacks.forEach(cb => cb(action, snapshot))
  }

  setBindings(bindings: KeyBinding): void {
    this.config.bindings = { ...bindings }
  }

  getBindings(): KeyBinding {
    return { ...this.config.bindings }
  }

  updateConfig(partial: Partial<KeyboardConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
      bindings: partial.bindings ? { ...partial.bindings } : this.config.bindings,
    }
  }

  getConfig(): KeyboardConfig {
    return {
      bindings: { ...this.config.bindings },
      dasMs: this.config.dasMs,
      arrMs: this.config.arrMs,
    }
  }
}
