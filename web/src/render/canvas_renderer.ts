/**
 * Placeholder canvas renderer. 真正的分層繪製可待核心模組完成後再補。
 */

import type { GameSnapshot } from '../core/game'

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Unable to obtain canvas 2D context')
    }
    this.ctx = ctx
  }

  render(snapshot: GameSnapshot): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = '#111'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = '14px system-ui'
    this.ctx.fillText(`Score: ${snapshot.score}`, 8, 20)
    this.ctx.fillText(`Lines: ${snapshot.lines}`, 8, 38)
    this.ctx.fillText(`Level: ${snapshot.level}`, 8, 56)
    this.ctx.fillText(`State: ${snapshot.state}`, 8, 74)
  }
}
