export type Point = [number, number];

export type PatternType = 'grid' | 'plasma' | 'stripes' | 'rings';
export type ContentType =
  | PatternType
  | 'color' | 'text'
  | 'image' | 'video'
  | 'youtube' | 'videourl' | 'imageurl' | 'web'
  | 'webcam' | 'screen';
export type Fit = 'fill' | 'cover' | 'contain';

export interface Mesh {
  on: boolean;
  cols: number;
  rows: number;
  /** Control points in the corners' unit space, row-major (cols * rows). */
  pts: Point[];
}

export interface Surface {
  id: string;
  name: string;
  /** Corners TL, TR, BR, BL — normalized 0..1 viewport coordinates. */
  pts: Point[];
  content: ContentType;
  color: string;
  text: string;
  fit: Fit;
  url: string;
  mediaId: string | null;
  deviceId: string;
  opacity: number;
  brightness: number;
  visible: boolean;
  flipH: boolean;
  flipV: boolean;
  sound: boolean;
  mesh: Mesh;
}

export interface ProjectSummary {
  id: string;
  name: string;
  surfaceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  surfaces: Surface[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  name: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface Viewport {
  w: number;
  h: number;
}
