"""Data models for Tetris scores."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ClientInfo(BaseModel):
    """Client metadata."""
    version: Optional[str] = Field(None, description="Short client build identifier")
    ua: Optional[str] = Field(None, max_length=128, description="Normalised user-agent or device info")


class ScoreInput(BaseModel):
    """Input model for score submission."""
    nickname: str = Field(..., min_length=1, max_length=16)
    points: int = Field(..., ge=0)
    client: Optional[ClientInfo] = None

    class Config:
        extra = "forbid"


class Score(BaseModel):
    """Score entry with server metadata."""
    id: str = Field(..., description="Server-generated identifier")
    nickname: str = Field(..., min_length=1, max_length=16)
    points: int = Field(..., ge=0)
    created_at: datetime = Field(..., alias="createdAt")
    client: Optional[ClientInfo] = None

    class Config:
        allow_population_by_field_name = True


class ScoreList(BaseModel):
    """List of scores with metadata."""
    generated_at: datetime = Field(..., alias="generatedAt")
    items: List[Score]

    class Config:
        allow_population_by_field_name = True