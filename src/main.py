"""Tetris Web Highscore API

FastAPI service that stores short-lived Tetris high scores.
"""

from fastapi import FastAPI

from .routers import scores

app = FastAPI(
    title="Tetris Web Highscore API",
    version="0.3.0",
    description="Offline-first leaderboard service for the Tetris Web project. "
                "Clients queue submissions locally and resync when connectivity returns. "
                "Rate limiting and validation protect shared resources."
)

app.include_router(scores.router, prefix="/scores", tags=["Scores"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
