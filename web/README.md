# Tetris Web Frontend

TypeScript + Vite frontend for the Tetris Web game.

## Quick Start

```bash
pnpm install
pnpm run dev
```

## Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run test` - Run unit tests
- `pnpm run test:coverage` - Run tests with coverage
- `pnpm run lint` - Lint TypeScript files
- `pnpm run lint:fix` - Fix linting issues
- `pnpm run format` - Format code with Prettier
- `pnpm run type-check` - Type check without emitting
- `pnpm run generate:api` - Generate API types from OpenAPI spec

## Architecture

### Core Modules (`src/core/`)
- `board.ts` - Game board state and line clearing
- `piece.ts` - Tetromino definitions and rotation
- `rng.ts` - Bag-7 randomizer with seedable RNG
- `scoring.ts` - Score calculation and combo tracking
- `game.ts` - Main game state machine

### Input Handling (`src/input/`)
- `keyboard.ts` - Keyboard input with DAS/ARR support
- Custom key binding support with LocalStorage persistence

### Rendering (`src/render/`)
- `canvas_renderer.ts` - High-performance Canvas 2D rendering
- `hud.ts` - HUD overlay and UI elements
- Support for high-DPI displays

### State Management (`src/state/`)
- `store.ts` - Centralized game state with RxJS
- `persist.ts` - LocalStorage/IndexedDB persistence layer

### Networking (`src/net/`)
- `score-client.ts` - HTTP client for score submission
- `types.ts` - Auto-generated types from OpenAPI spec
- Offline queue with automatic retry logic

### UI Components (`src/ui/`)
- `App.ts` - Main application orchestrator
- `panels/Settings.ts` - Game settings configuration
- `panels/Leaderboard.ts` - Score leaderboard display

### Offline Support (`src/workers/`)
- `service-worker.ts` - PWA with offline score queuing
- Background sync for pending score submissions

### Analytics (`src/analytics/`)
- `events.ts` - Client-side event tracking
- Batched telemetry with local storage fallback

## Configuration

### Game Settings
Stored in browser LocalStorage and configurable via settings panel:
- DAS/ARR timing (50-500ms / 0-100ms)
- Lock delay (100-1000ms)
- Visual preferences (ghost piece, grid, brightness)
- Audio levels (music/SFX 0-100%)
- Accessibility options (color blind mode, reduced flashing)

### Development
- Vite configuration in `vite.config.ts`
- TypeScript configuration in `tsconfig.json`
- ESLint/Prettier configuration in package.json

## Type Generation

API types are generated from the OpenAPI specification:

```bash
pnpm run generate:api
```

This creates `src/net/types.ts` with TypeScript interfaces matching the backend contract.

## Testing

- **Unit Tests**: Vitest for core game logic
- **Coverage**: Target >80% line coverage, >70% branch coverage
- **Integration**: Playwright tests for full user flows (in parent project)

## Performance

- **Target**: <16ms frame time at 60 FPS
- **Rendering**: Canvas 2D with optimized draw calls
- **State**: Immutable updates with structural sharing
- **Networking**: Request batching and offline queuing

## Browser Support

- Chrome 110+
- Firefox 110+
- Safari 16+
- Modern ES2022 features with Vite transpilation