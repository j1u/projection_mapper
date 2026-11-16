import { useEffect, useRef, type PointerEvent as RPointerEvent } from 'react';
import { applyDrag, applyH, crEval, homog, isMeshCorner, meshActive, meshEval, outline, toPx, type DragMode } from '../lib/geometry';
import { useStore } from '../store';
import type { Point } from '../types';

interface Drag {
  mode: DragMode;
  id: string;
  index: number;
  x: number;
  y: number;
}

const pts = (P: Point[]) => P.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

/** Edit handles drawn over the projection: outlines, corner pins, mesh points. */
export function Overlay() {
  const surfaces = useStore(st => st.surfaces);
  const sel = useStore(st => st.sel);
  const corner = useStore(st => st.corner);
  const mpt = useStore(st => st.mpt);
  const vp = useStore(st => st.viewport);
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const k = e.shiftKey ? 0.2 : 1; // shift = fine adjust
      const dx = (e.clientX - d.x) * k, dy = (e.clientY - d.y) * k;
      d.x = e.clientX;
      d.y = e.clientY;
      const st = useStore.getState();
      st.updateSurface(d.id, s => applyDrag(s, d.mode, d.index, dx, dy, st.viewport));
    };
    const up = () => (drag.current = null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const start = (e: RPointerEvent, mode: DragMode, id: string, index = 0) => {
    e.preventDefault();
    e.stopPropagation();
    const st = useStore.getState();
    if (mode === 'corner') st.selectCorner(index);
    else if (mode === 'mesh') st.selectMeshPoint(index);
    else if (st.sel !== id) st.select(id);
    drag.current = { mode, id, index, x: e.clientX, y: e.clientY };
  };

  const s = surfaces.find(x => x.id === sel);
  let handles = null;
  const H = s ? homog(s, vp) : null;
  const C = s && H ? applyH(H, meshEval(s, 0.5, 0.5)) : null;
  if (s && s.visible && H && C && C.every(Number.isFinite)) {
    const P = toPx(s, vp), mesh = meshActive(s);
    const lines: Point[][] = [];
    if (mesh) {
      const M = s.mesh, N = 32;
      for (let j = 0; j < M.rows; j++) lines.push(Array.from({ length: N + 1 }, (_, k) => applyH(H, crEval(M, k / N, j / (M.rows - 1)))));
      for (let i = 0; i < M.cols; i++) lines.push(Array.from({ length: N + 1 }, (_, k) => applyH(H, crEval(M, i / (M.cols - 1), k / N))));
    }
    handles = (
      <g style={{ ['--c' as string]: s.color }}>
        {mesh
          ? lines.map((L, i) => <polyline key={i} className="mline" points={pts(L)} />)
          : [
              <line key="d1" className="diag" x1={P[0][0]} y1={P[0][1]} x2={P[2][0]} y2={P[2][1]} />,
              <line key="d2" className="diag" x1={P[1][0]} y1={P[1][1]} x2={P[3][0]} y2={P[3][1]} />,
            ]}
        {mesh &&
          s.mesh.pts.map((p, k) => {
            if (isMeshCorner(s.mesh, k)) return null;
            const q = applyH(H, p);
            return (
              <circle key={k} className={'mpt' + (mpt === k ? ' on' : '')} cx={q[0]} cy={q[1]} r={6}
                onPointerDown={e => start(e, 'mesh', s.id, k)} />
            );
          })}
        <rect className="move" x={C[0] - 8} y={C[1] - 8} width={16} height={16} rx={3} onPointerDown={e => start(e, 'move', s.id)} />
        {P.map((p, i) => {
          const dx = p[0] - C[0], dy = p[1] - C[1], L = Math.hypot(dx, dy) || 1;
          return (
            <g key={i}>
              <circle className={'corner' + (i === corner && mpt == null ? ' on' : '')} cx={p[0]} cy={p[1]} r={11}
                onPointerDown={e => start(e, 'corner', s.id, i)} />
              <text x={p[0] + (dx / L) * 24} y={p[1] + (dy / L) * 24 + 5} textAnchor="middle">{i + 1}</text>
            </g>
          );
        })}
        <text x={C[0]} y={C[1] - 16} textAnchor="middle">{s.name}</text>
      </g>
    );
  }

  return (
    <svg className="overlay" viewBox={`0 0 ${vp.w} ${vp.h}`}>
      {surfaces.map(x =>
        x.visible ? (
          <polygon key={x.id} className={'body' + (x.id === sel ? ' sel' : '')} style={{ ['--c' as string]: x.color }}
            points={pts(outline(x, vp))} onPointerDown={e => start(e, 'move', x.id)} />
        ) : null,
      )}
      {handles}
    </svg>
  );
}
