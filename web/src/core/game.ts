/**
 * Minimal single-player Tetris game loop used by the current front-end shell.
 *
 * NOTE: 這個實作為暫時版，提供簡單的遊玩體驗與型別完善的介面，
 * 之後可依 docs/ARCH.md 的詳細狀態機與模組分層擴充。
 */

export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface GameSnapshot {
  board: Cell[][]
  currentPiece: ActivePiece | null
  score: number
  lines: number
  level: number
  state: 'idle' | 'running' | 'paused' | 'gameOver'
  nextQueue: Cell[]
  nextPiece: PieceMatrix | null
}

export interface GameSessionResult {
  score: number
  lines: number
  level: number
  durationMs: number
  endedAt: string
}

export interface GameCallbacks {
  onGameOver?: (result: GameSessionResult) => void
  onUpdate?: (snapshot: GameSnapshot) => void
}

export interface GameOptions {
  rows?: number
  cols?: number
  dropIntervalMs?: number
}

interface ActivePiece {
  type: Cell
  shape: PieceMatrix
  x: number
  y: number
  rotation: number
}

type PieceMatrix = number[][]
type PieceDefinition = PieceMatrix[]

export const PIECE_COLORS: ReadonlyArray<string> = ['#000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500']

const PIECES: PieceDefinition[] = [
  [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
  ], // I
  [[[1, 1], [1, 1]]], // O
  [[[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[1, 1, 1], [0, 1, 0]], [[0, 1], [1, 1], [0, 1]]], // T
  [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]], // S
  [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]], // Z
  [[[1, 0, 0], [1, 1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1, 1], [0, 0, 1]], [[0, 1], [0, 1], [1, 1]]], // J
  [[[0, 0, 1], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]]], // L
]

export class TetrisGame {
  private readonly rows: number
  private readonly cols: number
  private readonly callbacks: GameCallbacks
  private readonly dropIntervalMs: number

  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  private board: Cell[][]
  private currentPiece: ActivePiece | null = null
  private gameLoop: number | null = null
  private state: 'idle' | 'running' | 'paused' | 'gameOver' = 'idle'

