/**
 * Score submission client with retry logic and rate limiting handling
 */

export interface ScoreInput {
  nickname: string;
  points: number;
  lines?: number;
  levelReached?: number;
  durationSeconds?: number;
  seed?: string;
  tags?: string[];
  client?: {
    version?: string;
    platform?: string;
    ua?: string;
  };
}

export interface Score {
  id: string;
  nickname: string;
  points: number;
  lines: number;
  levelReached: number;
  durationSeconds: number;
  seed?: string;
  createdAt: string;
  suspect: boolean;
  client?: {
    version?: string;
    platform?: string;
    ua?: string;
  };
  tags?: string[];
}

export interface ScoreWindow {
  generatedAt: string;
  retention: {
    days: number;
    maxRecords: number;
  };
  nextCursor?: string;
  items: Score[];
}

export interface ScoreBatchInput {
  clientTime?: string;
  items: ScoreInput[];
}

export interface ScoreBatchResult {
  accepted: Score[];
  rejected: Array<{
    reason: string;
    payload: ScoreInput;
  }>;
}

export interface ApiError {
  code?: string;
  detail: string | any;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface ScoreClientConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  userAgent: string;
}

const DEFAULT_CONFIG: ScoreClientConfig = {
  baseUrl: 'http://localhost:8000',
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
  userAgent: 'TetrisWeb/0.3.0',
};

export class ScoreClient {
  private config: ScoreClientConfig;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config?: Partial<ScoreClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async submitScore(scoreInput: ScoreInput): Promise<Score> {
    await this.checkRateLimit();

    const response = await this.request('/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.config.userAgent,
      },
      body: JSON.stringify(this.addClientInfo(scoreInput)),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    this.updateRateLimitInfo(response);
    return await response.json();
  }

  async submitScoresBulk(batchInput: ScoreBatchInput): Promise<ScoreBatchResult> {
    await this.checkRateLimit();

    const payload = {
      ...batchInput,
      clientTime: batchInput.clientTime || new Date().toISOString(),
      items: batchInput.items.map(item => this.addClientInfo(item)),
    };

    const response = await this.request('/scores/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.config.userAgent,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok && response.status !== 207) {
      await this.handleErrorResponse(response);
    }

    this.updateRateLimitInfo(response);
    return await response.json();
  }

  async getScores(params?: {
    limit?: number;
    cursor?: string;
    since?: string;
  }): Promise<ScoreWindow> {
    const url = new URL('/scores', this.config.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const response = await this.request(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': this.config.userAgent,
      },
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    this.updateRateLimitInfo(response);
    return await response.json();
  }

  private async request(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(
        url.startsWith('http') ? url : `${this.config.baseUrl}${url}`,
        {
          ...options,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiError;

    try {
      errorData = await response.json();
    } catch {
      errorData = {
        detail: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const error = new Error(
      typeof errorData.detail === 'string'
        ? errorData.detail
        : 'An error occurred while processing the request'
    );

    (error as any).status = response.status;
    (error as any).code = errorData.code;
    (error as any).details = errorData.detail;

    throw error;
  }

  private updateRateLimitInfo(response: Response): void {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    const retryAfter = response.headers.get('Retry-After');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
      };
    }
  }

  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) return;

    const now = Math.floor(Date.now() / 1000);

    // Check if rate limit has reset
    if (now >= this.rateLimitInfo.reset) {
      this.rateLimitInfo = null;
      return;
    }

    // Check if we have remaining requests
    if (this.rateLimitInfo.remaining <= 0) {
      const waitTime = (this.rateLimitInfo.reset - now) * 1000;
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
  }

  private addClientInfo(scoreInput: ScoreInput): ScoreInput {
    return {
      ...scoreInput,
      client: {
        version: '0.3.0',
        platform: navigator.platform,
        ua: navigator.userAgent.substring(0, 128),
        ...scoreInput.client,
      },
    };
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  setConfig(config: Partial<ScoreClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ScoreClientConfig {
    return { ...this.config };
  }
}

// Retry wrapper with exponential backoff
export class RetryableScoreClient {
  private client: ScoreClient;
  private maxRetries: number;
  private baseDelay: number;

  constructor(client: ScoreClient, maxRetries = 3, baseDelay = 1000) {
    this.client = client;
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async submitScore(scoreInput: ScoreInput): Promise<Score> {
    return this.retry(() => this.client.submitScore(scoreInput));
  }

  async submitScoresBulk(batchInput: ScoreBatchInput): Promise<ScoreBatchResult> {
    return this.retry(() => this.client.submitScoresBulk(batchInput));
  }

  async getScores(params?: Parameters<ScoreClient['getScores']>[0]): Promise<ScoreWindow> {
    return this.retry(() => this.client.getScores(params));
  }

  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except rate limiting
        if ((error as any).status >= 400 && (error as any).status < 500 && (error as any).status !== 429) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * delay;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError!;
  }
}