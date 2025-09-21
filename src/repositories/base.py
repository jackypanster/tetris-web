"""Base repository interface for score storage."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

from ..models import Score, ScoreInput


class ScoreRepository(ABC):
    """Abstract base class for score storage repositories."""

    @abstractmethod
    async def create_score(self, score_input: ScoreInput) -> Score:
        """Create and store a new score entry."""
        pass

    @abstractmethod
    async def get_scores(
        self,
        limit: int = 10,
        cursor: Optional[str] = None,
        since: Optional[datetime] = None
    ) -> list[Score]:
        """Retrieve scores with optional filtering and pagination."""
        pass

    @abstractmethod
    async def get_score_count(self) -> int:
        """Get total number of stored scores."""
        pass

    @abstractmethod
    async def cleanup_old_scores(self, retention_days: int = 14, max_records: int = 100) -> int:
        """Remove old scores based on retention policy. Returns number of removed scores."""
        pass
