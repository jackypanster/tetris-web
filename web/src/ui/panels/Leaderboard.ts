/**
 * Leaderboard display panel
 */

import { ScoreClient } from '../../net/score-client';
import type { Score, ScoreWindow } from '../../net/types';

export class LeaderboardPanel {
  private container: HTMLElement;
  private scoreClient: ScoreClient;
  private isVisible = false;
  private isLoading = false;
  private scores: Score[] = [];
  private nextCursor: string | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.scoreClient = new ScoreClient();
    this.render();
  }

  public async show(): Promise<void> {
    this.isVisible = true;
    this.container.style.display = 'block';
    await this.loadScores();
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="leaderboard-panel" style="display: none;">
        <div class="leaderboard-header">
          <h2>Leaderboard</h2>
          <button class="close-btn">&times;</button>
        </div>

        <div class="leaderboard-content">
          <div class="leaderboard-controls">
            <button class="refresh-btn">Refresh</button>
            <span class="last-updated"></span>
          </div>

          <div class="leaderboard-list">
            <div class="loading-indicator" style="display: none;">
              Loading scores...
            </div>
            <div class="empty-state" style="display: none;">
              No scores available
            </div>
            <div class="score-list"></div>
          </div>

          <div class="leaderboard-footer">
            <button class="load-more-btn" style="display: none;">Load More</button>
            <div class="retention-info"></div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Refresh button
    const refreshBtn = this.container.querySelector('.refresh-btn');
    refreshBtn?.addEventListener('click', () => this.refreshScores());

    // Load more button
    const loadMoreBtn = this.container.querySelector('.load-more-btn');
    loadMoreBtn?.addEventListener('click', () => this.loadMoreScores());
  }

  private async loadScores(cursor?: string): Promise<void> {
    if (this.isLoading) return;

    try {
      this.setLoading(true);

      const window = await this.scoreClient.getScores({
        limit: 20,
        cursor: cursor
      });

      if (!cursor) {
        // First load - replace scores
        this.scores = window.items;
      } else {
        // Load more - append scores
        this.scores.push(...window.items);
      }

      this.nextCursor = window.nextCursor;
      this.renderScores(window);

    } catch (error) {
      console.error('Failed to load scores:', error);
      this.showError('Failed to load leaderboard. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  private async refreshScores(): Promise<void> {
    this.scores = [];
    this.nextCursor = null;
    await this.loadScores();
  }

  private async loadMoreScores(): Promise<void> {
    if (this.nextCursor) {
      await this.loadScores(this.nextCursor);
    }
  }

  private renderScores(window: ScoreWindow): void {
    const scoreList = this.container.querySelector('.score-list');
    const emptyState = this.container.querySelector('.empty-state') as HTMLElement;
    const loadMoreBtn = this.container.querySelector('.load-more-btn') as HTMLElement;
    const retentionInfo = this.container.querySelector('.retention-info');
    const lastUpdated = this.container.querySelector('.last-updated');

    if (!scoreList) return;

    if (this.scores.length === 0) {
      emptyState.style.display = 'block';
      scoreList.innerHTML = '';
    } else {
      emptyState.style.display = 'none';
      scoreList.innerHTML = this.scores.map((score, index) =>
        this.renderScoreItem(score, index + 1)
      ).join('');
    }

    // Show/hide load more button
    loadMoreBtn.style.display = this.nextCursor ? 'block' : 'none';

    // Update retention info
    if (retentionInfo) {
      retentionInfo.textContent =
        `Showing top scores from the last ${window.retention.days} days (max ${window.retention.maxRecords} records)`;
    }

    // Update last updated
    if (lastUpdated) {
      const updateTime = new Date(window.generatedAt).toLocaleString();
      lastUpdated.textContent = `Updated: ${updateTime}`;
    }
  }

  private renderScoreItem(score: Score, rank: number): string {
    const suspectBadge = score.suspect ? '<span class="suspect-badge">Under Review</span>' : '';
    const duration = this.formatDuration(score.durationSeconds);
    const date = new Date(score.createdAt).toLocaleDateString();

    return `
      <div class="score-item ${score.suspect ? 'suspect' : ''}">
        <div class="rank">${rank}</div>
        <div class="player-info">
          <div class="nickname">${this.escapeHtml(score.nickname)} ${suspectBadge}</div>
          <div class="meta">Level ${score.levelReached} • ${score.lines} lines • ${duration}</div>
        </div>
        <div class="score">${score.points.toLocaleString()}</div>
        <div class="date">${date}</div>
      </div>
    `;
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    const loadingIndicator = this.container.querySelector('.loading-indicator') as HTMLElement;
    const refreshBtn = this.container.querySelector('.refresh-btn') as HTMLButtonElement;
    const loadMoreBtn = this.container.querySelector('.load-more-btn') as HTMLButtonElement;

    if (loadingIndicator) {
      loadingIndicator.style.display = loading ? 'block' : 'none';
    }

    if (refreshBtn) {
      refreshBtn.disabled = loading;
    }

    if (loadMoreBtn) {
      loadMoreBtn.disabled = loading;
    }
  }

  private showError(message: string): void {
    const scoreList = this.container.querySelector('.score-list');
    if (scoreList) {
      scoreList.innerHTML = `
        <div class="error-message">
          <p>${message}</p>
          <button onclick="this.parentElement.remove()">Dismiss</button>
        </div>
      `;
    }
  }
}