import { useEffect, useRef } from 'react';
import { buildPositions, fitScale, quadAspect } from '../lib/geometry';
import { MeshRenderer, TESS } from '../lib/meshRenderer';
import { drawStatic } from '../lib/patterns';
import { useLatest } from '../hooks/useLatest';
import { useSource } from '../hooks/useSource';
import { useStore } from '../store';
import type { Mesh, Point, Surface, Viewport } from '../types';

/** Mesh-warped surface rendered with WebGL. */
export function GlSurface({ s }: { s: Surface }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MeshRenderer | null>(null);
  const src = useSource(s, 'gl');
  const sRef = useLatest(s);

  useEffect(() => {
    const r = MeshRenderer.create(canvasRef.current!);
    if (!r) {
      const st = useStore.getState();
      st.showToast('WebGL unavailable (too many mesh surfaces?) — mesh warp turned off');
      st.updateSurface(sRef.current.id, x => ({ ...x, mesh: { ...x.mesh, on: false } }));
      return;
    }
    rendererRef.current = r;
    return () => {
      r.dispose();
      rendererRef.current = null;
    };
  }, [sRef]);

  useEffect(() => {
    const r = rendererRef.current, canvas = canvasRef.current;
    if (!r || !canvas || !src) return;
    const el = src.el;
    let raf = 0, texUp = false, taint = false, sw = 0, sh = 0, staticSig = '';
    let lastPts: Point[] | null = null, lastMesh: Mesh | null = null, lastVp: Viewport | null = null;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const s = sRef.current, vp = useStore.getState().viewport;
      if (!s.visible) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(vp.w * dpr), H = Math.round(vp.h * dpr);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      if (s.pts !== lastPts || s.mesh !== lastMesh || vp !== lastVp) {
        r.setPositions(buildPositions(s, vp, TESS));
        lastPts = s.pts; lastMesh = s.mesh; lastVp = vp;
      }

      let up = false;
      if (src.isStatic) {
        const ta = quadAspect(s, vp);
        const sig = `${s.content}|${s.text}|${s.color}|${ta.toFixed(2)}`;
        if (sig !== staticSig) {
          drawStatic(el as HTMLCanvasElement, s, ta);
          staticSig = sig;
          up = true;
        }
      } else if (el instanceof HTMLVideoElement) {
        if (el.readyState >= 2 && el.videoWidth) { up = true; sw = el.videoWidth; sh = el.videoHeight; }
      } else if (el instanceof HTMLImageElement) {
        if (el.complete && el.naturalWidth && !texUp) { up = true; sw = el.naturalWidth; sh = el.naturalHeight; }
      } else if (el instanceof HTMLCanvasElement) {
        up = !!src.gen;
      }
      if (up && !taint) {
        if (r.upload(el as TexImageSource)) texUp = true;
        else {
          taint = true;
          useStore.getState().showToast('This media blocks pixel access (no CORS), so it can\'t be mesh-warped. Turn off mesh or use screen capture.');
        }
      }

      const isMedia = src.kind === 'video' || src.kind === 'img';
      const scale = isMedia && sw ? fitScale(s.fit, sw / sh, quadAspect(s, vp)) : ([1, 1] as [number, number]);
      r.draw(W, H, scale, [s.flipH ? 1 : 0, s.flipV ? 1 : 0]);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [src, sRef]);

  return (
    <canvas
      ref={canvasRef}
      className="glsurf"
      style={{
        display: s.visible ? undefined : 'none',
        opacity: s.opacity,
        filter: s.brightness !== 1 ? `brightness(${s.brightness})` : undefined,
      }}
    />
  );
}
