import { describe, expect, it } from 'vitest';
import {
  adj, applyDrag, applyH, buildPositions, crEval, homog, outline, project, resampleMesh, rotateSurface, uniformGrid,
} from './geometry';
import { newSurface } from './surfaces';
import type { Point, Surface } from '../types';

const close = (a: Point, b: Point, eps = 1e-6) => {
  expect(a[0]).toBeCloseTo(b[0], -Math.log10(eps));
  expect(a[1]).toBeCloseTo(b[1], -Math.log10(eps));
};
const vp = { w: 1920, h: 1080 };
const quad: Point[] = [[100, 120], [900, 80], [950, 700], [60, 640]];

describe('homography', () => {
  it('maps the 4 source corners exactly onto the destination corners', () => {
    const H = project([[0, 0], [1, 0], [1, 1], [0, 1]], quad);
    close(applyH(H, [0, 0]), quad[0]);
    close(applyH(H, [1, 0]), quad[1]);
    close(applyH(H, [1, 1]), quad[2]);
    close(applyH(H, [0, 1]), quad[3]);
  });

  it('adjugate acts as inverse (up to scale)', () => {
    const H = project([[0, 0], [1, 0], [1, 1], [0, 1]], quad);
    close(applyH(adj(H), applyH(H, [0.3, 0.7])), [0.3, 0.7]);
  });
});

describe('Catmull-Rom mesh', () => {
  const M = { on: true, cols: 4, rows: 3, pts: uniformGrid(4, 3) };

  it('flat grid is the identity', () => {
    close(crEval(M, 0.37, 0.81), [0.37, 0.81]);
  });

  it('passes through every control point', () => {
    const bent = { ...M, pts: M.pts.map(([x, y], k): Point => [x + (k % 3) * 0.01, y - (k % 2) * 0.02]) };
    bent.pts.forEach((p, k) => close(crEval(bent, (k % 4) / 3, Math.floor(k / 4) / 2), p));
  });

  it('resampling preserves the shape', () => {
    const bent = { ...M, pts: M.pts.map(([x, y]): Point => [x, y + 0.1 * Math.sin(x * Math.PI)]) };
    bent.pts[0] = [0, 0]; bent.pts[3] = [1, 0]; bent.pts[8] = [0, 1]; bent.pts[11] = [1, 1];
    const r = resampleMesh(bent, 7, 5);
    expect(r.pts).toHaveLength(35);
    for (const [u, v] of [[0.5, 0.5], [1 / 3, 0.5], [2 / 3, 0]] as Point[]) close(crEval(r, u, v), crEval(bent, u, v), 1e-2);
  });
});

describe('surface operations', () => {
  const meshed = (): Surface => {
    const s = newSurface(0);
    s.mesh = { ...s.mesh, on: true };
    s.mesh.pts[5] = [0.4, 0.2]; // bend one interior point
    return s;
  };

  it('rotate keeps the on-screen outline', () => {
    const s = meshed();
    const before = outline(s, vp, 8);
    const after = outline(rotateSurface(s), vp, 8);
    // same set of boundary points, just starting from a different corner
    for (const p of after) expect(before.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6)).toBe(true);
  });

  it('dragging a mesh point moves it by the screen delta', () => {
    const s = meshed();
    const H = homog(s, vp);
    const q0 = applyH(H, s.mesh.pts[5]);
    const moved = applyDrag(s, 'mesh', 5, 30, -12, vp);
    close(applyH(H, moved.mesh.pts[5]), [q0[0] + 30, q0[1] - 12]);
  });

  it('corner drag moves only that corner, move drag moves all', () => {
    const s = newSurface(0);
    const c = applyDrag(s, 'corner', 2, 192, 108, vp);
    close(c.pts[2], [s.pts[2][0] + 0.1, s.pts[2][1] + 0.1]);
    close(c.pts[0], s.pts[0]);
    const m = applyDrag(s, 'move', 0, 192, 0, vp);
    m.pts.forEach((p, i) => close(p, [s.pts[i][0] + 0.1, s.pts[i][1]]));
  });

  it('builds clip-space positions inside [-1, 1] for an on-screen surface', () => {
    const a = buildPositions(newSurface(0), vp, 8);
    expect(a).toHaveLength(81 * 2);
    expect(Math.max(...a)).toBeLessThanOrEqual(1);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(-1);
  });
});
