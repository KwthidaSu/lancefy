from fastapi import WebSocket
from typing import Dict, Set
from uuid import UUID


class NotificationManager:
    """Per-user WebSocket connection manager for real-time notification push."""

    def __init__(self):
        # user_id → set of active WebSocket connections (one user may have multiple tabs)
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def push(self, user_id: str, payload: dict):
        """Push a notification JSON payload to all active sockets for a user."""
        if user_id in self.active_connections:
            dead: list[WebSocket] = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[user_id].discard(ws)


notification_manager = NotificationManager()
