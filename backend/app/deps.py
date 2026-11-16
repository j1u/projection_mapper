from __future__ import annotations

import sqlite3
from collections.abc import Iterator

from fastapi import Request

from . import db
from .config import Settings


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_conn(request: Request) -> Iterator[sqlite3.Connection]:
    yield from db.connect(request.app.state.settings.db_path)
