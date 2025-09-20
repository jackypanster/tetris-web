"""Data models for Tetris scores."""

from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, Field


class ClientInfo(BaseModel):
    """Client metadata."""
    version: Optional[str] = Field(None, description="Client build identifier (semver or hash)")
    platform: Optional[str] = Field(None, description="Simplified device/platform identifier")
    ua: Optional[str] = Field(None, max_length=128, description="Normalised user-agent or device info")

    class Config:
        extra = "forbid"


class ScoreInput(BaseModel):
    """Input model for score submission."""
    nickname: str = Field(..., min_length=1, max_length=16, description="Display name to associate with the score")
    points: int = Field(..., ge=0, description="Total points acquired during gameplay")
    lines: Optional[int] = Field(None, ge=0, description="Lines cleared in the run")
    level_reached: Optional[int] = Field(None, ge=0, description="Last level reached during the run", alias="levelReached")
    duration_seconds: Optional[int] = Field(None, ge=0, description="Run duration in seconds", alias="durationSeconds")
    seed: Optional[str] = Field(None, description="Optional seed used by the client")
    tags: Optional[List[str]] = Field(default_factory=list, min_items=0, max_items=5, description="Optional metadata labels")
    client: Optional[ClientInfo] = None

    class Config:
        extra = "forbid"
        allow_population_by_field_name = True


class Score(BaseModel):
    """Score entry with server metadata."""
    id: str = Field(..., description="Server-generated identifier")
    nickname: str = Field(..., min_length=1, max_length=16, description="Display name submitted by the player")
    points: int = Field(..., ge=0, description="Final score achieved at game over")
    lines: int = Field(..., ge=0, description="Lines cleared in the run")
    level_reached: int = Field(..., ge=0, description="Last level reached during the run", alias="levelReached")
    duration_seconds: int = Field(..., ge=0, description="Total run duration in seconds", alias="durationSeconds")
    seed: Optional[str] = Field(None, description="Optional seed used by the Bag RNG")
    created_at: datetime = Field(..., description="Time when the server accepted the score", alias="createdAt")
    suspect: bool = Field(default=False, description="Flag indicating the score is withheld from ranking pending review")
    client: Optional[ClientInfo] = None
    tags: Optional[List[str]] = Field(default_factory=list, description="Optional metadata labels provided by the client")

    class Config:
        allow_population_by_field_name = True
        extra = "forbid"


class RetentionPolicy(BaseModel):
    """Data retention configuration."""
    days: int = Field(..., ge=1, description="Days of history the server keeps")
    max_records: int = Field(..., ge=1, description="Maximum number of records kept for the window", alias="maxRecords")

    class Config:
        allow_population_by_field_name = True


class ScoreWindow(BaseModel):
    """List of scores with metadata."""
    generated_at: datetime = Field(..., description="Timestamp when the snapshot was generated", alias="generatedAt")
    retention: RetentionPolicy
    next_cursor: Optional[str] = Field(None, description="Cursor to request the next page; null when no more data", alias="nextCursor")
    items: List[Score] = Field(..., description="Ordered list of scores")

    class Config:
        allow_population_by_field_name = True


class ScoreBatchInput(BaseModel):
    """Bulk score submission input."""
    client_time: Optional[datetime] = Field(None, description="Timestamp when the batch was generated on the client", alias="clientTime")
    items: List[ScoreInput] = Field(..., min_items=1, max_items=50, description="Scores queued locally awaiting upload")

    class Config:
        allow_population_by_field_name = True
        extra = "forbid"


class ScoreRejection(BaseModel):
    """Rejected score with reason."""
    reason: str = Field(..., description="Error code explaining why the item failed")
    payload: ScoreInput

    class Config:
        extra = "forbid"


class ScoreBatchResult(BaseModel):
    """Bulk submission result."""
    accepted: List[Score] = Field(..., description="Scores that were stored successfully")
    rejected: List[ScoreRejection] = Field(..., description="Scores that failed validation or business rules")

    class Config:
        extra = "forbid"


class ValidationError(BaseModel):
    """Validation error details."""
    loc: List[Union[str, int]] = Field(..., description="Path to the field that caused the error")
    msg: str
    type: str


class ErrorResponse(BaseModel):
    """API error response."""
    code: Optional[str] = Field(None, description="Machine-readable error code")
    detail: Union[str, ValidationError] = Field(..., description="Message describing the error condition")

    class Config:
        extra = "forbid"