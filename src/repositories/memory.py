"""In-memory score repository implementation."""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from ..models import Score, ScoreInput


class MemoryScoreRepository:
    """Simple in-memory storage for scores."""

    def __init__(self):
        self._scores: List[Score] = []

    async def create(self, score_input: ScoreInput) -> Score:
        """Create a new score record."""
        score = Score(
            id=str(uuid4()),
            nickname=score_input.nickname,
            points=score_input.points,
            lines=score_input.lines or 0,
            levelReached=score_input.levelReached or 0,
            durationSeconds=score_input.durationSeconds or 0,
            seed=score_input.seed,
            createdAt=datetime.utcnow(),
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
            filtered_scores = [s for s in filtered_scores if s.createdAt >= since]

        # Sort by points descending, then by creation time descending
        filtered_scores.sort(key=lambda s: (s.points, s.createdAt), reverse=True)

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

    async def cleanup_old_scores(self, retention_days: int, max_records: int):
        """Remove old scores based on retention policy."""
        # Keep only the most recent scores within limits
        sorted_scores = sorted(self._scores, key=lambda s: s.createdAt, reverse=True)

        # Apply retention policies
        cutoff_date = datetime.utcnow().replace(microsecond=0)
        cutoff_date = cutoff_date.replace(day=cutoff_date.day - retention_days)

        # Keep scores that are either recent or in top records
        kept_scores = []
        for i, score in enumerate(sorted_scores):
            if i < max_records or score.createdAt >= cutoff_date:
                kept_scores.append(score)

        self._scores = kept_scores