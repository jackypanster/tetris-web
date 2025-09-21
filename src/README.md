# Tetris Web Backend

FastAPI backend service for score submission and leaderboard management.

## Quick Start

> Backend runtime is validated on Python 3.9.x only.
```bash
uv sync
uv run fastapi dev src/main.py --reload
```

## API Endpoints

### Scores
- `GET /scores` - List leaderboard scores with pagination
- `POST /scores` - Submit a single score
- `POST /scores/bulk` - Batch submit multiple scores

### Health & Metrics
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics (planned)

## Configuration

### Environment Variables

```bash
# Score retention policy
RETENTION_DAYS=14           # Days to keep scores (default: 14)
MAX_RECORDS=100             # Maximum records to keep (default: 100)

# Rate limiting
RATE_LIMIT_REQUESTS=30      # Requests per minute (default: 30)
RATE_LIMIT_WINDOW=60        # Window in seconds (default: 60)

# Batch processing
BATCH_SIZE_LIMIT=50         # Maximum scores per bulk request (default: 50)

# Server
LOG_LEVEL=INFO              # Logging level (default: INFO)
HOST=0.0.0.0               # Bind host (default: 0.0.0.0)
PORT=8000                  # Bind port (default: 8000)
```

## Architecture

### Core Components

**`main.py`**
- FastAPI application setup
- CORS configuration
- Route registration
- Startup/shutdown handlers

**`models.py`**
- Pydantic data models
- Request/response schemas
- Validation rules

### API Layer (`routers/`)

**`scores.py`**
- Score submission endpoints
- Input validation and sanitization
- Rate limiting integration
- Business logic delegation

### Service Layer (`services/`)

**`score_service.py`**
- Business logic for score management
- Repository abstraction
- Data validation and processing
- Retention policy enforcement

### Data Layer (`repositories/`)

**`memory.py`**
- In-memory score storage (default)
- Development and testing implementation

**`sqlite.py` (planned)**
- SQLite-based persistent storage
- Production deployment option

### Infrastructure

**Rate Limiting (`rate_limit/`)**
- Token bucket implementation
- Per-client rate limiting
- Configurable limits and windows

**Telemetry (`telemetry/`)**
- Server-side event collection
- Metrics aggregation
- Structured logging

## Data Models

### Score Input
```python
{
    "nickname": str,        # 1-16 characters
    "points": int,          # >= 0
    "lines": int,           # >= 0 (optional)
    "levelReached": int,    # >= 0 (optional)
    "durationSeconds": int, # >= 0 (optional)
    "seed": str,            # Optional game seed
    "tags": List[str],      # Max 5 tags (optional)
    "client": ClientInfo    # Client metadata (optional)
}
```

### Score Response
```python
{
    "id": str,              # Server-generated ID
    "nickname": str,        # Sanitized nickname
    "points": int,          # Final score
    "lines": int,           # Lines cleared
    "levelReached": int,    # Level reached
    "durationSeconds": int, # Game duration
    "seed": str,            # Game seed (optional)
    "createdAt": datetime,  # Server timestamp
    "suspect": bool,        # Flagged for review
    "client": ClientInfo,   # Client information
    "tags": List[str]       # Metadata tags
}
```

## Business Rules

### Score Validation
- Nickname: 1-16 characters, profanity filtering
- Points: Non-negative integer, anomaly detection
- Duration: Minimum time validation for score ranges
- Rate limiting: 30 requests/minute per client

### Retention Policy
- Keep scores for 14 days (configurable)
- Maintain top 100 scores regardless of age
- Automatic cleanup of old/excess records

### Fraud Detection
- Flag unrealistic time/score ratios
- Mark suspicious scores with `suspect: true`
- Exclude suspected scores from public leaderboards

## Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src

# Run specific test module
uv run pytest tests/test_scores.py
```

### Test Coverage
- Unit tests for all business logic
- Integration tests for API endpoints
- Mock external dependencies
- Target: >80% line coverage, >70% branch

## Development

### Code Quality
- **Ruff**: Fast Python linter and formatter
- **MyPy**: Static type checking
- **Pytest**: Test framework with fixtures
- **FastAPI**: Automatic API documentation

### Database Migrations
Currently using in-memory storage. Future SQLite implementation will include:
- Alembic for schema migrations
- Backup and restore utilities
- Data retention automation

## Deployment

### Local Development
```bash
uv run fastapi dev src/main.py --reload
```

### Production
```bash
# Using uvicorn directly
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000

# Using gunicorn (recommended)
uv run gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Docker (planned)
```dockerfile
FROM python:3.9-slim
COPY . /app
WORKDIR /app
RUN uv sync --locked
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0"]
```

## Monitoring

### Health Checks
- `GET /health` - Returns service status
- Database connectivity (when implemented)
- Dependency health checks

### Metrics (planned)
- Request count and latency
- Score submission rate
- Rate limiting triggers
- Error rates by endpoint

### Logging
- Structured JSON logs
- Request/response correlation IDs
- Performance metrics
- Security events
