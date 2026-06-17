from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
from uuid import UUID

class ConnectionManager:
    def __init__(self):
        # Dictionary mapping room_id to a set of active WebSockets
        self.active_connections: Dict[UUID, Set[WebSocket]] = {}

    async def connect(self, room_id: UUID, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        self.active_connections[room_id].add(websocket)

    def disconnect(self, room_id: UUID, websocket: WebSocket):
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, room_id: UUID, message: dict, exclude: WebSocket | None = None):
        if room_id in self.active_connections:
            dead = []
            for connection in self.active_connections[room_id]:
                if connection is exclude:
                    continue
                try:
                    await connection.send_json(message)
                except (RuntimeError, WebSocketDisconnect):
                    dead.append(connection)
            for c in dead:
                self.active_connections[room_id].discard(c)

manager = ConnectionManager()
