// CONTRACT: PRD §5

import { describe, it, expect } from 'vitest';

// TODO: Implement Bag-7 RNG tests
// See: https://harddrop.com/wiki/Random_Generator
describe('Bag-7 Random Generator', () => {
  it.todo('should generate all 7 unique pieces in the first 7 calls', () => {
    // const rng = new Bag7Rng('some-seed');
    // const pieces = Array.from({ length: 7 }, () => rng.next());
    // const uniquePieces = new Set(pieces.map(p => p.type));
    // expect(uniquePieces.size).toBe(7);
  });

  it.todo('should generate two full sets of 7 unique pieces within 14 calls', () => {
    // const rng = new Bag7Rng('another-seed');
    // const pieces = Array.from({ length: 14 }, () => rng.next());
    // const firstBag = new Set(pieces.slice(0, 7).map(p => p.type));
    // const secondBag = new Set(pieces.slice(7, 14).map(p => p.type));
    // expect(firstBag.size).toBe(7);
    // expect(secondBag.size).toBe(7);
  });
});
