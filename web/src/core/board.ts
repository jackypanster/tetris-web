/**
 * Core board logic for Tetris - grid state, line clearing, collision detection
 */

export type CellState = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0 = empty, 1-7 = piece types
export type Board = CellState[][];

export interface BoardConfig {
  width: number;
  height: number;
  hiddenRows: number;
}

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  width: 10,
  height: 20,
  hiddenRows: 2,
};

export class TetrisBoard {
  private grid: Board;
  private config: BoardConfig;

  constructor(config: BoardConfig = DEFAULT_BOARD_CONFIG) {
    this.config = config;
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): Board {
    const totalHeight = this.config.height + this.config.hiddenRows;
    return Array(totalHeight).fill(null).map(() =>
      Array(this.config.width).fill(0) as CellState[]
    );
  }

  getGrid(): Board {
    return this.grid.map(row => [...row]);
  }

  getVisibleGrid(): Board {
    return this.grid.slice(this.config.hiddenRows);
  }

  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.config.width &&
           y >= 0 && y < this.config.height + this.config.hiddenRows;
  }

  isCellEmpty(x: number, y: number): boolean {
    if (!this.isValidPosition(x, y)) return false;
    return this.grid[y][x] === 0;
  }

  setCellState(x: number, y: number, state: CellState): void {
    if (this.isValidPosition(x, y)) {
      this.grid[y][x] = state;
    }
  }

  getCellState(x: number, y: number): CellState {
    if (!this.isValidPosition(x, y)) return 1; // Treat out-of-bounds as solid
    return this.grid[y][x];
  }

  checkLineClear(): number[] {
    const clearedLines: number[] = [];

    for (let y = 0; y < this.config.height + this.config.hiddenRows; y++) {
      if (this.grid[y].every(cell => cell !== 0)) {
        clearedLines.push(y);
      }
    }

    return clearedLines;
  }

  clearLines(lines: number[]): void {
    // Remove cleared lines and add empty lines at top
    const sortedLines = [...lines].sort((a, b) => b - a);

    for (const lineIndex of sortedLines) {
      this.grid.splice(lineIndex, 1);
      this.grid.unshift(Array(this.config.width).fill(0) as CellState[]);
    }
  }

  isGameOver(): boolean {
    // Check if any cells in the hidden rows are occupied
    for (let y = 0; y < this.config.hiddenRows; y++) {
      if (this.grid[y].some(cell => cell !== 0)) {
        return true;
      }
    }
    return false;
  }

  reset(): void {
    this.grid = this.createEmptyGrid();
  }
}