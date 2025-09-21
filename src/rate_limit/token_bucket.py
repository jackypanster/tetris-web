"""Simple token bucket rate limiter implementation."""

import time
from typing import Dict, Tuple


class TokenBucket:
    """Token bucket rate limiter for API endpoints."""

    def __init__(self, max_tokens: int = 30, refill_rate: float = 0.5):
        """Initialize token bucket.

        Args:
            max_tokens: Maximum number of tokens in bucket
            refill_rate: Tokens per second refill rate
        """
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self.tokens = float(max_tokens)
        self.last_refill = time.time()

    def _refill(self) -> None:
        """Refill tokens based on time elapsed."""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens from bucket.

        Returns:
            True if tokens were consumed, False if rate limited
        """
        self._refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    def get_wait_time(self, tokens: int = 1) -> float:
        """Get seconds to wait before tokens would be available."""
        self._refill()
        if self.tokens >= tokens:
            return 0.0

        needed_tokens = tokens - self.tokens
        return needed_tokens / self.refill_rate


class RateLimiter:
    """Rate limiter using token buckets per client identifier."""

    def __init__(self, max_tokens: int = 30, refill_rate: float = 0.5):
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self._buckets: Dict[str, TokenBucket] = {}

    def check_rate_limit(self, client_id: str, tokens: int = 1) -> Tuple[bool, float]:
        """Check if client can proceed or should be rate limited.

        Returns:
            (allowed, retry_after_seconds)
        """
        if client_id not in self._buckets:
            self._buckets[client_id] = TokenBucket(self.max_tokens, self.refill_rate)

        bucket = self._buckets[client_id]

        if bucket.consume(tokens):
            return True, 0.0
        else:
            retry_after = bucket.get_wait_time(tokens)
            return False, retry_after

    def get_remaining_tokens(self, client_id: str) -> int:
        """Get remaining tokens for a client."""
        if client_id not in self._buckets:
            return self.max_tokens

        bucket = self._buckets[client_id]
        bucket._refill()
        return int(bucket.tokens)
