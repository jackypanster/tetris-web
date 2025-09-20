/**
 * Offline queue manager for score submissions
 */

import { ScoreInput, ScoreBatchInput, ScoreBatchResult, ScoreClient } from './score-client';

export interface QueuedScore extends ScoreInput {
  id: string;
  timestamp: number;
  retryCount: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  failed: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

const STORAGE_KEY = 'tetris-score-queue';
const MAX_RETRY_COUNT = 3;
const MAX_QUEUE_SIZE = 1000;
const BATCH_SIZE = 50;

export class OfflineScoreQueue {
  private scoreClient: ScoreClient;
  private queue: QueuedScore[] = [];
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor(scoreClient: ScoreClient) {
    this.scoreClient = scoreClient;
    this.loadQueue();
    this.setupEventListeners();
  }

  /**
   * Add a score to the offline queue
   */
  async enqueueScore(scoreInput: ScoreInput): Promise<string> {
    const queuedScore: QueuedScore = {
      ...scoreInput,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    // If online, try to submit immediately
    if (this.isOnline) {
      try {
        await this.scoreClient.submitScore(scoreInput);
        return queuedScore.id; // Successfully submitted, don't queue
      } catch (error) {
        // If submission fails, add to queue
        console.warn('Failed to submit score immediately, adding to queue:', error);
      }
    }

    // Add to queue
    this.queue.push(queuedScore);
    this.trimQueue();
    this.saveQueue();

    return queuedScore.id;
  }

  /**
   * Remove a score from the queue
   */
  removeScore(id: string): boolean {
    const index = this.queue.findIndex(score => score.id === id);
    if (index >= 0) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const failed = this.queue.filter(score => score.retryCount >= MAX_RETRY_COUNT).length;
    const pending = this.queue.length - failed;

    return {
      total: this.queue.length,
      pending,
      failed,
    };
  }

  /**
   * Get all queued scores
   */
  getQueuedScores(): QueuedScore[] {
    return [...this.queue];
  }

  /**
   * Clear all failed scores from the queue
   */
  clearFailedScores(): number {
    const originalLength = this.queue.length;
    this.queue = this.queue.filter(score => score.retryCount < MAX_RETRY_COUNT);
    const removed = originalLength - this.queue.length;

    if (removed > 0) {
      this.saveQueue();
    }

    return removed;
  }

  /**
   * Clear all scores from the queue
   */
  clearAll(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Sync queued scores when online
   */
  async syncScores(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    this.syncInProgress = true;

    try {
      const result: SyncResult = {
        success: true,
        processed: 0,
        failed: 0,
        errors: [],
      };

      const pendingScores = this.queue.filter(score => score.retryCount < MAX_RETRY_COUNT);

      if (pendingScores.length === 0) {
        return result;
      }

      // Process in batches
      const batches = this.createBatches(pendingScores, BATCH_SIZE);

      for (const batch of batches) {
        try {
          const batchInput: ScoreBatchInput = {
            clientTime: new Date().toISOString(),
            items: batch.map(({ id, timestamp, retryCount, ...scoreInput }) => scoreInput),
          };

          const batchResult = await this.scoreClient.submitScoresBulk(batchInput);

          // Remove successfully submitted scores
          const acceptedCount = batchResult.accepted.length;
          result.processed += acceptedCount;

          // Mark rejected scores for retry
          for (let i = 0; i < batchResult.rejected.length; i++) {
            const rejectedIndex = batch.findIndex(
              score => score.nickname === batchResult.rejected[i].payload.nickname &&
                       score.points === batchResult.rejected[i].payload.points
            );

            if (rejectedIndex >= 0) {
              batch[rejectedIndex].retryCount++;
              result.errors.push(batchResult.rejected[i].reason);
            }
          }

          // Remove successful scores from queue
          for (let i = 0; i < acceptedCount; i++) {
            const scoreIndex = this.queue.findIndex(qs =>
              batch.some(bs => bs.id === qs.id)
            );
            if (scoreIndex >= 0) {
              this.queue.splice(scoreIndex, 1);
            }
          }

        } catch (error) {
          // Mark all scores in batch for retry
          batch.forEach(score => score.retryCount++);
          result.errors.push(`Batch submission failed: ${error}`);
          result.failed += batch.length;
        }
      }

      // Update failed count
      result.failed = this.queue.filter(score => score.retryCount >= MAX_RETRY_COUNT).length;

      this.saveQueue();
      return result;

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Check if auto-sync should run
   */
  shouldAutoSync(): boolean {
    return this.isOnline &&
           !this.syncInProgress &&
           this.queue.some(score => score.retryCount < MAX_RETRY_COUNT);
  }

  /**
   * Automatic sync when coming online
   */
  async autoSync(): Promise<void> {
    if (this.shouldAutoSync()) {
      try {
        await this.syncScores();
      } catch (error) {
        console.warn('Auto-sync failed:', error);
      }
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.autoSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Periodic sync attempt
    setInterval(() => {
      if (this.shouldAutoSync()) {
        this.autoSync();
      }
    }, 60000); // Every minute
  }

  private loadQueue(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load score queue from storage:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save score queue to storage:', error);
    }
  }

  private trimQueue(): void {
    if (this.queue.length > MAX_QUEUE_SIZE) {
      // Remove oldest scores first
      this.queue.sort((a, b) => a.timestamp - b.timestamp);
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // Getters
  get isConnected(): boolean {
    return this.isOnline;
  }

  get isSyncing(): boolean {
    return this.syncInProgress;
  }

  get queueLength(): number {
    return this.queue.length;
  }
}