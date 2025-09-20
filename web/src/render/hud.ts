/**
 * HUD rendering for score, level, next pieces, hold, and game statistics
 */

import type { GameSnapshot } from '../core/game.js';
import type { PieceType } from '../core/piece.js';
import { PIECE_DEFINITIONS } from '../core/piece.js';

export interface HudConfig {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  panelPadding: number;
  nextPieceSize: number;
  holdPieceSize: number;
}

export const DEFAULT_HUD_CONFIG: HudConfig = {
  fontSize: 16,
  fontFamily: 'monospace',
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  panelPadding: 10,
  nextPieceSize: 20,
  holdPieceSize: 25,
};

export interface HudElements {
  score: HTMLElement;
  level: HTMLElement;
  lines: HTMLElement;
  time: HTMLElement;
  combo: HTMLElement;
  b2b: HTMLElement;
  next: HTMLElement;
  hold: HTMLElement;
  config: HTMLElement;
}

export class HudRenderer {
  private elements: HudElements;
  private config: HudConfig;
  private container: HTMLElement;

  constructor(container: HTMLElement, config?: Partial<HudConfig>) {
    this.container = container;
    this.config = { ...DEFAULT_HUD_CONFIG, ...config };
    this.elements = this.createHudElements();
    this.setupStyles();
  }

  private createHudElements(): HudElements {
    const scorePanel = this.createPanel('score-panel');
    const nextPanel = this.createPanel('next-panel');
    const holdPanel = this.createPanel('hold-panel');
    const configPanel = this.createPanel('config-panel');

    return {
      score: this.createElement('div', 'score', '0', scorePanel),
      level: this.createElement('div', 'level', '1', scorePanel),
      lines: this.createElement('div', 'lines', '0', scorePanel),
      time: this.createElement('div', 'time', '00:00', scorePanel),
      combo: this.createElement('div', 'combo', '', scorePanel),
      b2b: this.createElement('div', 'b2b', '', scorePanel),
      next: this.createElement('div', 'next-pieces', '', nextPanel),
      hold: this.createElement('div', 'hold-piece', '', holdPanel),
      config: this.createElement('div', 'config-display', '', configPanel),
    };
  }

  private createPanel(className: string): HTMLElement {
    const panel = document.createElement('div');
    panel.className = `hud-panel ${className}`;
    this.container.appendChild(panel);
    return panel;
  }

