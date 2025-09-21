import './style.css'

// Simple Tetris game implementation
class SimpleTetris {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private gameRunning = false
  private gameLoop: number | null = null
  private board: number[][]
  private currentPiece: any = null
  private score = 0
  private lines = 0
  private level = 1
  private dropTimer = 0
  private dropInterval = 1000 // 1 second initially

  // Tetris pieces (simplified)
  private pieces = [
    // I piece
    [[[1,1,1,1]]],
    // O piece
    [[[1,1],[1,1]]],
    // T piece
    [[[0,1,0],[1,1,1]], [[1,0],[1,1],[1,0]], [[1,1,1],[0,1,0]], [[0,1],[1,1],[0,1]]],
    // S piece
    [[[0,1,1],[1,1,0]], [[1,0],[1,1],[0,1]]],
    // Z piece
    [[[1,1,0],[0,1,1]], [[0,1],[1,1],[1,0]]],
    // J piece
    [[[1,0,0],[1,1,1]], [[1,1],[1,0],[1,0]], [[1,1,1],[0,0,1]], [[0,1],[0,1],[1,1]]],
    // L piece
    [[[0,0,1],[1,1,1]], [[1,0],[1,0],[1,1]], [[1,1,1],[1,0,0]], [[1,1],[0,1],[0,1]]]
  ]

