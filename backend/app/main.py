"""Projection Mapper API + static frontend host.

Run (dev):   uvicorn app.main:app --reload            (from backend/)
Frontend dev server (Vite, port 5173) proxies /api and /media here.
In production the built frontend (frontend/dist) is served from /.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .config import Settings, load_settings
from .routers import media, projects


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    db.init_db(settings.db_path)
    settings.media_dir.mkdir(parents=True, exist_ok=True)

    app = FastAPI(title="Projection Mapper", version="2.0.0")
    app.state.settings = settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", tags=["meta"])
    def health():
        return {"status": "ok"}

    app.include_router(projects.router)
    app.include_router(media.router)

    # Uploaded media (StaticFiles supports HTTP Range, so videos can seek/loop).
    app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

    # Built frontend + SPA fallback.
    dist = settings.frontend_dist
    if (dist / "index.html").exists():
        if (dist / "assets").is_dir():
            app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            if path.startswith(("api/", "media/")):
                raise HTTPException(404)
            candidate = (dist / path).resolve()
            if path and candidate.is_file() and candidate.is_relative_to(dist):
                return FileResponse(candidate)
            return FileResponse(dist / "index.html")
    else:
        @app.get("/", include_in_schema=False)
        def no_frontend():
            return {
                "message": "Frontend not built. Run `npm run build` in frontend/ "
                "or use the Vite dev server at http://localhost:5173."
            }

    return app


app = create_app()
