/**
 * Centralized state management using RxJS with time-travel debugging support
 */

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import type { GameSnapshot, GameConfig } from '../core/game.js';
import type { KeyBinding, KeyboardConfig } from '../input/keyboard.js';
import type { RenderConfig } from '../render/canvas_renderer.js';

export interface AppSettings {
  keyboard: KeyboardConfig;
  render: RenderConfig;
  game: GameConfig;
  playerName: string;
  sound: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    enabled: boolean;
  };
  accessibility: {
    colorBlindMode: boolean;
    reduceMotion: boolean;
    highContrast: boolean;
    screenReaderMode: boolean;
  };
  tutorial: {
    completed: boolean;
    showOverlay: boolean;
  };
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  points: number;
  lines: number;
  levelReached: number;
  durationSeconds: number;
  createdAt: string;
  suspect: boolean;
}

export interface LeaderboardState {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  nextCursor: string | null;
}

export interface GameSessionStats {
  gamesPlayed: number;
  totalPlayTime: number;
  highScore: number;
  totalLines: number;
  averageLevel: number;
  lastPlayed: number | null;
}

export interface AppState {
  settings: AppSettings;
  gameSnapshot: GameSnapshot | null;
  leaderboard: LeaderboardState;
  sessionStats: GameSessionStats;
  debugMode: boolean;
  connectionStatus: 'online' | 'offline' | 'syncing';
  pendingScores: any[]; // Queue for offline scores
}

export type StateAction =
  | { type: 'GAME_UPDATE'; payload: GameSnapshot }
  | { type: 'SETTINGS_UPDATE'; payload: Partial<AppSettings> }
  | { type: 'LEADERBOARD_FETCH_START' }
  | { type: 'LEADERBOARD_FETCH_SUCCESS'; payload: LeaderboardEntry[] }
  | { type: 'LEADERBOARD_FETCH_ERROR'; payload: string }
  | { type: 'CONNECTION_STATUS_CHANGE'; payload: 'online' | 'offline' | 'syncing' }
  | { type: 'SCORE_QUEUE_ADD'; payload: any }
  | { type: 'SCORE_QUEUE_CLEAR' }
  | { type: 'SESSION_STATS_UPDATE'; payload: Partial<GameSessionStats> }
  | { type: 'DEBUG_MODE_TOGGLE' }
  | { type: 'RESET_STATE' };

const DEFAULT_SETTINGS: AppSettings = {
  keyboard: {
    bindings: {
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
      softDrop: ['ArrowDown', 'KeyS'],
      hardDrop: ['ArrowUp', 'KeyW', 'Space'],
      rotateLeft: ['KeyZ', 'ControlLeft'],
      rotateRight: ['KeyX', 'ArrowUp'],
      rotate180: ['KeyA'],
      hold: ['KeyC', 'ShiftLeft'],
      pause: ['Escape', 'KeyP'],
    },
    dasMs: 300,
    arrMs: 100,
  },
  render: {
    cellSize: 30,
    borderWidth: 2,
    showGrid: true,
    showGhost: true,
    backgroundColor: '#1a1a1a',
    gridColor: '#333333',
    borderColor: '#666666',
    pieceColors: [
      '#000000', '#00f0f0', '#f0f000', '#a000f0',
      '#00f000', '#f00000', '#0000f0', '#f0a000',
    ],
    ghostOpacity: 0.3,
  },
  game: {
    board: { width: 10, height: 20, hiddenRows: 2 },
    lockDelayMs: 500,
    clearDelayMs: 150,
    dasMs: 300,
    arrMs: 100,
    softDropMultiplier: 20,
    enable180Rotation: false,
  },
  playerName: 'Anonymous',
  sound: {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.6,
    enabled: true,
  },
  accessibility: {
    colorBlindMode: false,
    reduceMotion: false,
    highContrast: false,
    screenReaderMode: false,
  },
  tutorial: {
    completed: false,
    showOverlay: true,
  },
};

const DEFAULT_STATE: AppState = {
  settings: DEFAULT_SETTINGS,
  gameSnapshot: null,
  leaderboard: {
    entries: [],
    loading: false,
    error: null,
    lastUpdated: null,
    nextCursor: null,
  },
  sessionStats: {
    gamesPlayed: 0,
    totalPlayTime: 0,
    highScore: 0,
    totalLines: 0,
    averageLevel: 1,
    lastPlayed: null,
  },
  debugMode: false,
  connectionStatus: 'online',
  pendingScores: [],
};

export class AppStore {
  private state$ = new BehaviorSubject<AppState>(DEFAULT_STATE);
  private actions$ = new Subject<StateAction>();
  private history: AppState[] = [];
  private maxHistorySize = 100;

