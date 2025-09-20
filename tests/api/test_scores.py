# CONTRACT: openapi.yaml#/paths/~1scores
# CONTRACT: PRD §3

import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.routers import scores

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_scores_before_each_test():
    """Reset in-memory score storage before each test."""
    scores.score_service._scores.clear()
    yield


def test_submit_score_success():
    """
    CONTRACT: openapi.yaml#/paths/~1scores/post@201
    GIVEN a valid score payload
    WHEN the POST /scores endpoint is called
    THEN it should return a 201 CREATED status and the created score object.
    """
    response = client.post("/scores", json={
        "nickname": "Player1",
        "points": 1000,
        "client": {"version": "1.0", "ua": "TestClient"}
    })
    assert response.status_code == 201
    data = response.json()
    assert data["nickname"] == "Player1"
    assert data["points"] == 1000
    assert "id" in data
    assert "createdAt" in data
    assert data["client"]["version"] == "1.0"

def test_submit_score_invalid_nickname_too_long():
    """
    CONTRACT: openapi.yaml#/components/schemas/ScoreInput/properties/nickname
    GIVEN a score payload with a nickname longer than 16 characters
    WHEN the POST /scores endpoint is called
    THEN it should return a 422 Unprocessable Entity status.
    """
    response = client.post("/scores", json={
        "nickname": "ThisIsAVeryLongNickname",
        "points": 100
    })
    assert response.status_code == 422

def test_submit_score_invalid_points_negative():
    """
    CONTRACT: openapi.yaml#/components/schemas/ScoreInput/properties/points
    GIVEN a score payload with negative points
    WHEN the POST /scores endpoint is called
    THEN it should return a 422 Unprocessable Entity status.
    """
    response = client.post("/scores", json={
        "nickname": "Player2",
        "points": -50
    })
    assert response.status_code == 422

def test_list_scores_empty():
    """
    CONTRACT: openapi.yaml#/paths/~1scores/get@200
    GIVEN no scores have been submitted
    WHEN the GET /scores endpoint is called
    THEN it should return a 200 OK status and an empty list of items.
    """
    response = client.get("/scores")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert "generatedAt" in data

def test_list_scores_with_data_and_sorting():
    """
    CONTRACT: openapi.yaml#/paths/~1scores/get@200
    GIVEN multiple scores have been submitted
    WHEN the GET /scores endpoint is called
    THEN it should return a 200 OK status with scores sorted by points descending.
    """
    client.post("/scores", json={"nickname": "PlayerA", "points": 100})
    client.post("/scores", json={"nickname": "PlayerB", "points": 300})
    client.post("/scores", json={"nickname": "PlayerC", "points": 200})

    response = client.get("/scores")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 3
    assert data["items"][0]["nickname"] == "PlayerB"
    assert data["items"][0]["points"] == 300
    assert data["items"][1]["nickname"] == "PlayerC"
    assert data["items"][2]["nickname"] == "PlayerA"

def test_list_scores_limit_parameter():
    """
    CONTRACT: openapi.yaml#/paths/~1scores/get/parameters/limit
    GIVEN more scores exist than the limit
    WHEN the GET /scores endpoint is called with a 'limit' query parameter
    THEN it should return only the specified number of scores.
    """
    for i in range(15):
        client.post("/scores", json={"nickname": f"P{i}", "points": (i + 1) * 10})

    response = client.get("/scores?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 5
    assert data["items"][0]["points"] == 150 # The last one submitted has the highest score

def test_list_scores_invalid_limit_parameter():
    """
    CONTRACT: openapi.yaml#/paths/~1scores/get/parameters/limit
    GIVEN an invalid limit parameter (e.g., > 100)
    WHEN the GET /scores endpoint is called
    THEN it should return a 422 Unprocessable Entity status.
    """
    response = client.get("/scores?limit=200")
    assert response.status_code == 422

def test_submit_score_banned_nickname(monkeypatch):
    """
    CONTRACT: openapi.yaml#/paths/~1scores/post@400
    GIVEN a nickname is on a banned list
    WHEN a score is submitted with that nickname
    THEN it should return a 400 Bad Request status.
    """
    # Mock the service layer's banned list
    monkeypatch.setattr(scores.score_service, "BANNED_NICKNAMES", {"BannedUser"})
    response = client.post("/scores", json={
        "nickname": "BannedUser",
        "points": 9999
    })
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["code"] == "nickname_banned"

def test_submit_score_rate_limited(monkeypatch):
    """
    CONTRACT: openapi.yaml#/paths/~1scores/post@429
    GIVEN the rate limiter is active and has been exceeded
    WHEN a score is submitted
    THEN it should return a 429 Too Many Requests status.
    """
    # Mock the token bucket to simulate an empty bucket
    async def mock_is_allowed(identifier: str):
        return False
    monkeypatch.setattr(scores, "is_allowed", mock_is_allowed)

    response = client.post("/scores", json={
        "nickname": "PlayerFast",
        "points": 500
    })
    assert response.status_code == 429
    assert "Retry-After" in response.headers
