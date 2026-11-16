from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def client(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>PM</title>")
    (dist / "assets" / "app.js").write_text("console.log(1)")
    settings = Settings(
        data_dir=tmp_path / "data",
        frontend_dist=dist,
        max_upload_bytes=1024,
        cors_origins=("http://localhost:5173",),
    )
    with TestClient(create_app(settings)) as c:
        yield c


def surface(**over):
    s = {"id": "s1", "name": "Wall", "pts": [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]}
    s.update(over)
    return s


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_project_crud(client):
    r = client.post("/api/projects", json={"name": "Show", "surfaces": [surface()]})
    assert r.status_code == 201
    p = r.json()
    pid = p["id"]
    s = p["surfaces"][0]
    # defaults filled in and serialized camelCase
    assert s["content"] == "grid" and s["flipH"] is False and s["mediaId"] is None
    assert len(s["mesh"]["pts"]) == 16

    assert [x["id"] for x in client.get("/api/projects").json()] == [pid]
    assert client.get("/api/projects").json()[0]["surfaceCount"] == 1

    r = client.put(f"/api/projects/{pid}", json={"surfaces": [surface(content="plasma", flipH=True)]})
    assert r.status_code == 200
    assert r.json()["name"] == "Show"
    assert r.json()["surfaces"][0]["content"] == "plasma"
    assert r.json()["surfaces"][0]["flipH"] is True

    r = client.put(f"/api/projects/{pid}", json={"name": "Renamed"})
    assert r.json()["name"] == "Renamed" and len(r.json()["surfaces"]) == 1

    assert client.delete(f"/api/projects/{pid}").status_code == 204
    assert client.get(f"/api/projects/{pid}").status_code == 404
    assert client.delete(f"/api/projects/{pid}").status_code == 404


@pytest.mark.parametrize(
    "bad",
    [
        {"pts": [[0, 0], [1, 0], [1, 1]]},                       # 3 corners
        {"content": "hologram"},                                  # unknown content type
        {"color": "red"},                                         # not #rrggbb
        {"opacity": 2},                                           # out of range
        {"mesh": {"on": True, "cols": 3, "rows": 3, "pts": [[0, 0]]}},  # wrong point count
    ],
)
def test_validation(client, bad):
    r = client.post("/api/projects", json={"name": "x", "surfaces": [surface(**bad)]})
    assert r.status_code == 422


def test_media_upload_list_delete(client):
    r = client.post("/api/media", files={"file": ("clip.mp4", b"\x00" * 100, "video/mp4")})
    assert r.status_code == 201
    m = r.json()
    assert m["name"] == "clip.mp4" and m["size"] == 100 and m["url"].endswith(".mp4")

    served = client.get(m["url"])
    assert served.status_code == 200 and len(served.content) == 100
    ranged = client.get(m["url"], headers={"Range": "bytes=0-9"})
    assert ranged.status_code == 206 and len(ranged.content) == 10

    assert [x["id"] for x in client.get("/api/media").json()] == [m["id"]]
    assert client.delete(f"/api/media/{m['id']}").status_code == 204
    assert client.get(m["url"]).status_code == 404
    assert client.get("/api/media").json() == []


def test_media_rejects_non_media_and_oversize(client):
    r = client.post("/api/media", files={"file": ("x.exe", b"MZ", "application/octet-stream")})
    assert r.status_code == 415
    r = client.post("/api/media", files={"file": ("big.png", b"\x00" * 2048, "image/png")})
    assert r.status_code == 413
    assert client.get("/api/media").json() == []


def test_spa_fallback(client):
    assert "<title>PM</title>" in client.get("/").text
    assert "<title>PM</title>" in client.get("/some/client/route").text
    assert client.get("/assets/app.js").text == "console.log(1)"
    assert client.get("/api/nope").status_code == 404
