/**
 * Bag-7 randomizer for Tetris piece generation with seed support
 */

import type { PieceType } from './piece.js';

export interface RngState {
  seed: string;
  bag: PieceType[];
  bagIndex: number;
  history: PieceType[];
}

export class Bag7Randomizer {
  private state: RngState;
  private seedRng: () => number;

  constructor(seed?: string) {
    this.state = {
      seed: seed || this.generateSeed(),
      bag: [],
      bagIndex: 0,
      history: [],
    };
    this.seedRng = this.createSeededRng(this.state.seed);
    this.refillBag();
  }

  private generateSeed(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private createSeededRng(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return () => {
      hash = (hash * 1664525 + 1013904223) % Math.pow(2, 32);
      return hash / Math.pow(2, 32);
    };
  }

  private refillBag(): void {
    const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

    // Fisher-Yates shuffle using seeded RNG
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(this.seedRng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }

    this.state.bag = pieces;
    this.state.bagIndex = 0;
  }

  next(): PieceType {
    if (this.state.bagIndex >= this.state.bag.length) {
      this.refillBag();
    }

    const piece = this.state.bag[this.state.bagIndex];
    this.state.bagIndex++;
    this.state.history.push(piece);

    return piece;
  }

  peek(count: number = 5): PieceType[] {
    const preview: PieceType[] = [];
    let tempBag = [...this.state.bag];
    let tempIndex = this.state.bagIndex;
    let tempRng = this.createSeededRng(this.state.seed + this.state.history.length);

    for (let i = 0; i < count; i++) {
      if (tempIndex >= tempBag.length) {
        // Simulate bag refill
        const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        for (let j = pieces.length - 1; j > 0; j--) {
          const k = Math.floor(tempRng() * (j + 1));
          [pieces[j], pieces[k]] = [pieces[k], pieces[j]];
        }
        tempBag = pieces;
        tempIndex = 0;
      }

      preview.push(tempBag[tempIndex]);
      tempIndex++;
    }

    return preview;
  }

  getSeed(): string {
    return this.state.seed;
  }

  getState(): RngState {
    return {
      ...this.state,
      bag: [...this.state.bag],
      history: [...this.state.history],
    };
  }

  setState(state: RngState): void {
    this.state = {
      ...state,
      bag: [...state.bag],
      history: [...state.history],
    };
    this.seedRng = this.createSeededRng(this.state.seed);
  }

  reset(seed?: string): void {
    this.state = {
      seed: seed || this.generateSeed(),
      bag: [],
      bagIndex: 0,
      history: [],
    };
    this.seedRng = this.createSeededRng(this.state.seed);
    this.refillBag();
  }
}