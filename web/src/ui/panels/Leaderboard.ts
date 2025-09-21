/**
 * 簡易排行榜面板，集中處理資料抓取與渲染占位邏輯。
 */

import type { ScoreWindow } from '../../net/score-client'
import { ScoreClient } from '../../net/score-client'

export interface LeaderboardPanelOptions {
  limit?: number
}

export class LeaderboardPanel {
  private readonly container: HTMLElement
  private readonly client: ScoreClient
  private readonly limit: number

  constructor(container: HTMLElement, options: LeaderboardPanelOptions = {}) {
    this.container = container
    this.client = new ScoreClient()
    this.limit = options.limit ?? 10
  }

  async refresh(): Promise<void> {
    const status = document.createElement('p')
    status.textContent = 'Loading leaderboard…'
    this.container.replaceChildren(status)

    try {
      const window = await this.client.getScores({ limit: this.limit })
      this.render(window)
    } catch (error) {
      status.textContent = 'Failed to load leaderboard.'
      console.warn('Leaderboard load failed', error)
    }
  }

  private render(window: ScoreWindow): void {
    if (window.items.length === 0) {
      const empty = document.createElement('p')
      empty.textContent = 'No scores yet. Play a game to set the first record!'
      this.container.replaceChildren(empty)
      return
    }

    const list = document.createElement('ol')
    window.items.forEach((item: ScoreWindow['items'][number]) => {
      const entry = document.createElement('li')
      entry.textContent = `${item.nickname} — ${item.points.toLocaleString()} pts`
      list.appendChild(entry)
    })
    this.container.replaceChildren(list)
  }
}
