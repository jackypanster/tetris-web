# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern, offline-first Tetris web game with a FastAPI backend for leaderboard management. The project emphasizes competitive gameplay mechanics, progressive enhancement, and comprehensive offline functionality.

## Development Commands

### Quick Development Setup
```bash
# Full development stack (both frontend and backend)
make dev

# Backend only
uv sync --extra dev
uv run fastapi dev src/main.py --reload

# Frontend only
cd web/
pnpm install
pnpm run dev
```

### Quality Gates
```bash
# Run all checks (linting, type checking, tests, build)
make gate

# Individual frontend tasks
cd web/
pnpm run lint          # ESLint with TypeScript
pnpm run type-check    # TypeScript compiler
pnpm run test          # Vitest unit tests
pnpm run test:coverage # Coverage report
pnpm run build         # Production build

# Individual backend tasks
uv run ruff check src     # Python linting
uv run mypy src           # Type checking
uv run pytest            # Unit tests
```

### API Development
```bash
# Generate TypeScript types from OpenAPI spec
cd web/
pnpm run generate:api

# Backend with auto-reload
uv run fastapi dev src/main.py --reload
```

## Architecture Overview

### Frontend (web/)
- **Framework**: Vanilla TypeScript with Vite build system
- **State Management**: RxJS-based reactive store with time-travel debugging
- **Rendering**: Canvas 2D API with 60 FPS game loop
- **Offline**: Service Worker + IndexedDB for score queueing
- **Architecture Pattern**: Layered with clear separation:
  - `core/`: Game logic (board, pieces, scoring, RNG)
  - `render/`: Canvas rendering and HUD systems
  - `input/`: Keyboard handling with DAS/ARR mechanics
  - `state/`: Centralized app state with RxJS
  - `net/`: API client with offline queue management
  - `ui/`: App orchestration and UI panels

### Backend (src/)
- **Framework**: FastAPI with Pydantic models
- **Architecture**: Clean layered architecture:
  - `routers/`: HTTP endpoints with rate limiting
  - `services/`: Business logic layer
  - `models.py`: Pydantic data models with OpenAPI integration
- **Features**: Score retention, validation, bulk uploads, client metadata tracking

### Key Architectural Patterns

1. **Offline-First Design**: Frontend queues scores locally using IndexedDB and syncs when connectivity returns
2. **Reactive State**: RxJS BehaviorSubject-based store with immutable state updates
3. **Game Loop Architecture**: 60 FPS requestAnimationFrame loop with delta time calculations
4. **Input Buffer System**: Queued input processing to prevent dropped commands during frame processing
5. **Modular Game Core**: Tetris logic separated into reusable modules (board, pieces, scoring, RNG)

## Frontend Development Guidelines

### Game Logic Structure
- Game state machine: `menu → spawning → active → lockDelay → clearing → gameOver`
- All game logic is deterministic and testable in isolation
- Use `GameEngine` class for state management, not direct game object manipulation

### State Management
- Use `AppStore` for all application state
- Dispatch actions through `store.dispatch()`, never mutate state directly
- Subscribe to state changes via `store.getState$()` observable
- Settings are automatically persisted to localStorage

### Rendering System
- `CanvasRenderer` handles game board and pieces
- `HUD` manages UI overlays and information display
- Both systems consume `GameSnapshot` for consistent rendering state
- Maintain 60 FPS by keeping render operations lightweight

### Input Handling
- `KeyboardInput` manages DAS (Delayed Auto Shift) and ARR (Auto Repeat Rate)
- Input is buffered and processed during game loop to prevent timing issues
- Key bindings are configurable and persisted

### Network Layer
- `ScoreClient` handles API communication with automatic retry logic
- `OfflineScoreQueue` manages local score storage using IndexedDB
- Scores are queued offline and synced when connectivity returns
- Always handle network failures gracefully

## Backend Development Guidelines

### API Design
- Follow OpenAPI specification in `docs/openapi.yaml` exactly
- Use Pydantic models for all request/response validation
- Implement proper rate limiting on all endpoints
- Support both single and batch score submissions

### Data Models
- All models use `alias` for camelCase/snake_case conversion
- Score validation ensures data integrity (points ≥ 0, reasonable durations)
- Client metadata tracking for analytics and abuse detection

### Testing Strategy
- Frontend: Unit tests with Vitest, focus on game logic and state management
- Backend: Pytest with async support, test business logic and API contracts
- Maintain >80% test coverage on core game logic
- Use dependency injection for testable components

## Common Development Tasks

### Adding New Game Features
1. Implement logic in appropriate `core/` module
2. Update `GameSnapshot` interface if needed
3. Add rendering support in `CanvasRenderer` or `HUD`
4. Update input handling in `KeyboardInput` if needed
5. Add tests for new functionality

### API Changes
1. Update `docs/openapi.yaml` first
2. Regenerate TypeScript types: `pnpm run generate:api`
3. Implement backend changes in `routers/` and `services/`
4. Update frontend `ScoreClient` if needed
5. Ensure backward compatibility for offline scores

### Performance Optimization
- Profile with browser DevTools, focus on 16ms frame budget
- Game logic should complete in <1ms per frame
- Rendering optimizations: minimize canvas operations, use sprite caching
- Network: batch API calls, implement exponential backoff

## Development Workflow

1. **Quality First**: Always run `make gate` before committing
2. **Incremental Development**: Keep changes small and focused
3. **Test Coverage**: Maintain test coverage especially for game logic
4. **Offline Support**: Test all features in offline/online mode transitions
5. **Performance**: Monitor frame timing and API response times

## Configuration Notes

- **Frontend**: Settings stored in localStorage, configurable via in-game UI
- **Backend**: Environment variables for rate limits, retention policies
- **Build**: Vite for frontend, uv for Python dependency management
- **Deployment**: Backend serves frontend static files in production

## Important Constraints

- **Frame Budget**: 16ms max per frame for 60 FPS gameplay
- **API Rate Limits**: 30 requests/minute per client
- **Score Retention**: 14 days default (configurable)
- **Offline Storage**: IndexedDB for score queue, localStorage for settings
- **Browser Support**: Chrome 110+, Firefox 110+, Safari 16+