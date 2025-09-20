# Gemini Agent Context: tetris-web

This document provides a comprehensive overview of the `tetris-web` project, a modern, offline-first Tetris implementation. It is intended to be used as a contextual guide for the Gemini AI agent.

## Project Overview

`tetris-web` is a full-stack application featuring a sophisticated Tetris game.

- **Frontend**: A high-performance, offline-first Single Page Application (SPA) built with **TypeScript** and **Vite**. It uses the **Canvas API** for rendering game elements and is designed for competitive play with features like configurable controls and a Bag-7 randomizer. The frontend is responsible for all core game logic, state management, and user interface. It uses a **Service Worker** to provide offline capabilities, caching assets and queueing score submissions.

- **Backend**: A lightweight API service built with **Python** and **FastAPI**. Its primary role is to manage a high-score leaderboard. It uses **Pydantic** for data validation and is designed to be stateless and easily scalable. The initial implementation uses an in-memory repository for scores, with plans to support persistent storage like SQLite.

- **Architecture**: The system is decoupled, with the frontend handling the majority of the application's complexity. The backend serves as a simple persistence layer for scores. The API contract is formally defined in an **OpenAPI specification**, which is used to generate TypeScript types for the frontend, ensuring consistency between the client and server.

## Key Files and Directories

- `web/`: Contains the frontend application source code.
  - `web/src/core/`: The core game logic (board, pieces, scoring, etc.).
  - `web/src/render/`: Canvas rendering logic.
  - `web/src/net/`: API client for communicating with the backend.
  - `web/src/workers/`: The Service Worker implementation for offline support.
  - `web/package.json`: Frontend dependencies and scripts.
- `src/`: Contains the backend application source code.
  - `src/routers/`: API endpoint definitions.
  - `src/services/`: Business logic for handling scores.
  - `src/repositories/`: Data storage abstractions.
  - `pyproject.toml`: Backend dependencies and project configuration.
- `docs/`: Contains project documentation.
  - `docs/ARCH.md`: A detailed description of the system architecture.
  - `docs/openapi.yaml`: The OpenAPI specification for the backend API.
- `Makefile`: Provides a set of commands for building, running, and testing the project.

## Building and Running

The project uses a `Makefile` to streamline common development tasks.

### Development

- **Start both frontend and backend:**
  ```bash
  make dev
  ```

- **Start frontend only:**
  ```bash
  cd web/
  pnpm install
  pnpm run dev
  ```

- **Start backend only:**
  ```bash
  uv sync
  uv run fastapi dev src/main.py --reload
  ```

### Testing

- **Run all quality checks (linting, type-checking, and tests):**
  ```bash
  make gate
  ```

- **Run tests only:**
  ```bash
  make test
  ```

## Development Conventions

- **API-Driven Development**: The `docs/openapi.yaml` file is the single source of truth for the API contract. The frontend's API client types are generated from this file using `pnpm run generate:api`.
- **Quality Gates**: The `make gate` command should be run before committing changes. It enforces code style and runs all tests for both the frontend and backend.
- **Testing**: The project has a comprehensive testing strategy:
  - **Frontend**: Unit tests are written with **Vitest**.
  - **Backend**: Unit and integration tests are written with **Pytest**.
  - **End-to-End**: E2E tests are handled by **Playwright**.
- **AI-Assisted Workflow**: The `Makefile` includes several targets (`plan`, `skeleton`, `tests`, `impl`, `review`, `docs`, `accept`) that suggest a development workflow leveraging AI agents for various tasks, from planning and scaffolding to implementation and review.
