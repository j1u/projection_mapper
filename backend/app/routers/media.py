"""Media library: uploaded images/videos are stored on disk so they survive reloads."""
from __future__ import annotations

import mimetypes
import re
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, status

from .. import db
from ..config import Settings
from ..deps import get_conn, get_settings
from ..schemas import MediaItem

router = APIRouter(prefix="/api/media", tags=["media"])

CHUNK = 1024 * 1024
ALLOWED_PREFIXES = ("image/", "video/")


def _item(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "content_type": row["content_type"],
        "size": row["size"],
        "url": f"/media/{row['stored_name']}",
        "created_at": row["created_at"],
    }


def _safe_ext(filename: str, content_type: str) -> str:
    ext = Path(filename).suffix.lower()
    if re.fullmatch(r"\.[a-z0-9]{1,8}", ext):
        return ext
    return mimetypes.guess_extension(content_type) or ""


@router.get("", response_model=list[MediaItem])
def list_media(conn: sqlite3.Connection = Depends(get_conn)):
    return [_item(r) for r in db.list_media(conn)]


@router.post("", response_model=MediaItem, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile,
    conn: sqlite3.Connection = Depends(get_conn),
    settings: Settings = Depends(get_settings),
):
    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if not content_type.startswith(ALLOWED_PREFIXES):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only image and video files are allowed")

    media_id = db.new_id()
    stored_name = media_id + _safe_ext(file.filename or "", content_type)
    dest = settings.media_dir / stored_name
    settings.media_dir.mkdir(parents=True, exist_ok=True)

    size = 0
    try:
        with dest.open("wb") as out:
            while chunk := await file.read(CHUNK):
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    raise HTTPException(413, "File too large")
                out.write(chunk)
    except BaseException:
        dest.unlink(missing_ok=True)
        raise

    row = db.insert_media(conn, media_id, Path(file.filename or stored_name).name, stored_name, content_type, size)
    return _item(row)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    media_id: str,
    conn: sqlite3.Connection = Depends(get_conn),
    settings: Settings = Depends(get_settings),
):
    row = db.get_media(conn, media_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found")
    db.delete_media(conn, media_id)
    (settings.media_dir / row["stored_name"]).unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
