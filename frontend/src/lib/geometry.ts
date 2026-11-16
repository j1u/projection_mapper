/**
 * Pure geometry: homographies (corner pin) and Catmull-Rom mesh surfaces.
 * Matrices are 3x3, row-major, mapping column vectors [x, y, 1].
 */
import type { ContentType, Fit, Mesh, Point, Surface, Viewport } from '../types';

export type Mat3 = number[];

export const adj = (m: Mat3): Mat3 => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];

export const mul = (a: Mat3, b: Mat3): Mat3 => {
  const c: Mat3 = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = s;
    }
  return c;
};

const mulv = (m: Mat3, v: number[]) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

function basis(p: Point[]): Mat3 {
  const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = mulv(adj(m), [p[3][0], p[3][1], 1]);
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/** Homography mapping the 4 src points onto the 4 dst points. */
export const project = (src: Point[], dst: Point[]): Mat3 => mul(basis(dst), adj(basis(src)));

export const applyH = (H: Mat3, [x, y]: Point): Point => {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
};

export const UNIT: Point[] = [[0, 0], [1, 0], [1, 1], [0, 1]];

export const toPx = (s: Pick<Surface, 'pts'>, vp: Viewport): Point[] => s.pts.map(([x, y]) => [x * vp.w, y * vp.h]);

/** Unit square -> screen pixels for a surface's 4 corners. */
export const homog = (s: Pick<Surface, 'pts'>, vp: Viewport) => project(UNIT, toPx(s, vp));

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function quadAspect(s: Pick<Surface, 'pts'>, vp: Viewport): number {
  const P = toPx(s, vp);
  const w = (dist(P[0], P[1]) + dist(P[3], P[2])) / 2;
  const h = (dist(P[0], P[3]) + dist(P[1], P[2])) / 2;
  return Math.min(8, Math.max(1 / 8, Math.max(w, 1) / Math.max(h, 1)));
}

// ---------------- mesh ----------------
/** Sources the browser won't let us read as pixels: corner-pin only. */
export const IFRAME_CONTENT: ContentType[] = ['youtube', 'web'];

export const meshActive = (s: Surface) => s.mesh.on && !IFRAME_CONTENT.includes(s.content);

const ext = (a: Point, b: Point): Point => [2 * a[0] - b[0], 2 * a[1] - b[1]];

const cr = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const t2 = t * t, t3 = t2 * t;
  const f = (k: 0 | 1) =>
    0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
      (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
  return [f(0), f(1)];
};

/** Evaluate the Catmull-Rom surface through the control grid at (u, v) in [0,1]². */
export function crEval(M: Mesh, u: number, v: number): Point {
  const { cols, rows, pts } = M;
  const P = (i: number, j: number): Point => {
    if (i < 0) return ext(P(0, j), P(1, j));
    if (i >= cols) return ext(P(cols - 1, j), P(cols - 2, j));
    if (j < 0) return ext(P(i, 0), P(i, 1));
    if (j >= rows) return ext(P(i, rows - 1), P(i, rows - 2));
    return pts[j * cols + i];
  };
  const gx = u * (cols - 1), gy = v * (rows - 1);
  const i = Math.min(Math.floor(gx), cols - 2), j = Math.min(Math.floor(gy), rows - 2);
  const tx = gx - i, ty = gy - j;
  const R: Point[] = [];
  for (let r = -1; r <= 2; r++) R.push(cr(P(i - 1, j + r), P(i, j + r), P(i + 1, j + r), P(i + 2, j + r), tx));
  return cr(R[0], R[1], R[2], R[3], ty);
}

export const uniformGrid = (c: number, r: number): Point[] => {
  const a: Point[] = [];
  for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) a.push([i / (c - 1), j / (r - 1)]);
  return a;
};

export const defaultMesh = (): Mesh => ({ on: false, cols: 4, rows: 4, pts: uniformGrid(4, 4) });

export const isMeshCorner = (M: Mesh, k: number) =>
  k === 0 || k === M.cols - 1 || k === (M.rows - 1) * M.cols || k === M.rows * M.cols - 1;

export const meshEval = (s: Surface, u: number, v: number): Point => (meshActive(s) ? crEval(s.mesh, u, v) : [u, v]);

