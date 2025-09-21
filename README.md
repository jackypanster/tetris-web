# Tetris Web

A modern, offline-first Tetris implementation with 60 FPS gameplay, competitive scoring, and seamless online synchronization.

## Features

- **Instant Loading**: Sub-1-second load times with offline-first architecture
- **Competitive Controls**: Configurable DAS/ARR, lock delay, and 180° rotation support
- **Smart Leaderboards**: Offline score queueing with automatic sync when online
- **Accessibility**: Color-blind support, reduced flashing, customizable audio
- **Progressive Enhancement**: Full functionality with or without network connectivity

## Quick Start

### Development

**Frontend:**
```bash
cd web/
pnpm install
pnpm run dev
```

**Backend:**
> Runtime target: Python 3.9.x (other versions are unsupported)
```bash
uv sync
uv run fastapi dev src/main.py --reload
```

**Full Development Stack:**
```bash
make dev  # Starts both frontend and backend
```

### Testing

```bash
make gate    # Run all linting, type checking, and tests
make test    # Run tests only
```

### Production Build

```bash
make build   # Build optimized frontend and backend
```

## Architecture

- **Frontend**: TypeScript + Vite + Canvas 2D rendering
- **Backend**: FastAPI + Pydantic + pluggable storage
- **Offline**: Service Worker + IndexedDB for score queuing
- **Testing**: Vitest (frontend) + Pytest (backend) + Playwright (E2E)

## Game Features

### Core Gameplay
- Standard Tetris mechanics with Bag-7 randomizer
- Simplified SRS rotation system with wall kicks
- Configurable lock delay (100-1000ms), DAS, and ARR
- Real-time ghost piece and next queue display

### Scoring System
- Standard line clear scoring (single/double/triple/tetris)
- Back-to-back bonus (+50%) and combo multipliers
- Perfect Clear detection (1800 bonus points)
- Speed progression every 10 lines cleared

### Controls
- **Movement**: Arrow keys or WASD
- **Rotation**: Z/X for counter/clockwise, A for 180° (optional)
- **Actions**: Space for hard drop, Shift for hold
- **System**: P for pause, ESC for settings

## API Contract

The backend follows the OpenAPI specification in `docs/openapi.yaml`:

- `GET /scores` - Retrieve leaderboard with pagination
- `POST /scores` - Submit single score
- `POST /scores/bulk` - Batch upload queued scores

Rate limiting: 30 requests/minute per client with exponential backoff.

## Configuration

### Environment Variables

**Backend:**
```bash
MAX_LIMIT=100           # Maximum scores per request
RETENTION_DAYS=14       # Score retention policy
BATCH_SIZE_LIMIT=50     # Max scores per bulk upload
LOG_LEVEL=INFO          # Logging verbosity
```

**Frontend:**
All settings are stored in browser LocalStorage/IndexedDB and configurable via in-game settings panel.

## Project Structure

```
tetris-web/
├── docs/                   # Documentation and contracts
│   ├── PRD.md             # Product requirements
│   ├── ARCH.md            # Architecture design
│   └── openapi.yaml       # API specification
├── web/                   # Frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── core/          # Game logic and state
│   │   ├── render/        # Canvas rendering and HUD
│   │   ├── input/         # Keyboard and gamepad input
│   │   ├── net/           # API client and type generation
│   │   ├── state/         # Store and persistence
│   │   ├── ui/            # App orchestration and panels
│   │   ├── workers/       # Service Worker for offline
│   │   └── analytics/     # Event tracking
│   └── package.json
├── src/                   # Backend (FastAPI + Python)
│   ├── routers/           # API endpoints
│   ├── services/          # Business logic
│   ├── repositories/      # Data persistence
│   ├── rate_limit/        # Rate limiting utilities
│   ├── telemetry/         # Server-side analytics
│   └── models.py          # Pydantic data models
├── tools/                 # Build and automation scripts
├── Makefile              # Development workflow
└── pyproject.toml        # Python dependencies
```

## Development Workflow

1. **Planning**: Update `docs/` with requirements changes
2. **Implementation**: Follow architecture patterns in respective modules
3. **Testing**: Maintain >80% unit coverage, >70% branch coverage
4. **Integration**: Use `make gate` before commits
5. **Documentation**: Auto-generate API docs from OpenAPI spec

## Quality Gates

- **Frontend**: ESLint + Prettier + TypeScript + Vitest
- **Backend**: Ruff + MyPy + Pytest + FastAPI validation
- **Performance**: <16ms frame time, <100ms API response (P95)
- **Compatibility**: Chrome 110+, Firefox 110+, Safari 16+

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Follow the development workflow above
4. Submit a pull request with clear description

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: Bug reports and feature requests
- Documentation: See `docs/` directory for detailed specifications
- Development: Use `make help` for available commands
