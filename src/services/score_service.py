"""Score business logic service."""

import uuid
from datetime import datetime
from typing import List
from ..models import Score, ScoreInput


class ScoreService:
    """Service for managing score operations."""

    def __init__(self):
        # In-memory storage for now
        self._scores: List[Score] = []

    async def get_top_scores(self, limit: int = 10) -> List[Score]:
        """Get top scores ordered by points desc, then created_at desc."""
        sorted_scores = sorted(
            self._scores,
            key=lambda s: (-s.points, -s.created_at.timestamp())
        )
        return sorted_scores[:limit]

    async def create_score(self, score_input: ScoreInput) -> Score:
        """Create a new score entry."""
        score = Score(
            id=str(uuid.uuid4()),
            nickname=score_input.nickname,
            points=score_input.points,
            created_at=datetime.utcnow(),
            client=score_input.client
        )

        self._scores.append(score)
        return score