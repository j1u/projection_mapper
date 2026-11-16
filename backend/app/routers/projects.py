from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response, status

from .. import db
from ..deps import get_conn
from ..schemas import Project, ProjectIn, ProjectPatch, ProjectSummary

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _dump(surfaces) -> list[dict]:
    return [s.model_dump(by_alias=True) for s in surfaces]


@router.get("", response_model=list[ProjectSummary])
def list_projects(conn: sqlite3.Connection = Depends(get_conn)):
    return db.list_projects(conn)


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectIn, conn: sqlite3.Connection = Depends(get_conn)):
    return db.create_project(conn, body.name, _dump(body.surfaces))


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    project = db.get_project(conn, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


@router.put("/{project_id}", response_model=Project)
def update_project(project_id: str, body: ProjectPatch, conn: sqlite3.Connection = Depends(get_conn)):
    project = db.update_project(
        conn, project_id, body.name, _dump(body.surfaces) if body.surfaces is not None else None
    )
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, conn: sqlite3.Connection = Depends(get_conn)):
    if not db.delete_project(conn, project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
