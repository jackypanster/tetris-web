"""Scores API endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from ..models import (
    RetentionPolicy,
    Score,
    ScoreBatchInput,
    ScoreBatchResult,
    ScoreInput,
    ScoreWindow,
)
from ..rate_limit import RateLimiter
from ..services.score_service import ScoreService

router = APIRouter()
score_service = ScoreService()
rate_limiter = RateLimiter(max_tokens=30, refill_rate=0.5)  # 30 requests per minute


def check_rate_limit(request: Request, response: Response) -> None:
    """Check rate limit and set headers. Raises HTTPException if rate limited."""
    client_id = request.client.host if request.client else "unknown"
    allowed, retry_after = rate_limiter.check_rate_limit(client_id)

    # Set rate limit headers
    response.headers["X-RateLimit-Limit"] = "30"
    response.headers["X-RateLimit-Remaining"] = str(rate_limiter.get_remaining_tokens(client_id))
    response.headers["X-RateLimit-Reset"] = str(int(retry_after) + 60)

    if not allowed:
        response.headers["Retry-After"] = str(int(retry_after))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests; caller should back off before retrying.",
            headers={"Retry-After": str(int(retry_after))}
        )


@router.get("", response_model=ScoreWindow)
async def list_scores(
    request: Request,
    response: Response,
    limit: int = Query(default=10, ge=1, le=100, description="Maximum number of records to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor from a previous response"),
    since: Optional[datetime] = Query(None, description="Return scores created at or after this timestamp")
) -> ScoreWindow:
    """List leaderboard scores.

    Return the most recent high score entries ordered by points descending
    then creation time descending. Supports cursor-based pagination and
    optional freshness filters.
    """
    # Apply rate limiting
    check_rate_limit(request, response)

    try:
        scores = await score_service.get_top_scores(limit=limit, cursor=cursor, since=since)

        # Default retention policy
        retention = RetentionPolicy.model_construct(days=14, max_records=100)

        return ScoreWindow.model_construct(
            generated_at=datetime.utcnow(),
            retention=retention,
            next_cursor=None,  # Simplified - would implement proper cursor logic
            items=scores
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scores"
        ) from exc


@router.post("", response_model=Score, status_code=status.HTTP_201_CREATED)
async def submit_score(score_input: ScoreInput, request: Request, response: Response) -> Score:
    """Submit a single score.

    Store a new score for a nickname. Clients should deduplicate submissions
    locally. The server may flag suspicious records and omit them from
    ranking.
    """
    # Apply rate limiting
    check_rate_limit(request, response)

    try:
        score = await score_service.create_score(score_input)
        return score
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit score"
        ) from exc


@router.post("/bulk", response_model=ScoreBatchResult, status_code=status.HTTP_207_MULTI_STATUS)
async def submit_scores_bulk(batch_input: ScoreBatchInput, request: Request, response: Response) -> ScoreBatchResult:
    """Submit multiple scores.

    Upload up to 50 queued scores in one request. Each item is validated
    independently; the response details successes and failures.
    """
    # Apply rate limiting
    check_rate_limit(request, response)

    try:
        result = await score_service.create_scores_bulk(batch_input)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process bulk submission"
        ) from exc