/** Change grid resolution while preserving the current shape. */
export function resampleMesh(M: Mesh, c: number, r: number): Mesh {
  const pts: Point[] = [];
  for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) pts.push(crEval(M, i / (c - 1), j / (r - 1)));
  pts[0] = [0, 0]; pts[c - 1] = [1, 0]; pts[(r - 1) * c] = [0, 1]; pts[r * c - 1] = [1, 1];
  return { ...M, cols: c, rows: r, pts };
}

/** Move mesh control point k by a screen-pixel delta. */
export function moveMeshPoint(s: Surface, k: number, dx: number, dy: number, vp: Viewport): Mesh {
  const H = homog(s, vp);
  const q = applyH(H, s.mesh.pts[k]);
  const r = applyH(adj(H), [q[0] + dx, q[1] + dy]);
  if (!r.every(Number.isFinite)) return s.mesh;
  const pts = s.mesh.pts.slice();
  pts[k] = r;
  return { ...s.mesh, pts };
}

export type DragMode = 'corner' | 'mesh' | 'move';

/** Apply a screen-pixel drag delta to a surface. */
export function applyDrag(s: Surface, mode: DragMode, index: number, dx: number, dy: number, vp: Viewport): Surface {
  if (mode === 'mesh') return { ...s, mesh: moveMeshPoint(s, index, dx, dy, vp) };
  const nx = dx / vp.w, ny = dy / vp.h;
  const pts = s.pts.map((p, i): Point => (mode === 'move' || i === index ? [p[0] + nx, p[1] + ny] : p));
  return { ...s, pts };
}

/** Rotate content 90° inside the same on-screen shape (corners and mesh). */
export function rotateSurface(s: Surface): Surface {
  const pts = [...s.pts.slice(1), s.pts[0]];
  const M = s.mesh, nc = M.rows, nr = M.cols, np: Point[] = [];
  for (let j = 0; j < nr; j++)
    for (let i = 0; i < nc; i++) {
      const o = M.pts[i * M.cols + (M.cols - 1 - j)];
      np.push([o[1], 1 - o[0]]);
    }
  return { ...s, pts, mesh: { ...M, cols: nc, rows: nr, pts: np } };
}

/** Outline polygon in screen px (sampled along the mesh boundary when meshed). */
export function outline(s: Surface, vp: Viewport, n = 16): Point[] {
  if (!meshActive(s)) return toPx(s, vp);
  const H = homog(s, vp), o: Point[] = [];
  const add = (u: number, v: number) => o.push(applyH(H, crEval(s.mesh, u, v)));
  for (let k = 0; k < n; k++) add(k / n, 0);
  for (let k = 0; k < n; k++) add(1, k / n);
  for (let k = 0; k < n; k++) add(1 - k / n, 1);
  for (let k = 0; k < n; k++) add(0, 1 - k / n);
  return o;
}

/** Size of the untransformed DOM content box; its aspect drives text layout and cover/contain. */
export function boxSize(s: Surface, vp: Viewport): [number, number] {
  const ta = quadAspect(s, vp);
  if (s.content === 'youtube') return s.fit === 'contain' ? [1600, 1600 / ta] : [1600, 900];
  if (s.content === 'web') return [1280, 1280 / ta];
  return [1000, 1000 / ta];
}

/** CSS matrix3d mapping a bw×bh box onto the surface's corners. */
export function cssMatrix(s: Surface, vp: Viewport, bw: number, bh: number): string | null {
  const t = project([[0, 0], [bw, 0], [bw, bh], [0, bh]], toPx(s, vp));
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  if (!t.every(Number.isFinite)) return null;
  return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`;
}

/** UV scale for object-fit behaviour in the GL renderer. */
export function fitScale(fit: Fit, sa: number, ta: number): [number, number] {
  if (fit === 'cover') return sa > ta ? [ta / sa, 1] : [1, sa / ta];
  if (fit === 'contain') return sa > ta ? [1, sa / ta] : [ta / sa, 1];
  return [1, 1];
}

/** Clip-space vertex positions for a (tess+1)² grid. */
export function buildPositions(s: Surface, vp: Viewport, tess: number): Float32Array {
  const H = homog(s, vp), n = tess + 1, a = new Float32Array(n * n * 2);
  for (let j = 0, k = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const p = applyH(H, meshEval(s, i / tess, j / tess));
      a[k++] = (p[0] / vp.w) * 2 - 1;
      a[k++] = 1 - (p[1] / vp.h) * 2;
    }
  return a;
}
