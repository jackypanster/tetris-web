import { ScoreClient } from './score-client';

let instance: ScoreClient | null = null;

function resolveBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim().length > 0) {
    return envBase;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }

  return window.location.origin;
}

export function getScoreClient(): ScoreClient {
  if (!instance) {
    instance = new ScoreClient({ baseUrl: resolveBaseUrl() });
  }
  return instance;
}
