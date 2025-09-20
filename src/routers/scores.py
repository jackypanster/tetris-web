"""Scores API endpoints."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse
from ..models import (
    Score, ScoreInput, ScoreWindow, ScoreBatchInput, ScoreBatchResult,
    RetentionPolicy, ErrorResponse
)
from ..services.score_service import ScoreService

router = APIRouter()
score_service = ScoreService()


@router.get("", response_model=ScoreWindow)
async def list_scores(
    limit: int = Query(default=10, ge=1, le=100, description="Maximum number of records to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor from a previous response"),
    since: Optional[datetime] = Query(None, description="Return scores created at or after this timestamp")
):
    """List leaderboard scores.

    Return the most recent high score entries ordered by points descending
    then creation time descending. Supports cursor-based pagination and
    optional freshness filters.
    """
    try:
        scores = await score_service.get_top_scores(limit=limit, cursor=cursor, since=since)

        # Default retention policy
        retention = RetentionPolicy(days=14, max_records=100)

        return ScoreWindow(
            generated_at=datetime.utcnow(),
            retention=retention,
            next_cursor=None,  # Simplified - would implement proper cursor logic
            items=scores
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scores"
        )


@router.post("", response_model=Score, status_code=status.HTTP_201_CREATED)
async def submit_score(score_input: ScoreInput):
    """Submit a single score.

    Store a new score for a nickname. Clients should deduplicate submissions
    locally. The server may flag suspicious records and omit them from
    ranking.
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


@router.post("/bulk", response_model=ScoreBatchResult, status_code=status.HTTP_207_MULTI_STATUS)
async def submit_scores_bulk(batch_input: ScoreBatchInput):
    """Submit multiple scores.

    Upload up to 50 queued scores in one request. Each item is validated
    independently; the response details successes and failures.
    """
    try:
        if len(batch_input.items) > 50:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Batch size exceeds maximum of 50 items"
            )

        result = await score_service.create_scores_bulk(batch_input)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process bulk submission"
        )