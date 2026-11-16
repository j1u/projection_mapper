"""Runtime configuration (overridable with environment variables)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    frontend_dist: Path
    max_upload_bytes: int
    cors_origins: tuple[str, ...]

    @property
    def db_path(self) -> Path:
        return self.data_dir / "projectionmapper.db"

    @property
    def media_dir(self) -> Path:
        return self.data_dir / "media"


def load_settings() -> Settings:
    return Settings(
        data_dir=Path(os.environ.get("PM_DATA_DIR", BACKEND_DIR / "data")).resolve(),
        frontend_dist=Path(os.environ.get("PM_FRONTEND_DIST", PROJECT_ROOT / "frontend" / "dist")).resolve(),
        max_upload_bytes=int(os.environ.get("PM_MAX_UPLOAD_MB", "2048")) * 1024 * 1024,
        cors_origins=tuple(
            o.strip()
            for o in os.environ.get("PM_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
            if o.strip()
        ),
    )
