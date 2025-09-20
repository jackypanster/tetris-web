"""Tetris Web Highscore API

FastAPI service that stores short-lived Tetris high scores.
"""

from fastapi import FastAPI
from .routers import scores

app = FastAPI(
    title="Tetris Web Highscore API",
    version="0.1.0",
    description="FastAPI service that stores short-lived Tetris high scores. "
                "Clients may run offline and resynchronise; rate limiting and "
                "input validation protect the shared leaderboard."
)

app.include_router(scores.router, prefix="/scores", tags=["Scores"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)