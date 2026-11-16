import { useEffect, useState } from 'react';
import { drawPattern } from '../lib/patterns';
import { contentKey, makeSource, teardown, type RenderMode, type Source } from '../lib/sources';
import { useStore } from '../store';
import type { Surface } from '../types';
import { useLatest } from './useLatest';

/**
 * Owns the pixel-source element for a surface: rebuilds it when the content changes,
 * animates generative patterns, and keeps video mute in sync.
 */
export function useSource(s: Surface, mode: RenderMode): Source | null {
  const mediaUrl = useStore(st => (s.mediaId ? (st.media.find(m => m.id === s.mediaId)?.url ?? null) : null));
  useStore(st => st.liveVersion); // re-render when cameras / captures change
  const key = contentKey(s, mediaUrl) + '|' + mode;
  const sRef = useLatest(s);
  const [src, setSrc] = useState<Source | null>(null);

  useEffect(() => {
    const created = makeSource(sRef.current, mode, { mediaUrl, onError: useStore.getState().showToast });
    setSrc(created);
    return () => teardown(created);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!src?.gen || !src.ctx) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (sRef.current.visible) drawPattern(src.ctx!, src.gen!, sRef.current, performance.now() / 1000);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [src, sRef]);

  useEffect(() => {
    if (src?.el instanceof HTMLVideoElement && (s.content === 'video' || s.content === 'videourl')) src.el.muted = !s.sound;
  }, [src, s.sound, s.content]);

  return src;
}
