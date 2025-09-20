"""In-memory score repository implementation."""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4

from ..models import Score, ScoreInput


class MemoryScoreRepository:
    """Simple in-memory storage for scores."""

    def __init__(self) -> None:
        self._scores: List[Score] = []

    async def create(self, score_input: ScoreInput) -> Score:
        """Create a new score record."""
        score = Score.model_construct(
            id=str(uuid4()),
            nickname=score_input.nickname,
            points=score_input.points,
            lines=score_input.lines or 0,
            level_reached=score_input.level_reached or 0,
            duration_seconds=score_input.duration_seconds or 0,
            seed=score_input.seed,
            created_at=datetime.utcnow(),
            suspect=False,
            client=score_input.client,
            tags=score_input.tags or []
        )
        self._scores.append(score)
        return score

    async def list_scores(
        self,
        limit: int = 10,
        cursor: Optional[str] = None,
        since: Optional[datetime] = None
    ) -> List[Score]:
        """List scores with optional filtering and pagination."""
        # Filter by since timestamp if provided
        filtered_scores = self._scores
        if since:
            filtered_scores = [s for s in filtered_scores if s.created_at >= since]

        # Sort by points descending, then by creation time descending
        filtered_scores.sort(key=lambda s: (s.points, s.created_at), reverse=True)

        # Simple cursor-based pagination (using index for simplicity)
        start_idx = 0
        if cursor:
            try:
                start_idx = int(cursor)
            except ValueError:
                start_idx = 0

        return filtered_scores[start_idx:start_idx + limit]

    async def count(self) -> int:
        """Get total number of scores."""
        return len(self._scores)

    async def cleanup_old_scores(self, retention_days: int, max_records: int) -> None:
        """Remove old scores based on retention policy."""
        sorted_scores = sorted(self._scores, key=lambda s: s.created_at, reverse=True)

        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        kept_scores: List[Score] = []
        for index, score in enumerate(sorted_scores):
            if index < max_records or score.created_at >= cutoff_date:
                kept_scores.append(score)

        self._scores = kept_scores
