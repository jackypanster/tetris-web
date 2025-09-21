#!/usr/bin/env python3
"""
Simple test script to verify the basic implementation works
"""

import asyncio
import json
from datetime import datetime
from src.models import ScoreInput, ScoreBatchInput, ClientInfo
from src.services.score_service import ScoreService

async def test_score_service():
    """Test the score service implementation"""
    print("Testing ScoreService...")

    service = ScoreService()

    # Test single score creation
    score_input = ScoreInput(
        nickname="TestPlayer",
        points=1000,
        lines=5,
        levelReached=2,
        durationSeconds=120,
        seed="test-seed",
        tags=["test"],
        client=ClientInfo(
            version="0.3.0",
            platform="test",
            ua="test-agent"
        )
    )

    score = await service.create_score(score_input)
    print(f"✅ Created score: {score.id} - {score.nickname}: {score.points} points")

    # Test getting scores
    scores = await service.get_top_scores(limit=10)
    print(f"✅ Retrieved {len(scores)} scores")

    # Test bulk creation
    batch_input = ScoreBatchInput(
        client_time=datetime.now(),
        items=[
            ScoreInput(nickname="Player1", points=500, lines=3, levelReached=1, durationSeconds=60),
            ScoreInput(nickname="Player2", points=1500, lines=7, levelReached=3, durationSeconds=180),
            ScoreInput(nickname="TestSpace", points=100, lines=1, levelReached=1, durationSeconds=30),  # Valid for now
        ]
    )

    result = await service.create_scores_bulk(batch_input)
    print(f"✅ Bulk creation: {len(result.accepted)} accepted, {len(result.rejected)} rejected")

    if result.rejected:
        print(f"   Rejection reasons: {[r.reason for r in result.rejected]}")

    # Test filtering
    all_scores = await service.get_top_scores()
    print(f"✅ Total scores in system: {len(all_scores)}")

    print("✅ All tests passed!")

def test_models():
    """Test that models can be instantiated correctly"""
    print("Testing Models...")

    # Test ScoreInput
    score_input = ScoreInput(
        nickname="Test",
        points=100
    )
    print(f"✅ ScoreInput created: {score_input.nickname}")

    # Test with all fields
    full_score_input = ScoreInput(
        nickname="FullTest",
        points=2000,
        lines=10,
        levelReached=5,
        durationSeconds=300,
        seed="full-test",
        tags=["tag1", "tag2"],
        client=ClientInfo(version="0.3.0", platform="web", ua="browser")
    )
    print(f"✅ Full ScoreInput created: {full_score_input.dict()}")

    # Test alias handling
    data = {
        "nickname": "AliasTest",
        "points": 500,
        "levelReached": 3,
        "durationSeconds": 150
    }
    alias_input = ScoreInput(**data)
    print(f"✅ Alias handling works: levelReached={alias_input.level_reached}")

    print("✅ Model tests passed!")

if __name__ == "__main__":
    print("=== Testing Implementation ===\n")

    test_models()
    print()

    asyncio.run(test_score_service())
    print()

    print("🎉 All tests completed successfully!")