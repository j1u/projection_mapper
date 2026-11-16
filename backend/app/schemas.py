"""API schemas. JSON uses camelCase to match the frontend."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

Point = tuple[float, float]

ContentType = Literal[
    "grid", "plasma", "stripes", "rings",
    "color", "text",
    "image", "video",
    "youtube", "videourl", "imageurl", "web",
    "webcam", "screen",
]
Fit = Literal["fill", "cover", "contain"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Mesh(CamelModel):
    on: bool = False
    cols: int = Field(4, ge=2, le=16)
    rows: int = Field(4, ge=2, le=16)
    pts: list[Point] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_pts(self) -> "Mesh":
        if not self.pts:
            self.pts = [(i / (self.cols - 1), j / (self.rows - 1)) for j in range(self.rows) for i in range(self.cols)]
        if len(self.pts) != self.cols * self.rows:
            raise ValueError(f"mesh needs cols*rows = {self.cols * self.rows} points, got {len(self.pts)}")
        return self


class Surface(CamelModel):
    id: str = Field(min_length=1, max_length=64)
    name: str = Field("Surface", max_length=200)
    pts: list[Point] = Field(min_length=4, max_length=4)
    content: ContentType = "grid"
    color: str = Field("#ff2d6f", pattern=r"^#[0-9a-fA-F]{6}$")
    text: str = Field("Hello", max_length=2000)
    fit: Fit = "fill"
    url: str = Field("", max_length=4000)
    media_id: str | None = None
    device_id: str = ""
    opacity: float = Field(1.0, ge=0, le=1)
    brightness: float = Field(1.0, ge=0, le=2)
    visible: bool = True
    flip_h: bool = False
    flip_v: bool = False
    sound: bool = False
    mesh: Mesh = Field(default_factory=Mesh)


class ProjectIn(CamelModel):
    name: str = Field("Untitled", min_length=1, max_length=200)
    surfaces: list[Surface] = Field(default_factory=list, max_length=256)


class ProjectPatch(CamelModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    surfaces: list[Surface] | None = Field(None, max_length=256)


class ProjectSummary(CamelModel):
    id: str
    name: str
    surface_count: int
    created_at: datetime
    updated_at: datetime


class Project(CamelModel):
    id: str
    name: str
    surfaces: list[Surface]
    created_at: datetime
    updated_at: datetime


class MediaItem(CamelModel):
    id: str
    name: str
    content_type: str
    size: int
    url: str
    created_at: datetime
