/**
 * Canvas 2D renderer with layered rendering and high DPI support
 */

import type { GameSnapshot } from '../core/game.js';
import type { Piece } from '../core/piece.js';
import { getPieceBlocks, PIECE_DEFINITIONS } from '../core/piece.js';

export interface RenderConfig {
  cellSize: number;
  borderWidth: number;
  showGrid: boolean;
  showGhost: boolean;
  backgroundColor: string;
  gridColor: string;
  borderColor: string;
  pieceColors: string[];
  ghostOpacity: number;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  cellSize: 30,
  borderWidth: 2,
  showGrid: true,
  showGhost: true,
  backgroundColor: '#1a1a1a',
  gridColor: '#333333',
  borderColor: '#666666',
  pieceColors: [
    '#000000', // Empty
    '#00f0f0', // I - Cyan
    '#f0f000', // O - Yellow
    '#a000f0', // T - Purple
    '#00f000', // S - Green
    '#f00000', // Z - Red
    '#0000f0', // J - Blue
    '#f0a000', // L - Orange
  ],
  ghostOpacity: 0.3,
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement, config?: Partial<RenderConfig>) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_RENDER_CONFIG, ...config };
    this.dpr = window.devicePixelRatio || 1;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D rendering context');
    }
    this.ctx = ctx;

    this.setupCanvas();
  }

  private setupCanvas(): void {
    const boardWidth = 10 * this.config.cellSize + this.config.borderWidth * 2;
    const boardHeight = 20 * this.config.cellSize + this.config.borderWidth * 2;

    // Set logical size
    this.canvas.width = boardWidth;
    this.canvas.height = boardHeight;

    // Set physical size for high DPI
    this.canvas.style.width = `${boardWidth}px`;
    this.canvas.style.height = `${boardHeight}px`;

    // Scale the canvas for high DPI
    this.canvas.width = boardWidth * this.dpr;
    this.canvas.height = boardHeight * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    // Set image smoothing
    this.ctx.imageSmoothingEnabled = false;
  }

  render(snapshot: GameSnapshot): void {
    this.clear();
    this.renderBackground();

    if (this.config.showGrid) {
      this.renderGrid();
    }

    this.renderBoard(snapshot.board);

    if (snapshot.ghostPiece && this.config.showGhost) {
      this.renderGhostPiece(snapshot.ghostPiece);
    }

    if (snapshot.currentPiece) {
      this.renderPiece(snapshot.currentPiece);
    }

    this.renderBorder();
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
  }

  private renderBackground(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
  }

  private renderGrid(): void {
    this.ctx.strokeStyle = this.config.gridColor;
    this.ctx.lineWidth = 1;

    const { cellSize, borderWidth } = this.config;

    // Vertical lines
    for (let x = 0; x <= 10; x++) {
      const xPos = borderWidth + x * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(xPos, borderWidth);
      this.ctx.lineTo(xPos, borderWidth + 20 * cellSize);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= 20; y++) {
      const yPos = borderWidth + y * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(borderWidth, yPos);
      this.ctx.lineTo(borderWidth + 10 * cellSize, yPos);
      this.ctx.stroke();
    }
  }

  private renderBoard(board: number[][]): void {
    const visibleBoard = board.slice(2); // Skip hidden rows

    for (let y = 0; y < visibleBoard.length; y++) {
      for (let x = 0; x < visibleBoard[y].length; x++) {
        const cellValue = visibleBoard[y][x];
        if (cellValue > 0) {
          this.renderCell(x, y, this.config.pieceColors[cellValue]);
        }
      }
    }
  }

  private renderPiece(piece: Piece): void {
    const blocks = getPieceBlocks(piece);
    const color = this.config.pieceColors[PIECE_DEFINITIONS[piece.type].color];

    blocks.forEach(block => {
      const boardY = block.y - 2; // Adjust for hidden rows
      if (boardY >= 0) {
        this.renderCell(block.x, boardY, color);
      }
    });
  }

  private renderGhostPiece(ghostPiece: Piece): void {
    const blocks = getPieceBlocks(ghostPiece);
    const color = this.config.pieceColors[PIECE_DEFINITIONS[ghostPiece.type].color];

    this.ctx.save();
    this.ctx.globalAlpha = this.config.ghostOpacity;

    blocks.forEach(block => {
      const boardY = block.y - 2; // Adjust for hidden rows
      if (boardY >= 0) {
        this.renderCellOutline(block.x, boardY, color);
      }
    });

    this.ctx.restore();
  }

  private renderCell(x: number, y: number, color: string): void {
    const { cellSize, borderWidth } = this.config;
    const xPos = borderWidth + x * cellSize;
    const yPos = borderWidth + y * cellSize;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(xPos, yPos, cellSize, cellSize);

    // Add subtle inner border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(xPos + 0.5, yPos + 0.5, cellSize - 1, cellSize - 1);
  }

  private renderCellOutline(x: number, y: number, color: string): void {
    const { cellSize, borderWidth } = this.config;
    const xPos = borderWidth + x * cellSize;
    const yPos = borderWidth + y * cellSize;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(xPos + 1, yPos + 1, cellSize - 2, cellSize - 2);
  }

  private renderBorder(): void {
    const { borderWidth } = this.config;
    const boardWidth = 10 * this.config.cellSize;
    const boardHeight = 20 * this.config.cellSize;

    this.ctx.strokeStyle = this.config.borderColor;
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      boardWidth + borderWidth,
      boardHeight + borderWidth
    );
  }

  setConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
    this.setupCanvas();
  }

  getConfig(): RenderConfig {
    return { ...this.config };
  }

  resize(width?: number, height?: number): void {
    if (width && height) {
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    this.setupCanvas();
  }

  // Utility method for getting pixel position from board coordinates
  getBoardPosition(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const x = Math.floor((canvasX - this.config.borderWidth) / this.config.cellSize);
    const y = Math.floor((canvasY - this.config.borderWidth) / this.config.cellSize);

    if (x >= 0 && x < 10 && y >= 0 && y < 20) {
      return { x, y };
    }

    return null;
  }
}