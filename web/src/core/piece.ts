/**
 * Tetris piece definitions, rotation system, and wall kick logic
 */

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type RotationState = 0 | 1 | 2 | 3;

export interface Position {
  x: number;
  y: number;
}

export interface PieceDefinition {
  type: PieceType;
  states: Position[][];
  color: number;
}

export interface Piece {
  type: PieceType;
  x: number;
  y: number;
  rotation: RotationState;
}

// Standard SRS piece definitions
export const PIECE_DEFINITIONS: Record<PieceType, PieceDefinition> = {
  I: {
    type: 'I',
    color: 1,
    states: [
      [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      [{ x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
      [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
      [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    ],
  },
  O: {
    type: 'O',
    color: 2,
    states: [
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    ],
  },
  T: {
    type: 'T',
    color: 3,
    states: [
      [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
      [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }],
      [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
      [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }],
    ],
  },
  S: {
    type: 'S',
    color: 4,
    states: [
      [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -1 }, { x: 1, y: -1 }],
      [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
      [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
      [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
    ],
  },
  Z: {
    type: 'Z',
    color: 5,
    states: [
      [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
      [{ x: 1, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
      [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }],
    ],
  },
  J: {
    type: 'J',
    color: 6,
    states: [
      [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
      [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
      [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
      [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 1 }],
    ],
  },
  L: {
    type: 'L',
    color: 7,
    states: [
      [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }],
      [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
      [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
    ],
  },
};

// SRS Wall Kick data
export const WALL_KICK_DATA: Record<string, Position[]> = {
  // Standard pieces (J, L, S, T, Z)
  '0->1': [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '1->0': [{ x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '1->2': [{ x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '2->1': [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '2->3': [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '3->2': [{ x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '3->0': [{ x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '0->3': [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],

  // I piece
  'I_0->1': [{ x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
  'I_1->0': [{ x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
  'I_1->2': [{ x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
  'I_2->1': [{ x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
  'I_2->3': [{ x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
  'I_3->2': [{ x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
  'I_3->0': [{ x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
  'I_0->3': [{ x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
};

export function createPiece(type: PieceType, x: number = 4, y: number = 0): Piece {
  return {
    type,
    x,
    y,
    rotation: 0,
  };
}

export function getPieceBlocks(piece: Piece): Position[] {
  const definition = PIECE_DEFINITIONS[piece.type];
  const state = definition.states[piece.rotation];

  return state.map(offset => ({
    x: piece.x + offset.x,
    y: piece.y + offset.y,
  }));
}

export function rotatePiece(piece: Piece, clockwise: boolean = true): Piece {
  const newRotation = clockwise
    ? ((piece.rotation + 1) % 4) as RotationState
    : ((piece.rotation + 3) % 4) as RotationState;

  return {
    ...piece,
    rotation: newRotation,
  };
}

export function getWallKickTests(piece: Piece, newRotation: RotationState): Position[] {
  const fromRotation = piece.rotation;
  const key = piece.type === 'I'
    ? `I_${fromRotation}->${newRotation}`
    : `${fromRotation}->${newRotation}`;

  return WALL_KICK_DATA[key] || [];
}

export function rotate180(piece: Piece): Piece {
  const newRotation = ((piece.rotation + 2) % 4) as RotationState;
  return {
    ...piece,
    rotation: newRotation,
  };
}