  constructor() {
    // Subscribe to actions and update state
    this.actions$.subscribe(action => {
      const currentState = this.state$.value;
      const newState = this.reducer(currentState, action);

      // Add to history for time-travel debugging
      if (this.history.length >= this.maxHistorySize) {
        this.history.shift();
      }
      this.history.push(currentState);

      this.state$.next(newState);
    });

    // Load persisted state
    this.loadState();

    // Auto-save state changes
    this.state$.subscribe(state => {
      this.saveState(state);
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.dispatch({ type: 'CONNECTION_STATUS_CHANGE', payload: 'online' });
    });

    window.addEventListener('offline', () => {
      this.dispatch({ type: 'CONNECTION_STATUS_CHANGE', payload: 'offline' });
    });
  }

  private reducer(state: AppState, action: StateAction): AppState {
    switch (action.type) {
      case 'GAME_UPDATE':
        return {
          ...state,
          gameSnapshot: action.payload,
        };

      case 'SETTINGS_UPDATE':
        return {
          ...state,
          settings: {
            ...state.settings,
            ...action.payload,
          },
        };

      case 'LEADERBOARD_FETCH_START':
        return {
          ...state,
          leaderboard: {
            ...state.leaderboard,
            loading: true,
            error: null,
          },
        };

      case 'LEADERBOARD_FETCH_SUCCESS':
        return {
          ...state,
          leaderboard: {
            ...state.leaderboard,
            entries: action.payload,
            loading: false,
            error: null,
            lastUpdated: Date.now(),
          },
        };

      case 'LEADERBOARD_FETCH_ERROR':
        return {
          ...state,
          leaderboard: {
            ...state.leaderboard,
            loading: false,
            error: action.payload,
          },
        };

      case 'CONNECTION_STATUS_CHANGE':
        return {
          ...state,
          connectionStatus: action.payload,
        };

      case 'SCORE_QUEUE_ADD':
        return {
          ...state,
          pendingScores: [...state.pendingScores, action.payload],
        };

      case 'SCORE_QUEUE_CLEAR':
        return {
          ...state,
          pendingScores: [],
        };

      case 'SESSION_STATS_UPDATE':
        return {
          ...state,
          sessionStats: {
            ...state.sessionStats,
            ...action.payload,
          },
        };

      case 'DEBUG_MODE_TOGGLE':
        return {
          ...state,
          debugMode: !state.debugMode,
        };

      case 'RESET_STATE':
        return DEFAULT_STATE;

      default:
        return state;
    }
  }

  // Public API
  getState(): AppState {
    return this.state$.value;
  }

  getState$(): Observable<AppState> {
    return this.state$.asObservable();
  }

  dispatch(action: StateAction): void {
    this.actions$.next(action);
  }

  // Selectors
  getSettings(): AppSettings {
    return this.state$.value.settings;
  }

  getGameSnapshot(): GameSnapshot | null {
    return this.state$.value.gameSnapshot;
  }

  getLeaderboard(): LeaderboardState {
    return this.state$.value.leaderboard;
  }

  getSessionStats(): GameSessionStats {
    return this.state$.value.sessionStats;
  }

  isOnline(): boolean {
    return this.state$.value.connectionStatus === 'online';
  }

  getPendingScores(): any[] {
    return this.state$.value.pendingScores;
  }

  // Time-travel debugging
  getHistory(): AppState[] {
    return [...this.history];
  }

  timeTravel(stepBack: number): void {
    if (stepBack > 0 && stepBack <= this.history.length) {
      const targetState = this.history[this.history.length - stepBack];
      this.state$.next(targetState);
    }
  }

  // Persistence
  private saveState(state: AppState): void {
    try {
      const persistedState = {
        settings: state.settings,
        sessionStats: state.sessionStats,
        pendingScores: state.pendingScores,
      };
      localStorage.setItem('tetris-app-state', JSON.stringify(persistedState));
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error);
    }
  }

  private loadState(): void {
    try {
      const savedState = localStorage.getItem('tetris-app-state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        const mergedState = {
          ...this.state$.value,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          sessionStats: { ...this.state$.value.sessionStats, ...parsed.sessionStats },
          pendingScores: parsed.pendingScores || [],
        };
        this.state$.next(mergedState);
      }
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
    }
  }

  // Utility methods
  updateSettings(settings: Partial<AppSettings>): void {
    this.dispatch({ type: 'SETTINGS_UPDATE', payload: settings });
  }

  updateGameSnapshot(snapshot: GameSnapshot): void {
    this.dispatch({ type: 'GAME_UPDATE', payload: snapshot });
  }

  addPendingScore(score: any): void {
    this.dispatch({ type: 'SCORE_QUEUE_ADD', payload: score });
  }

  clearPendingScores(): void {
    this.dispatch({ type: 'SCORE_QUEUE_CLEAR' });
  }

  updateSessionStats(stats: Partial<GameSessionStats>): void {
    this.dispatch({ type: 'SESSION_STATS_UPDATE', payload: stats });
  }

  toggleDebugMode(): void {
    this.dispatch({ type: 'DEBUG_MODE_TOGGLE' });
  }
}