  private createElement(tag: string, className: string, text: string, parent: HTMLElement): HTMLElement {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  private setupStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .hud-panel {
        background: ${this.config.backgroundColor};
        padding: ${this.config.panelPadding}px;
        margin: 5px;
        border-radius: 5px;
        font-family: ${this.config.fontFamily};
        font-size: ${this.config.fontSize}px;
        color: ${this.config.textColor};
        min-width: 120px;
      }

      .score-panel {
        position: absolute;
        top: 10px;
        right: 10px;
      }

      .next-panel {
        position: absolute;
        top: 10px;
        left: 10px;
      }

      .hold-panel {
        position: absolute;
        top: 200px;
        left: 10px;
      }

      .config-panel {
        position: absolute;
        bottom: 10px;
        right: 10px;
        font-size: ${this.config.fontSize - 2}px;
      }

      .hud-panel h3 {
        margin: 0 0 10px 0;
        font-size: ${this.config.fontSize + 2}px;
        border-bottom: 1px solid #666;
        padding-bottom: 5px;
      }

      .hud-panel .label {
        color: #ccc;
        font-size: ${this.config.fontSize - 2}px;
      }

      .hud-panel .value {
        font-weight: bold;
        margin-bottom: 8px;
      }

      .next-piece, .hold-piece-display {
        width: ${this.config.nextPieceSize * 4}px;
        height: ${this.config.nextPieceSize * 2}px;
        margin: 5px 0;
        border: 1px solid #666;
        position: relative;
      }

      .hold-piece-display {
        width: ${this.config.holdPieceSize * 4}px;
        height: ${this.config.holdPieceSize * 2}px;
      }

      .piece-block {
        position: absolute;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .combo-display, .b2b-display {
        color: #ff6b6b;
        font-weight: bold;
        text-shadow: 0 0 5px rgba(255, 107, 107, 0.5);
      }

      .config-item {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
      }
    `;
    document.head.appendChild(style);
  }

  render(snapshot: GameSnapshot): void {
    this.renderScore(snapshot);
    this.renderNextPieces(snapshot.nextPieces);
    this.renderHoldPiece(snapshot.holdPiece, snapshot.canHold);
    this.renderConfig(snapshot.config);
  }

  private renderScore(snapshot: GameSnapshot): void {
    const { score, timeMs } = snapshot;

    // Update score panel
    this.elements.score.innerHTML = `
      <h3>Score</h3>
      <div class="score-item">
        <div class="label">Points:</div>
        <div class="value">${score.points.toLocaleString()}</div>
      </div>
      <div class="score-item">
        <div class="label">Level:</div>
        <div class="value">${score.level}</div>
      </div>
      <div class="score-item">
        <div class="label">Lines:</div>
        <div class="value">${score.lines}</div>
      </div>
      <div class="score-item">
        <div class="label">Time:</div>
        <div class="value">${this.formatTime(timeMs)}</div>
      </div>
    `;

    // Update combo display
    if (score.combo > 0) {
      this.elements.combo.innerHTML = `
        <div class="combo-display">COMBO ${score.combo}</div>
      `;
    } else {
      this.elements.combo.innerHTML = '';
    }

    // Update B2B display
    if (score.backToBack) {
      this.elements.b2b.innerHTML = `
        <div class="b2b-display">BACK-TO-BACK</div>
      `;
    } else {
      this.elements.b2b.innerHTML = '';
    }
  }

  private renderNextPieces(nextPieces: PieceType[]): void {
    let html = '<h3>Next</h3>';

    nextPieces.slice(0, 5).forEach((pieceType, index) => {
      html += `<div class="next-piece" id="next-${index}"></div>`;
    });

    this.elements.next.innerHTML = html;

    // Render piece previews
    nextPieces.slice(0, 5).forEach((pieceType, index) => {
      const container = document.getElementById(`next-${index}`);
      if (container) {
        this.renderPiecePreview(container, pieceType, this.config.nextPieceSize);
      }
    });
  }

  private renderHoldPiece(holdPiece: PieceType | null, canHold: boolean): void {
    let html = '<h3>Hold</h3>';
    html += '<div class="hold-piece-display" id="hold-piece"></div>';

    this.elements.hold.innerHTML = html;

    const container = document.getElementById('hold-piece');
    if (container && holdPiece) {
      this.renderPiecePreview(container, holdPiece, this.config.holdPieceSize, !canHold);
    }
  }

  private renderPiecePreview(container: HTMLElement, pieceType: PieceType, cellSize: number, greyedOut = false): void {
    const definition = PIECE_DEFINITIONS[pieceType];
    const blocks = definition.states[0]; // Use default rotation
    const color = this.config.textColor;

    // Clear container
    container.innerHTML = '';

    // Find bounds for centering
    const minX = Math.min(...blocks.map(b => b.x));
    const maxX = Math.max(...blocks.map(b => b.x));
    const minY = Math.min(...blocks.map(b => b.y));
    const maxY = Math.max(...blocks.map(b => b.y));

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const offsetX = (4 - width) / 2;
    const offsetY = (2 - height) / 2;

    blocks.forEach(block => {
      const blockElement = document.createElement('div');
      blockElement.className = 'piece-block';
      blockElement.style.left = `${(block.x - minX + offsetX) * cellSize}px`;
      blockElement.style.top = `${(block.y - minY + offsetY) * cellSize}px`;
      blockElement.style.width = `${cellSize - 2}px`;
      blockElement.style.height = `${cellSize - 2}px`;

      if (greyedOut) {
        blockElement.style.backgroundColor = '#666';
        blockElement.style.opacity = '0.5';
      } else {
        blockElement.style.backgroundColor = color;
      }

      container.appendChild(blockElement);
    });
  }

  private renderConfig(config: any): void {
    this.elements.config.innerHTML = `
      <h3>Settings</h3>
      <div class="config-item">
        <span>DAS:</span>
        <span>${config.dasMs}ms</span>
      </div>
      <div class="config-item">
        <span>ARR:</span>
        <span>${config.arrMs}ms</span>
      </div>
      <div class="config-item">
        <span>Lock:</span>
        <span>${config.lockDelayMs}ms</span>
      </div>
    `;
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  setConfig(config: Partial<HudConfig>): void {
    this.config = { ...this.config, ...config };
    this.setupStyles();
  }

  getConfig(): HudConfig {
    return { ...this.config };
  }

  show(): void {
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}