# Projection Mapper

Projection mapping in the browser: corner-pin and mesh warping onto physical surfaces, with patterns, uploaded media, YouTube, web embeds, cameras and screen capture as sources.

**Stack:** FastAPI + SQLite backend · React 19 + TypeScript + Vite + Zustand frontend · WebGL for mesh warping.

## Run it

Requires Python 3.10+ and Node.js 18+.

| | |
|---|---|
| **`start.bat`** | One click. Sets up the venv and npm packages, builds the frontend, serves everything at **http://localhost:8000** and opens it. |
| **`dev.bat`** | Development. Runs FastAPI with `--reload` on :8000 and the Vite dev server with hot reload on **http://localhost:5173** (it proxies `/api` and `/media` to the backend). |

Manual equivalents:

```bash
# backend
cd backend
python -m venv .venv && .venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\python -m uvicorn app.main:app --reload

# frontend (second terminal)
cd frontend
npm install
npm run dev        # or: npm run build  → served by FastAPI from frontend/dist
```

## Using it on a projector

1. Set Windows to **Extend** displays (Win+P), drag the browser window onto the projector, press **F**.
2. Drag the 4 corner handles of each surface onto your physical object. Tick **Mesh warp** for curved surfaces and drag the white dots.
3. Choose content per surface, then press **Tab** for output mode (no UI, no cursor).

Projects autosave to the server. Switch, create, rename, export and import them from the panel.

## Project layout

```
backend/
  app/
    main.py            app factory: CORS, routers, /media static, SPA hosting of frontend/dist
    config.py          settings (env: PM_DATA_DIR, PM_FRONTEND_DIST, PM_MAX_UPLOAD_MB, PM_CORS_ORIGINS)
    schemas.py         Pydantic models (camelCase JSON) — Surface, Mesh, Project, MediaItem
    db.py              SQLite (stdlib) persistence
    routers/projects.py  CRUD   /api/projects
    routers/media.py     upload /api/media (images/videos stored in backend/data/media)
  tests/test_api.py    pytest suite
  data/                created at runtime (projectionmapper.db + media/) — git-ignored

frontend/src/
  store.ts             Zustand store: project, surfaces, selection, UI, debounced autosave
  types.ts             shared types (mirror backend schemas)
  lib/geometry.ts      homography, Catmull-Rom mesh, drag math (pure + unit-tested)
  lib/meshRenderer.ts  WebGL tessellated-grid renderer
  lib/sources.ts       builds the pixel source element per content type
  lib/patterns.ts      generative patterns, text/color canvases
  lib/live.ts          camera + screen-capture streams
  lib/urls.ts          YouTube / Vimeo URL handling
  lib/api.ts           typed API client (XHR upload with progress)
  hooks/               useSource, useKeyboard, useLatest
  components/          Stage, DomSurface (CSS matrix3d), GlSurface (WebGL), Overlay (handles), panel/*

legacy/                the original single-file version (still works: open legacy/index.html)
```

## API

| Method | Path | |
|---|---|---|
| GET | `/api/health` | |
| GET / POST | `/api/projects` | list summaries / create |
| GET / PUT / DELETE | `/api/projects/{id}` | full project / partial update (`name`, `surfaces`) / delete |
| GET / POST | `/api/media` | list / multipart upload (`file`, image/* or video/*) |
| DELETE | `/api/media/{id}` | removes the file too |
| GET | `/media/{file}` | uploaded files (supports HTTP Range for video) |

Interactive docs: http://localhost:8000/docs

## Tests

```bash
cd backend && .venv\Scripts\python -m pytest     # API: CRUD, validation, uploads, range requests, SPA fallback
cd frontend && npm test                          # geometry + URL parsing (vitest)
cd frontend && npm run typecheck
```

## Content sources

| Source | Corner pin | Mesh warp | Notes |
|---|:-:|:-:|---|
| Patterns, solid color, text | ✓ | ✓ | |
| Image / video (media library) | ✓ | ✓ | Uploaded to the server, so they persist |
| YouTube | ✓ | ✗ | Playlists, `t=` start times and Shorts supported. "Sound" toggles audio |
| Video URL / Image URL | ✓ | ✓* | *The remote server must allow CORS for mesh warp |
| Web page / embed (Vimeo, etc.) | ✓ | ✗ | Many sites refuse to be embedded |
| Camera / capture card | ✓ | ✓ | |
| Screen / window / tab capture | ✓ | ✓ | Use this to mesh-warp YouTube or any other app |

Browsers don't let pages read the pixels of YouTube or other embedded sites, so those can only be corner-pinned. To bend one onto a curved surface, play it in another window and capture that window.

## Keys

Tab edit/output · F fullscreen · H panel · B blackout · N new surface · M mesh on/off · 1–4 select corner · arrows nudge (Shift ×10) · Ctrl+arrows move surface · [ ] prev/next surface · Del delete · Shift+drag fine adjust
