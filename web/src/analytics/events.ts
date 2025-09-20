/**
 * Client-side analytics and event tracking
 */

export enum AnalyticsEvent {
  GAME_STARTED = 'game_started',
  GAME_OVER = 'game_over',
  LINE_CLEAR = 'line_clear',
  HOLD_USED = 'hold_used',
  SETTING_CHANGED = 'setting_changed',
  SCORE_SUBMITTED = 'score_submitted',
  OFFLINE_SCORE_QUEUED = 'offline_score_queued',
  PAUSE_GAME = 'pause_game',
  RESUME_GAME = 'resume_game',
}

export interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

export interface TrackedEvent {
  event: AnalyticsEvent;
  properties: EventProperties;
  timestamp: number;
  sessionId: string;
}

class AnalyticsCollector {
  private events: TrackedEvent[] = [];
  private sessionId: string;
  private batchSize = 50;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public track(event: AnalyticsEvent, properties: EventProperties = {}): void {
    const trackedEvent: TrackedEvent = {
      event,
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.events.push(trackedEvent);

    // Auto-flush if batch is full
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // In a real implementation, send to analytics service
      console.log('Analytics batch:', eventsToSend);

      // Store locally for debugging
      this.storeEventsLocally(eventsToSend);

    } catch (error) {
      console.warn('Failed to send analytics events:', error);
      // Re-queue events for next attempt
      this.events.unshift(...eventsToSend);
    }
  }

  private storeEventsLocally(events: TrackedEvent[]): void {
    try {
      const stored = localStorage.getItem('analytics_events') || '[]';
      const existingEvents = JSON.parse(stored);
      const updatedEvents = [...existingEvents, ...events];

      // Keep only last 1000 events
      if (updatedEvents.length > 1000) {
        updatedEvents.splice(0, updatedEvents.length - 1000);
      }

      localStorage.setItem('analytics_events', JSON.stringify(updatedEvents));
    } catch (error) {
      console.warn('Failed to store analytics events locally:', error);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

// Global analytics instance
export const analytics = new AnalyticsCollector();

// Convenience functions for common events
export const trackGameStarted = (properties: EventProperties = {}) => {
  analytics.track(AnalyticsEvent.GAME_STARTED, properties);
};

export const trackGameOver = (score: number, lines: number, level: number, duration: number) => {
  analytics.track(AnalyticsEvent.GAME_OVER, {
    score,
    lines,
    level,
    duration,
  });
};

export const trackLineClear = (linesCleared: number, isB2B: boolean, combo: number) => {
  analytics.track(AnalyticsEvent.LINE_CLEAR, {
    linesCleared,
    isB2B,
    combo,
  });
};

export const trackHoldUsed = () => {
  analytics.track(AnalyticsEvent.HOLD_USED);
};

export const trackSettingChanged = (setting: string, value: any) => {
  analytics.track(AnalyticsEvent.SETTING_CHANGED, {
    setting,
    value: String(value),
  });
};

export const trackScoreSubmitted = (points: number, online: boolean) => {
  analytics.track(AnalyticsEvent.SCORE_SUBMITTED, {
    points,
    online,
  });
};

export const trackOfflineScoreQueued = (points: number) => {
  analytics.track(AnalyticsEvent.OFFLINE_SCORE_QUEUED, {
    points,
  });
};

// Web Vitals tracking (placeholder for future implementation)
export const initWebVitals = () => {
  // Web Vitals would be imported and configured here
  console.log('Web Vitals tracking initialized');
};