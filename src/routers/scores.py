"""Scores API endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse
from ..models import Score, ScoreInput, ScoreList
from ..services.score_service import ScoreService

router = APIRouter()
score_service = ScoreService()


@router.get("", response_model=ScoreList)
async def list_scores(
    limit: int = Query(default=10, ge=1, le=100, description="Maximum number of records to return")
):
    """List top scores.

    Return the most recent high score entries ordered by points
    descending then createdAt descending.
    """
    try:
        scores = await score_service.get_top_scores(limit=limit)
        return ScoreList(
            generated_at=datetime.utcnow(),
            items=scores
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scores"
        )


@router.post("", response_model=Score, status_code=status.HTTP_201_CREATED)
async def submit_score(score_input: ScoreInput):
    """Submit a score.

    Store a new score for a nickname; duplicate submissions should
    be handled client-side.
    """
    try:
        score = await score_service.create_score(score_input)
        return score
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit score"
        )