  private score = 0
  private lines = 0
  private level = 1
  private dropTimer = 0
  private sessionStart: number | null = null
  private nextQueue: Cell[] = []

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks = {}, options: GameOptions = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d') ?? this.throwCanvasError()
    this.callbacks = callbacks
    this.rows = options.rows ?? 20
    this.cols = options.cols ?? 10
    this.dropIntervalMs = options.dropIntervalMs ?? 1300
    this.board = this.createBoard()
    this.refillQueue()
    this.spawnPiece()
  }

  start(): void {
    if (this.state === 'running') return
    if (this.sessionStart === null) {
      this.sessionStart = performance.now()
    }
    this.state = 'running'
    this.dropTimer = 0
    this.tick()
  }

  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused'
      if (this.gameLoop !== null) {
        cancelAnimationFrame(this.gameLoop)
        this.gameLoop = null
      }
    } else if (this.state === 'paused') {
      this.state = 'running'
      this.tick()
    }
  }

  reset(): void {
    if (this.gameLoop !== null) {
      cancelAnimationFrame(this.gameLoop)
      this.gameLoop = null
    }
    this.state = 'idle'
    this.sessionStart = null
    this.score = 0
    this.lines = 0
    this.level = 1
    this.dropTimer = 0
    this.board = this.createBoard()
    this.nextQueue = []
    this.refillQueue()
    this.spawnPiece()
    this.draw()
    this.emitUpdate()
  }

  destroy(): void {
    if (this.gameLoop !== null) {
      cancelAnimationFrame(this.gameLoop)
    }
    this.callbacks.onUpdate = undefined
    this.callbacks.onGameOver = undefined
  }

  private tick(): void {
    if (this.state !== 'running') {
      return
    }

    this.dropTimer += 16 // assume 60fps frame budget
    if (this.dropTimer >= Math.max(50, this.dropIntervalMs - (this.level - 1) * 50)) {
      this.softDrop()
      this.dropTimer = 0
    }

    this.draw()
    this.emitUpdate()
    this.gameLoop = requestAnimationFrame(() => this.tick())
  }

  moveLeft(): void {
    if (this.state === 'running') {
      this.movePiece(-1, 0)
    }
  }

  moveRight(): void {
    if (this.state === 'running') {
      this.movePiece(1, 0)
    }
  }

  softDrop(): void {
    if (this.state === 'running') {
      this.movePiece(0, 1)
    }
  }

  hardDrop(): void {
    if (this.state !== 'running') return
    while (!this.checkCollision(0, 1)) {
      this.currentPiece!.y += 1
    }
    this.lockPiece()
  }

  rotate(): void {
    if (this.state !== 'running' || !this.currentPiece) return
    const rotations = PIECES[this.currentPiece.type - 1]
    const nextRotation = (this.currentPiece.rotation + 1) % rotations.length
    const nextShape = rotations[nextRotation]
    const previousShape = this.currentPiece.shape
    this.currentPiece.shape = nextShape
    if (this.checkCollision(0, 0)) {
      this.currentPiece.shape = previousShape
    } else {
      this.currentPiece.rotation = nextRotation
    }
  }

  getSnapshot(): GameSnapshot {
    const nextType = this.nextQueue[0]
    const nextPiece = nextType ? this.cloneMatrix(PIECES[nextType - 1][0]) : null
    return {
      board: this.board.map(row => [...row]) as Cell[][],
      currentPiece: this.currentPiece ? { ...this.currentPiece, shape: this.currentPiece.shape.map(row => [...row]) } : null,
      score: this.score,
      lines: this.lines,
      level: this.level,
      state: this.state,
      nextQueue: [...this.nextQueue],
      nextPiece,
    }
  }

  private createBoard(): Cell[][] {
    return Array.from({ length: this.rows }, () => this.createEmptyRow())
  }

  private createEmptyRow(): Cell[] {
    const row = new Array<Cell>(this.cols)
    row.fill(0 as Cell)
    return row
  }

  private spawnPiece(): void {
    if (this.nextQueue.length === 0) {
      this.refillQueue()
    }

    const type = this.nextQueue.shift() ?? 1
    const rotations = PIECES[type - 1]
    this.currentPiece = {
      type,
      shape: this.cloneMatrix(rotations[0]),
      x: Math.floor(this.cols / 2) - 1,
      y: 0,
      rotation: 0,
    }
    this.refillQueue()
  }

  private movePiece(dx: number, dy: number): void {
    if (!this.currentPiece) return
    this.currentPiece.x += dx
    this.currentPiece.y += dy
    if (this.checkCollision(0, 0)) {
      this.currentPiece.x -= dx
      this.currentPiece.y -= dy
      if (dy > 0) {
        this.lockPiece()
      }
    }
  }

  private checkCollision(offsetX: number, offsetY: number): boolean {
    const piece = this.currentPiece
    if (!piece) return false

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue
        const boardX = piece.x + x + offsetX
        const boardY = piece.y + y + offsetY

        if (boardX < 0 || boardX >= this.cols || boardY >= this.rows) {
          return true
        }

        if (boardY >= 0 && this.board[boardY][boardX] !== 0) {
          return true
        }
      }
    }

    return false
  }

  private lockPiece(): void {
    const piece = this.currentPiece
    if (!piece) return

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue
        const boardY = piece.y + y
        const boardX = piece.x + x
        if (boardY >= 0) {
          this.board[boardY][boardX] = piece.type
        }
      }
    }

    this.clearLines()
    this.spawnPiece()

    if (this.checkCollision(0, 0)) {
      this.endGame()
    }
  }

  private clearLines(): void {
    let cleared = 0
    for (let y = this.board.length - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== 0)) {
        this.board.splice(y, 1)
        this.board.unshift(this.createEmptyRow())
        cleared += 1
        y += 1
      }
    }

    if (cleared > 0) {
      this.lines += cleared
      const lineScores = [0, 40, 100, 300, 1200]
      this.score += lineScores[cleared] * this.level
      this.level = Math.floor(this.lines / 10) + 1
    }
  }

  private draw(): void {
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    for (let y = 0; y < this.board.length; y++) {
      for (let x = 0; x < this.board[y].length; x++) {
        const cell = this.board[y][x]
        if (cell !== 0) {
          this.drawBlock(x, y, PIECE_COLORS[cell])
        }
      }
    }

    if (this.currentPiece) {
      for (let y = 0; y < this.currentPiece.shape.length; y++) {
        for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
          if (this.currentPiece.shape[y][x]) {
            const drawX = this.currentPiece.x + x
            const drawY = this.currentPiece.y + y
            this.drawBlock(drawX, drawY, PIECE_COLORS[this.currentPiece.type])
          }
        }
      }
    }

  }

  private drawBlock(x: number, y: number, color: string): void {
    const blockSize = Math.floor(this.canvas.width / this.cols)
    this.ctx.fillStyle = color
    this.ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1)
  }

  private refillQueue(): void {
    while (this.nextQueue.length < 3) {
      this.nextQueue.push(this.randomPieceType())
    }
  }

  private randomPieceType(): Cell {
    return (Math.floor(Math.random() * PIECES.length) + 1) as Cell
  }

  private cloneMatrix(matrix: PieceMatrix): PieceMatrix {
    return matrix.map(row => [...row])
  }

  private endGame(): void {
    this.state = 'gameOver'
    if (this.gameLoop !== null) {
      cancelAnimationFrame(this.gameLoop)
      this.gameLoop = null
    }

    const duration = this.sessionStart !== null ? performance.now() - this.sessionStart : 0
    this.sessionStart = null

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = '#ff0000'
    this.ctx.font = '24px system-ui'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2)
    this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30)

    this.callbacks.onGameOver?.({
      score: this.score,
      lines: this.lines,
      level: this.level,
      durationMs: Math.round(duration),
      endedAt: new Date().toISOString(),
    })
  }

  private emitUpdate(): void {
    this.callbacks.onUpdate?.(this.getSnapshot())
  }

  private throwCanvasError(): never {
    throw new Error('Unable to acquire 2D rendering context for Tetris canvas')
  }
}
