/**
 * Placeholder HUD renderer. 真正的 HUD 與 Canvas 疊加可依 docs/ARCH.md 後續補強。
 */

import type { GameSnapshot } from '../core/game'

export interface HudConfig {
  showNextQueue?: boolean
  showHold?: boolean
}

export class HudRenderer {
  private readonly container: HTMLElement

  constructor(container: HTMLElement, _config: HudConfig = {}) {
    this.container = container
  }

  render(snapshot: GameSnapshot): void {
    const { score, lines, level, state } = snapshot
    this.container.textContent = `Score: ${score} | Lines: ${lines} | Level: ${level} | State: ${state}`
  }
}
