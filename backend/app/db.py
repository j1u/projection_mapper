"""SQLite persistence (stdlib sqlite3; one connection per request)."""
from __future__ import annotations

import json
import sqlite3
import uuid
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    surfaces    TEXT NOT NULL,          -- JSON array of surfaces
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,        -- original filename
    stored_name   TEXT NOT NULL UNIQUE, -- file name on disk
    content_type  TEXT NOT NULL,
    size          INTEGER NOT NULL,
    created_at    TEXT NOT NULL
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA)


def connect(db_path: Path) -> Iterator[sqlite3.Connection]:
    # Per-request connection; FastAPI may create it in a worker thread and use it on the event loop.
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---- projects ----
def _project_row(row: sqlite3.Row, full: bool) -> dict:
    surfaces = json.loads(row["surfaces"])
    base = {"id": row["id"], "name": row["name"], "created_at": row["created_at"], "updated_at": row["updated_at"]}
    return {**base, "surfaces": surfaces} if full else {**base, "surface_count": len(surfaces)}


def list_projects(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
    return [_project_row(r, full=False) for r in rows]


def get_project(conn: sqlite3.Connection, project_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return _project_row(row, full=True) if row else None


def create_project(conn: sqlite3.Connection, name: str, surfaces: list[dict]) -> dict:
    pid, ts = new_id(), now()
    conn.execute(
        "INSERT INTO projects (id, name, surfaces, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (pid, name, json.dumps(surfaces), ts, ts),
    )
    return get_project(conn, pid)  # type: ignore[return-value]


def update_project(conn: sqlite3.Connection, project_id: str, name: str | None, surfaces: list[dict] | None) -> dict | None:
    existing = get_project(conn, project_id)
    if not existing:
        return None
    conn.execute(
        "UPDATE projects SET name = ?, surfaces = ?, updated_at = ? WHERE id = ?",
        (
            name if name is not None else existing["name"],
            json.dumps(surfaces if surfaces is not None else existing["surfaces"]),
            now(),
            project_id,
        ),
    )
    return get_project(conn, project_id)


def delete_project(conn: sqlite3.Connection, project_id: str) -> bool:
    return conn.execute("DELETE FROM projects WHERE id = ?", (project_id,)).rowcount > 0


# ---- media ----
def list_media(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM media ORDER BY created_at DESC").fetchall()


def get_media(conn: sqlite3.Connection, media_id: str) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM media WHERE id = ?", (media_id,)).fetchone()


def insert_media(conn: sqlite3.Connection, media_id: str, name: str, stored_name: str, content_type: str, size: int) -> sqlite3.Row:
    conn.execute(
        "INSERT INTO media (id, name, stored_name, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (media_id, name, stored_name, content_type, size, now()),
    )
    return get_media(conn, media_id)  # type: ignore[return-value]


def delete_media(conn: sqlite3.Connection, media_id: str) -> bool:
    return conn.execute("DELETE FROM media WHERE id = ?", (media_id,)).rowcount > 0
