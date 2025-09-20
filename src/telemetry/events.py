"""Telemetry event collection and batching."""

import logging
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Supported telemetry event types."""
    GAME_STARTED = "game_started"
    GAME_OVER = "game_over"
    LINE_CLEAR = "line_clear"
    HOLD_USED = "hold_used"
    SETTING_CHANGED = "setting_changed"
    SCORE_SUBMITTED = "score_submitted"


class TelemetryEvent:
    """Individual telemetry event."""

    def __init__(
        self,
        event_type: EventType,
        properties: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ):
        self.event_type = event_type
        self.properties = properties or {}
        self.timestamp = timestamp or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        return {
            "event_type": self.event_type.value,
            "properties": self.properties,
            "timestamp": self.timestamp.isoformat()
        }


class TelemetryCollector:
    """Collects and batches telemetry events."""

    def __init__(self, batch_size: int = 50):
        self.batch_size = batch_size
        self._events: List[TelemetryEvent] = []

    def track(self, event_type: EventType, properties: Optional[Dict[str, Any]] = None):
        """Track a telemetry event."""
        event = TelemetryEvent(event_type, properties)
        self._events.append(event)

        # Log event for development
        logger.info(f"Telemetry: {event.event_type.value}", extra={
            "event_properties": event.properties,
            "timestamp": event.timestamp
        })

        # Auto-flush if batch is full
        if len(self._events) >= self.batch_size:
            self.flush()

    def flush(self) -> List[Dict[str, Any]]:
        """Flush collected events and return them as dictionaries."""
        if not self._events:
            return []

        events_data = [event.to_dict() for event in self._events]
        self._events.clear()

        logger.info(f"Flushed {len(events_data)} telemetry events")
        return events_data

    def get_pending_count(self) -> int:
        """Get number of pending events."""
        return len(self._events)


# Global collector instance
telemetry = TelemetryCollector()
