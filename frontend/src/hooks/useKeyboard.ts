import { useEffect } from 'react';
import { applyDrag, meshActive } from '../lib/geometry';
import { useStore } from '../store';

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

export function setEditMode(on: boolean) {
  const st = useStore.getState();
  st.setUi({ edit: on });
  if (!on) st.showToast('Output mode — press Tab to edit');
}

export function toggleBlackout() {
  const st = useStore.getState();
  st.setUi({ blackout: !st.blackout });
  st.showToast(!st.blackout ? 'Blackout ON (B)' : 'Blackout off');
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLInputElement | null;
      const tag = ae?.tagName;
      if ((tag === 'INPUT' && ae!.type !== 'checkbox') || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') ae!.blur();
        return;
      }
      const st = useStore.getState();
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'Tab') {
        e.preventDefault();
        return setEditMode(!st.edit);
      }
      if (k === 'f') return toggleFullscreen();
      if (k === 'b') return toggleBlackout();
      if (!st.edit) return;
      if (k === 'h') return st.setUi({ panelHidden: !st.panelHidden });
      if (k === 'n') return st.addSurface();
      if (k === '[' || k === ']') return st.selectAdjacent(k === ']' ? 1 : -1);

      const s = st.surfaces.find(x => x.id === st.sel);
      if (!s) return;
      if (k === 'm') return st.updateSurface(s.id, x => ({ ...x, mesh: { ...x.mesh, on: !x.mesh.on } }));
      if (k === 'Delete' || k === 'Backspace') {
        e.preventDefault();
        return st.deleteSurface(s.id);
      }
      if (k >= '1' && k <= '4') return st.selectCorner(+k - 1);
      const dir = ARROWS[k];
      if (dir) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1, dx = dir[0] * step, dy = dir[1] * step;
        const vp = st.viewport;
        if (e.ctrlKey || e.metaKey) st.updateSurface(s.id, x => applyDrag(x, 'move', 0, dx, dy, vp));
        else if (st.mpt != null && meshActive(s)) st.updateSurface(s.id, x => applyDrag(x, 'mesh', st.mpt!, dx, dy, vp));
        else st.updateSurface(s.id, x => applyDrag(x, 'corner', st.corner, dx, dy, vp));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
