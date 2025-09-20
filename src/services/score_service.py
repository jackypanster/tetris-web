"""Score business logic service."""

from datetime import datetime
from typing import List, Optional

import uuid

from ..models import Score, ScoreBatchInput, ScoreBatchResult, ScoreInput, ScoreRejection


class ScoreService:
    """Service for managing score operations."""

    def __init__(self) -> None:
        # In-memory storage for now
        self._scores: List[Score] = []

    async def get_top_scores(
        self,
        limit: int = 10,
        cursor: Optional[str] = None,
        since: Optional[datetime] = None
    ) -> List[Score]:
        """Get top scores ordered by points desc, then created_at desc."""
        filtered_scores = self._scores

        # Apply since filter
        if since:
            filtered_scores = [s for s in filtered_scores if s.created_at >= since]

        # Sort scores
        sorted_scores = sorted(
            filtered_scores,
            key=lambda s: (-s.points, -s.created_at.timestamp())
        )

        # Apply cursor pagination (simplified - would need proper implementation)
        if cursor:
            # In a real implementation, cursor would encode position
            # For now, we'll just start from beginning
            pass

        return sorted_scores[:limit]

    async def create_score(self, score_input: ScoreInput) -> Score:
        """Create a new score entry."""
        score = Score.model_construct(
            id=str(uuid.uuid4()),
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

    async def create_scores_bulk(self, batch_input: ScoreBatchInput) -> ScoreBatchResult:
        """Create multiple score entries."""
        accepted: List[Score] = []
        rejected: List[ScoreRejection] = []

        for score_input in batch_input.items:
            try:
                # Basic validation - could be expanded
                if not score_input.nickname or len(score_input.nickname) > 16:
                    rejected.append(ScoreRejection(
                        reason="INVALID_NICKNAME",
                        payload=score_input
                    ))
                    continue

                if score_input.points < 0:
                    rejected.append(ScoreRejection(
                        reason="INVALID_POINTS",
                        payload=score_input
                    ))
                    continue

                score = await self.create_score(score_input)
                accepted.append(score)

            except Exception:
                rejected.append(ScoreRejection(
                    reason="PROCESSING_ERROR",
                    payload=score_input
                ))

        return ScoreBatchResult(accepted=accepted, rejected=rejected)
