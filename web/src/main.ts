import './style.css'
import { TetrisGame, type GameSessionResult, type GameSnapshot, PIECE_COLORS } from './core/game'
import { getScoreClient } from './net/client-factory'
import { OfflineScoreQueue } from './net/offline-queue'
import type { ScoreInput } from './net/score-client'

document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) {
    throw new Error('App container not found')
  }

  app.innerHTML = `
    <div id="tetris-container">
      <aside id="sidebar">
        <div id="preview-panel">
          <h2>Next Piece</h2>
          <canvas id="next-canvas" width="160" height="160"></canvas>
        </div>
        <div id="score-panel">
          <h2>Stats</h2>
          <p>Score: <span id="score-value">0</span></p>
          <p>Lines: <span id="lines-value">0</span></p>
          <p>Level: <span id="level-value">1</span></p>
        </div>
        <div id="info-text">
          <p>Use arrow keys or WASD to move</p>
          <p>Z / Up Arrow to rotate, Space to hard drop</p>
          <p>Start button begins a new run; Pause toggles pause/resume</p>
        </div>
        <div id="player-profile">
          <label for="nickname-input">Nickname</label>
          <input id="nickname-input" type="text" maxlength="16" placeholder="Anonymous" autocomplete="off" />
        </div>
      </aside>
      <main id="playfield">
        <canvas id="game-canvas" width="320" height="640"></canvas>
        <div id="controls">
          <button id="start-btn">Start Game</button>
          <button id="pause-btn">Pause</button>
          <button id="reset-btn">Reset</button>
        </div>
      </main>
      <section id="leaderboard">
        <div class="leaderboard-header">
          <h2>Leaderboard</h2>
          <button id="refresh-leaderboard" type="button">Refresh</button>
        </div>
        <ol id="leaderboard-list"></ol>
        <p id="leaderboard-status">Loading...</p>
        <div id="status">
          <p>Backend Status: <span id="backend-status">Checking...</span></p>
          <p>Simple Tetris game ready to play</p>
          <p>Offline Queue: <span id="queue-status">0</span></p>
        </div>
      </section>
    </div>
  `

  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
  const startBtn = document.querySelector<HTMLButtonElement>('#start-btn')
  const pauseBtn = document.querySelector<HTMLButtonElement>('#pause-btn')
  const resetBtn = document.querySelector<HTMLButtonElement>('#reset-btn')
  const backendStatusEl = document.querySelector<HTMLSpanElement>('#backend-status')
  const queueStatusEl = document.querySelector<HTMLSpanElement>('#queue-status')
  const leaderboardListEl = document.querySelector<HTMLOListElement>('#leaderboard-list')
  const leaderboardStatusEl = document.querySelector<HTMLParagraphElement>('#leaderboard-status')
  const refreshBtn = document.querySelector<HTMLButtonElement>('#refresh-leaderboard')
  const nicknameInput = document.querySelector<HTMLInputElement>('#nickname-input')
  const nextCanvas = document.querySelector<HTMLCanvasElement>('#next-canvas')
  const scoreValueEl = document.querySelector<HTMLSpanElement>('#score-value')
  const linesValueEl = document.querySelector<HTMLSpanElement>('#lines-value')
  const levelValueEl = document.querySelector<HTMLSpanElement>('#level-value')

  if (!nextCanvas) {
    throw new Error('Next-piece canvas not found')
  }

  const nextCtx = nextCanvas.getContext('2d')
  if (!nextCtx) {
    throw new Error('Unable to obtain next-piece canvas context')
  }

  if (!canvas || !startBtn || !pauseBtn || !resetBtn || !backendStatusEl || !queueStatusEl || !leaderboardListEl || !leaderboardStatusEl || !refreshBtn || !nicknameInput || !scoreValueEl || !linesValueEl || !levelValueEl) {
    throw new Error('Missing required DOM elements for game UI')
  }

  const scoreClient = getScoreClient()
  const offlineQueue = new OfflineScoreQueue(scoreClient)
  const nicknameStorageKey = 'tetris-nickname'

  try {
    const savedNickname = localStorage.getItem(nicknameStorageKey)
    if (savedNickname) {
      nicknameInput.value = savedNickname
    }
  } catch (error) {
    console.warn('Failed to read nickname from storage:', error)
  }

  const persistNickname = (value: string) => {
    try {
      localStorage.setItem(nicknameStorageKey, value)
    } catch (error) {
      console.warn('Failed to persist nickname:', error)
    }
  }

  const getNickname = () => {
    const value = nicknameInput.value.trim()
    return value.length > 0 ? value : 'Anonymous'
  }

  nicknameInput.addEventListener('input', event => {
    const target = event.target as HTMLInputElement
    persistNickname(target.value)
  })

  const updateQueueStatus = () => {
    const stats = offlineQueue.getStats()
    queueStatusEl.textContent = `待送 ${stats.pending} / 失敗 ${stats.failed}`
  }

  const formatScoreLine = (nickname: string, points: number, lines: number) => {
    const displayScore = points.toLocaleString()
    return `${nickname} — ${displayScore} pts / ${lines} lines`
  }

  const loadLeaderboard = async () => {
    refreshBtn.disabled = true
    leaderboardStatusEl.textContent = '載入排行榜中…'
    try {
      const scoreWindow = await scoreClient.getScores({ limit: 10 })
      leaderboardListEl.innerHTML = ''

      if (scoreWindow.items.length === 0) {
        leaderboardStatusEl.textContent = '暫無排行榜資料'
      } else {
        scoreWindow.items.forEach(item => {
          const entry = document.createElement('li')
          entry.textContent = formatScoreLine(item.nickname, item.points, item.lines)
          leaderboardListEl.appendChild(entry)
        })
        const generatedDate = new Date(scoreWindow.generatedAt)
        leaderboardStatusEl.textContent = `更新時間：${generatedDate.toLocaleString()}`
      }
    } catch (error) {
      console.error('Failed to load leaderboard', error)
      leaderboardStatusEl.textContent = '無法載入排行榜，請稍後重試。'
    } finally {
      refreshBtn.disabled = false
    }
  }

  const checkBackendStatus = async () => {
    const baseUrl = scoreClient.getConfig().baseUrl
    try {
      const response = await fetch(new URL('/healthz', baseUrl), {
        headers: {
          'User-Agent': scoreClient.getConfig().userAgent,
        },
      })

      if (response.ok) {
        backendStatusEl.textContent = 'Connected ✓'
        backendStatusEl.style.color = '#4ade80'
      } else {
        backendStatusEl.textContent = `Backend not ready (${response.status})`
        backendStatusEl.style.color = '#fbbf24'
      }
    } catch (error) {
      backendStatusEl.textContent = 'Offline'
      backendStatusEl.style.color = '#f87171'
      console.warn('Backend health check failed:', error)
    }
  }

  const handleGameOver = async (result: GameSessionResult) => {
    const payload: ScoreInput = {
      nickname: getNickname(),
      points: result.score,
      lines: result.lines,
      levelReached: result.level,
      durationSeconds: Math.max(0, Math.round(result.durationMs / 1000)),
    }

    const beforeQueue = offlineQueue.queueLength

    try {
      await offlineQueue.enqueueScore(payload)
      const queued = offlineQueue.queueLength > beforeQueue
      updateQueueStatus()

      if (queued) {
        leaderboardStatusEl.textContent = '離線狀態：分數已加入待送佇列。'
      } else {
        leaderboardStatusEl.textContent = '分數已提交，更新排行榜中…'
        await loadLeaderboard()
      }
    } catch (error) {
      console.error('Score submission failed', error)
      leaderboardStatusEl.textContent = '分數提交失敗，請稍後再試。'
    } finally {
      updateQueueStatus()
    }
  }

  const renderNextPreview = (snapshot: GameSnapshot) => {
    scoreValueEl.textContent = snapshot.score.toLocaleString()
    linesValueEl.textContent = snapshot.lines.toString()
    levelValueEl.textContent = snapshot.level.toString()

    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height)

    if (!snapshot.nextPiece || snapshot.nextQueue.length === 0) {
      nextCtx.fillStyle = '#9ca3af'
      nextCtx.font = '14px system-ui'
      nextCtx.textAlign = 'center'
      nextCtx.fillText('No preview', nextCanvas.width / 2, nextCanvas.height / 2)
      return
    }

    const piece = snapshot.nextPiece
    const type = snapshot.nextQueue[0]
    const color = PIECE_COLORS[type] ?? '#f8fafc'

    const pieceWidth = piece[0]?.length ?? 0
    const pieceHeight = piece.length
    if (pieceWidth === 0 || pieceHeight === 0) {
      return
    }

    const blockSize = Math.floor(
      Math.min(nextCanvas.width / (pieceWidth + 1), nextCanvas.height / (pieceHeight + 1))
    )
    const offsetX = (nextCanvas.width - pieceWidth * blockSize) / 2
    const offsetY = (nextCanvas.height - pieceHeight * blockSize) / 2

    nextCtx.fillStyle = color

    for (let y = 0; y < pieceHeight; y++) {
      for (let x = 0; x < pieceWidth; x++) {
        if (piece[y][x]) {
          const drawX = offsetX + x * blockSize
          const drawY = offsetY + y * blockSize
          nextCtx.fillRect(drawX, drawY, blockSize - 2, blockSize - 2)
        }
      }
    }
  }

  const tetrisGame = new TetrisGame(canvas, {
    onGameOver: handleGameOver,
    onUpdate: renderNextPreview,
  })

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        tetrisGame.moveLeft()
        break
      case 'ArrowRight':
      case 'KeyD':
        tetrisGame.moveRight()
        break
      case 'ArrowDown':
      case 'KeyS':
        tetrisGame.softDrop()
        break
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyZ':
        tetrisGame.rotate()
        break
      case 'Space':
        tetrisGame.hardDrop()
        break
    }
  }

  document.addEventListener('keydown', handleKeyDown)

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

  refreshBtn.addEventListener('click', () => {
    void loadLeaderboard()
  })

  window.addEventListener('online', () => {
    backendStatusEl.textContent = 'Reconnecting…'
    backendStatusEl.style.color = '#fbbf24'
    void checkBackendStatus()
    void loadLeaderboard()
  })

  window.addEventListener('offline', () => {
    backendStatusEl.textContent = 'Offline'
    backendStatusEl.style.color = '#f87171'
  })

  tetrisGame.reset()
  updateQueueStatus()
  void checkBackendStatus()
  void loadLeaderboard()
  renderNextPreview(tetrisGame.getSnapshot())

  console.log('Tetris game initialized successfully!')
})
