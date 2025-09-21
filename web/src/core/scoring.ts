/**
 * Tetris scoring system with combo, B2B, and Perfect Clear support
 */

export interface ScoreState {
  points: number;
  lines: number;
  level: number;
  combo: number;
  backToBack: boolean;
  perfectClearReady: boolean;
}

export interface ClearEvent {
  linesCleared: number;
  isPerfectClear: boolean;
  isTSpin: boolean;
  isDifficult: boolean; // 4-line or T-spin
}

export interface ScoreResult {
  pointsAwarded: number;
  newState: ScoreState;
  description: string;
}

// Base line clear scores
const LINE_CLEAR_SCORES: Record<1 | 2 | 3 | 4, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

// T-Spin scores (mini T-spins not implemented yet)
const TSPIN_SCORES: Record<0 | 1 | 2 | 3, number> = {
  0: 400,
  1: 800,
  2: 1200,
  3: 1600,
};

const PERFECT_CLEAR_BONUS = 1800;
const B2B_MULTIPLIER = 1.5;

export class TetrisScoring {
  private state: ScoreState;

  constructor(initialState?: Partial<ScoreState>) {
    this.state = {
      points: 0,
      lines: 0,
      level: 1,
      combo: 0,
      backToBack: false,
      perfectClearReady: false,
      ...initialState,
    };
  }

  getState(): ScoreState {
    return { ...this.state };
  }

  setState(state: ScoreState): void {
    this.state = { ...state };
  }

  calculateScore(clearEvent: ClearEvent): ScoreResult {
    let pointsAwarded = 0;
    let description = '';

    if (clearEvent.linesCleared === 0) {
      // No lines cleared - reset combo but maintain B2B for T-spin no lines
      const newState: ScoreState = {
        ...this.state,
        combo: 0,
        backToBack: clearEvent.isTSpin ? this.state.backToBack : false,
      };

      if (clearEvent.isTSpin) {
        pointsAwarded = TSPIN_SCORES[0] * this.state.level;
        if (this.state.backToBack) {
          pointsAwarded = Math.floor(pointsAwarded * B2B_MULTIPLIER);
          description = 'T-Spin (B2B)';
        } else {
          description = 'T-Spin';
        }
        newState.backToBack = true;
      }

      return {
        pointsAwarded,
        newState,
        description,
      };
    }

    // Calculate base score
    if (clearEvent.isTSpin) {
      const tSpinKey = Math.min(clearEvent.linesCleared, 3) as 0 | 1 | 2 | 3;
      pointsAwarded = TSPIN_SCORES[tSpinKey] * this.state.level;
      description = `T-Spin ${this.getLineClearName(clearEvent.linesCleared)}`;
    } else {
      const lineKey = Math.min(clearEvent.linesCleared, 4) as 1 | 2 | 3 | 4;
      pointsAwarded = LINE_CLEAR_SCORES[lineKey] * this.state.level;
      description = this.getLineClearName(clearEvent.linesCleared);
    }

    // Apply B2B bonus
    if (this.state.backToBack && clearEvent.isDifficult) {
      pointsAwarded = Math.floor(pointsAwarded * B2B_MULTIPLIER);
      description += ' (B2B)';
    }

    // Apply combo bonus
    const comboBonus = this.state.combo * 50 * this.state.level;
    pointsAwarded += comboBonus;

    if (this.state.combo > 0) {
      description += ` Combo ${this.state.combo}`;
    }

    // Perfect Clear bonus
    if (clearEvent.isPerfectClear) {
      pointsAwarded += PERFECT_CLEAR_BONUS;
      description += ' Perfect Clear';
    }

    // Update state
    const newLines = this.state.lines + clearEvent.linesCleared;
    const newLevel = Math.floor(newLines / 10) + 1;

    const newState: ScoreState = {
      points: this.state.points + pointsAwarded,
      lines: newLines,
      level: newLevel,
      combo: this.state.combo + 1,
      backToBack: clearEvent.isDifficult,
      perfectClearReady: this.calculatePerfectClearReady(clearEvent),
    };

    return {
      pointsAwarded,
      newState,
      description,
    };
  }

  private getLineClearName(lines: number): string {
    switch (lines) {
      case 1: return 'Single';
      case 2: return 'Double';
      case 3: return 'Triple';
      case 4: return 'Tetris';
      default: return `${lines} Lines`;
    }
  }

  private calculatePerfectClearReady(clearEvent: ClearEvent): boolean {
    // Simplified logic - would need board analysis in real implementation
    return clearEvent.isPerfectClear || this.state.perfectClearReady;
  }

  resetGame(): void {
    this.state = {
      points: 0,
      lines: 0,
      level: 1,
      combo: 0,
      backToBack: false,
      perfectClearReady: false,
    };
  }

  // Utility methods for game analysis
  getDropSpeed(): number {
    // Drop speed calculation based on level (frames per grid cell)
    // Level 1: 48 frames, Level 10: 5 frames, Level 15+: 1 frame
    if (this.state.level >= 15) return 1;
    if (this.state.level >= 10) return Math.max(1, 6 - (this.state.level - 9));
    return Math.max(1, 49 - (this.state.level * 4));
  }

  getLockDelay(): number {
    // Lock delay in milliseconds based on level
    const baseDelay = 500;
    const reduction = Math.min(this.state.level - 1, 15) * 20;
    return Math.max(100, baseDelay - reduction);
  }
}
