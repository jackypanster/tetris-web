"""Tetris Web Highscore API

FastAPI service that stores short-lived Tetris high scores.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import scores

app = FastAPI(
    title="Tetris Web Highscore API",
    version="0.3.0",
    description="Offline-first leaderboard service for the Tetris Web project. "
                "Clients queue submissions locally and resync when connectivity returns. "
                "Rate limiting and validation protect shared resources."
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend dev servers
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(scores.router, prefix="/scores", tags=["Scores"])


@app.get("/healthz")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "tetris-highscore-api", "version": "0.3.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
