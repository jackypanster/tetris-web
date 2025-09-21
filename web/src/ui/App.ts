/**
 * 前端 orchestration 佔位。之後導入完整模組化架構時可擴充。
 */

import type { GameSessionResult, GameSnapshot } from '../core/game'
import { TetrisGame } from '../core/game'
import { SimpleStore } from '../state/store'

export interface AppState {
  lastSnapshot: GameSnapshot | null
  lastResult: GameSessionResult | null
}

export class TetrisApp {
  private readonly game: TetrisGame
  private readonly state = new SimpleStore<AppState>({ lastSnapshot: null, lastResult: null })

  constructor(canvas: HTMLCanvasElement) {
    this.game = new TetrisGame(canvas, {
      onGameOver: result => this.state.update(prev => ({ ...prev, lastResult: result })),
      onUpdate: snapshot => this.state.update(prev => ({ ...prev, lastSnapshot: snapshot })),
    })
  }

  getGame(): TetrisGame {
    return this.game
  }

  getStateStore(): SimpleStore<AppState> {
    return this.state
  }
}
