import type { Surface } from '../types';
import { defaultMesh } from './geometry';

export const PALETTE = ['#ff2d6f', '#2dd4ff', '#ffd02d', '#7cff2d', '#b06bff', '#ff8a2d'];

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newSurface(index: number): Surface {
  const o = (index % 5) * 0.04;
  return {
    id: uid(),
    name: `Surface ${index + 1}`,
    pts: [[0.3 + o, 0.3 + o], [0.7 + o, 0.3 + o], [0.7 + o, 0.7 + o], [0.3 + o, 0.7 + o]],
    content: 'grid',
    color: PALETTE[index % PALETTE.length],
    text: 'Hello',
    fit: 'fill',
    url: '',
    mediaId: null,
    deviceId: '',
    opacity: 1,
    brightness: 1,
    visible: true,
    flipH: false,
    flipV: false,
    sound: false,
    mesh: defaultMesh(),
  };
}

/** Fill in fields missing from older exports (e.g. the legacy single-file app). */
export function migrateSurface(raw: Partial<Surface> & { id?: string }, index: number): Surface {
  const base = newSurface(index);
  const s = { ...base, ...raw, id: raw.id || base.id } as Surface;
  if (!s.mesh) s.mesh = defaultMesh();
  if (s.mediaId === undefined) s.mediaId = null;
  return s;
}
