"""Score business logic service."""

from datetime import datetime
from typing import List, Optional

from ..models import Score, ScoreBatchInput, ScoreBatchResult, ScoreInput, ScoreRejection
from ..repositories.base import ScoreRepository
from ..repositories.memory import MemoryScoreRepository


class ScoreService:
    """Service for managing score operations."""

    def __init__(self, repository: Optional[ScoreRepository] = None) -> None:
        self._repository = repository or MemoryScoreRepository()

    async def get_top_scores(
        self,
        limit: int = 10,
        cursor: Optional[str] = None,
        since: Optional[datetime] = None
    ) -> List[Score]:
        """Get top scores ordered by points desc, then created_at desc."""
        return await self._repository.get_scores(limit=limit, cursor=cursor, since=since)

    async def create_score(self, score_input: ScoreInput) -> Score:
        """Create a new score entry."""
        # Apply business rules validation
        await self._validate_score_input(score_input)

        # Use repository to create the score
        return await self._repository.create_score(score_input)

    async def _validate_score_input(self, score_input: ScoreInput) -> None:
        """Apply business validation rules."""
        # Validate nickname (can be expanded with banned words, etc.)
        if not score_input.nickname or len(score_input.nickname.strip()) == 0:
            raise ValueError("Nickname cannot be empty")

        # Detect suspect scores (basic heuristics)
        if score_input.points > 999999:  # Suspiciously high score
            # In a real implementation, this would mark as suspect rather than reject
            pass

        if score_input.duration_seconds and score_input.duration_seconds < 10 and score_input.points > 10000:
            # Very high score in very short time is suspicious
            pass

    async def create_scores_bulk(self, batch_input: ScoreBatchInput) -> ScoreBatchResult:
        """Create multiple score entries."""
        accepted: List[Score] = []
        rejected: List[ScoreRejection] = []

        for score_input in batch_input.items:
            try:
                # Comprehensive validation
                if not score_input.nickname or len(score_input.nickname.strip()) == 0:
                    rejected.append(ScoreRejection(
                        reason="EMPTY_NICKNAME",
                        payload=score_input
                    ))
                    continue

                if len(score_input.nickname) > 16:
                    rejected.append(ScoreRejection(
                        reason="NICKNAME_TOO_LONG",
                        payload=score_input
                    ))
                    continue

                if score_input.points < 0:
                    rejected.append(ScoreRejection(
                        reason="INVALID_POINTS",
                        payload=score_input
                    ))
                    continue

                # Check for optional field validation
                if score_input.lines is not None and score_input.lines < 0:
                    rejected.append(ScoreRejection(
                        reason="INVALID_LINES",
                        payload=score_input
                    ))
                    continue

                if score_input.level_reached is not None and score_input.level_reached < 0:
                    rejected.append(ScoreRejection(
                        reason="INVALID_LEVEL",
                        payload=score_input
                    ))
                    continue

                if score_input.duration_seconds is not None and score_input.duration_seconds < 0:
                    rejected.append(ScoreRejection(
                        reason="INVALID_DURATION",
                        payload=score_input
                    ))
                    continue

                # Validate tags if present
                if score_input.tags and len(score_input.tags) > 5:
                    rejected.append(ScoreRejection(
                        reason="TOO_MANY_TAGS",
                        payload=score_input
                    ))
                    continue

                if score_input.tags:
                    for tag in score_input.tags:
                        if len(tag) > 24:
                            rejected.append(ScoreRejection(
                                reason="TAG_TOO_LONG",
                                payload=score_input
                            ))
                            break
                    else:
                        # No break occurred, validation passed
                        score = await self.create_score(score_input)
                        accepted.append(score)
                else:
                    # No tags to validate
                    score = await self.create_score(score_input)
                    accepted.append(score)

            except ValueError:
                rejected.append(ScoreRejection(
                    reason="VALIDATION_ERROR",
                    payload=score_input
                ))
            except Exception:
                rejected.append(ScoreRejection(
                    reason="PROCESSING_ERROR",
                    payload=score_input
                ))

        return ScoreBatchResult(accepted=accepted, rejected=rejected)