  private colors = ['#000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500']

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.initBoard()
    this.spawnPiece()
    this.setupKeyboard()
  }

  private initBoard() {
    this.board = Array(20).fill(null).map(() => Array(10).fill(0))
  }

  private spawnPiece() {
    const pieceIndex = Math.floor(Math.random() * this.pieces.length)
    this.currentPiece = {
      type: pieceIndex + 1,
      shape: this.pieces[pieceIndex][0],
      x: 3,
      y: 0,
      rotation: 0
    }
  }

  private setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (!this.gameRunning) return

      switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.movePiece(-1, 0)
          break
        case 'ArrowRight':
        case 'KeyD':
          this.movePiece(1, 0)
          break
        case 'ArrowDown':
        case 'KeyS':
          this.movePiece(0, 1)
          break
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyZ':
          this.rotatePiece()
          break
        case 'Space':
          this.hardDrop()
          break
      }
    })
  }

  private movePiece(dx: number, dy: number) {
    if (!this.currentPiece) return

    this.currentPiece.x += dx
    this.currentPiece.y += dy

    if (this.checkCollision()) {
      this.currentPiece.x -= dx
      this.currentPiece.y -= dy

      if (dy > 0) {
        this.placePiece()
      }
    }
  }

  private rotatePiece() {
    if (!this.currentPiece) return

    const pieceRotations = this.pieces[this.currentPiece.type - 1]
    const nextRotation = (this.currentPiece.rotation + 1) % pieceRotations.length
    const oldShape = this.currentPiece.shape
    this.currentPiece.shape = pieceRotations[nextRotation]

    if (this.checkCollision()) {
      this.currentPiece.shape = oldShape
    } else {
      this.currentPiece.rotation = nextRotation
    }
  }

  private hardDrop() {
    if (!this.currentPiece) return

    while (!this.checkCollision()) {
      this.currentPiece.y++
    }
    this.currentPiece.y--
    this.placePiece()
  }

  private checkCollision(): boolean {
    if (!this.currentPiece) return false

    for (let y = 0; y < this.currentPiece.shape.length; y++) {
      for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
        if (this.currentPiece.shape[y][x]) {
          const newX = this.currentPiece.x + x
          const newY = this.currentPiece.y + y

          if (newX < 0 || newX >= 10 || newY >= 20) return true
          if (newY >= 0 && this.board[newY][newX]) return true
        }
      }
    }
    return false
  }

  private placePiece() {
    if (!this.currentPiece) return

    for (let y = 0; y < this.currentPiece.shape.length; y++) {
      for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
        if (this.currentPiece.shape[y][x]) {
          const boardY = this.currentPiece.y + y
          const boardX = this.currentPiece.x + x
          if (boardY >= 0) {
            this.board[boardY][boardX] = this.currentPiece.type
          }
        }
      }
    }

    this.clearLines()
    this.spawnPiece()

    if (this.checkCollision()) {
      this.gameOver()
    }
  }

  private clearLines() {
    let linesCleared = 0

    for (let y = this.board.length - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== 0)) {
        this.board.splice(y, 1)
        this.board.unshift(Array(10).fill(0))
        linesCleared++
        y++ // Check the same row again
      }
    }

    if (linesCleared > 0) {
      this.lines += linesCleared
      this.score += [0, 40, 100, 300, 1200][linesCleared] * this.level
      this.level = Math.floor(this.lines / 10) + 1
      this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 50)
    }
  }

  private gameOver() {
    this.gameRunning = false
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop)
      this.gameLoop = null
    }

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = '#ff0000'
    this.ctx.font = '24px system-ui'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2)
    this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30)
  }

  public start() {
    this.gameRunning = true
    this.dropTimer = 0
    this.update()
  }

  public pause() {
    this.gameRunning = !this.gameRunning
    if (this.gameRunning) {
      this.update()
    } else if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop)
      this.gameLoop = null
    }
  }

  public reset() {
    this.gameRunning = false
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop)
      this.gameLoop = null
    }
    this.score = 0
    this.lines = 0
    this.level = 1
    this.dropInterval = 1000
    this.initBoard()
    this.spawnPiece()
    this.draw()
  }

  private update() {
    if (!this.gameRunning) return

    this.dropTimer += 16 // Assume 60 FPS

    if (this.dropTimer >= this.dropInterval) {
      this.movePiece(0, 1)
      this.dropTimer = 0
    }

    this.draw()
    this.gameLoop = requestAnimationFrame(() => this.update())
  }

  private draw() {
    // Clear canvas
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const blockSize = 32

    // Draw board
    for (let y = 0; y < this.board.length; y++) {
      for (let x = 0; x < this.board[y].length; x++) {
        if (this.board[y][x]) {
          this.ctx.fillStyle = this.colors[this.board[y][x]]
          this.ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1)
        }
      }
    }

    // Draw current piece
    if (this.currentPiece) {
      this.ctx.fillStyle = this.colors[this.currentPiece.type]
      for (let y = 0; y < this.currentPiece.shape.length; y++) {
        for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
          if (this.currentPiece.shape[y][x]) {
            const drawX = (this.currentPiece.x + x) * blockSize
            const drawY = (this.currentPiece.y + y) * blockSize
            this.ctx.fillRect(drawX, drawY, blockSize - 1, blockSize - 1)
          }
        }
      }
    }

    // Draw UI
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '16px system-ui'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`Score: ${this.score}`, 10, this.canvas.height - 60)
    this.ctx.fillText(`Lines: ${this.lines}`, 10, this.canvas.height - 40)
    this.ctx.fillText(`Level: ${this.level}`, 10, this.canvas.height - 20)
  }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Create game container
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div id="tetris-container">
      <h1>Tetris Web</h1>
      <canvas id="game-canvas" width="320" height="640"></canvas>
      <div id="controls">
        <button id="start-btn">Start Game</button>
        <button id="pause-btn">Pause</button>
        <button id="reset-btn">Reset</button>
      </div>
      <div id="info">
        <p>Use arrow keys or WASD to move</p>
        <p>Z/Up arrow to rotate, Space to hard drop</p>
        <p>Game is now fully playable!</p>
      </div>
      <div id="status">
        <p>Backend Status: <span id="backend-status">Checking...</span></p>
        <p>Simple Tetris game ready to play</p>
      </div>
    </div>
  `

  // Initialize the Tetris game
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!
  const tetrisGame = new SimpleTetris(canvas)

  // Initial draw
  tetrisGame.reset()

  // Check backend connectivity
  checkBackendStatus()

  // Setup control buttons
  const startBtn = document.querySelector<HTMLButtonElement>('#start-btn')!
  const pauseBtn = document.querySelector<HTMLButtonElement>('#pause-btn')!
  const resetBtn = document.querySelector<HTMLButtonElement>('#reset-btn')!

  startBtn.addEventListener('click', () => {
    tetrisGame.start()
    startBtn.textContent = 'Resume'
  })

  pauseBtn.addEventListener('click', () => {
    tetrisGame.pause()
  })

  resetBtn.addEventListener('click', () => {
    tetrisGame.reset()
    startBtn.textContent = 'Start Game'
  })

  console.log('Tetris game initialized successfully!')
})

async function checkBackendStatus() {
  const statusElement = document.querySelector('#backend-status')!
  try {
    const response = await fetch('/docs')
    if (response.ok) {
      statusElement.textContent = 'Connected ✓'
      statusElement.style.color = '#4ade80'
    } else {
      statusElement.textContent = 'Backend not ready'
      statusElement.style.color = '#fbbf24'
    }
  } catch (error) {
    statusElement.textContent = 'Offline'
    statusElement.style.color = '#f87171'
  }
}
