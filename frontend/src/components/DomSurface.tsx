import { useEffect, useRef } from 'react';
import { boxSize, cssMatrix } from '../lib/geometry';
import { ytSetSound } from '../lib/urls';
import { useLatest } from '../hooks/useLatest';
import { useSource } from '../hooks/useSource';
import { useStore } from '../store';
import type { Surface } from '../types';

/** Corner-pin surface: content box transformed with a CSS matrix3d (works for iframes too). */
export function DomSurface({ s }: { s: Surface }) {
  const vp = useStore(st => st.viewport);
  const src = useSource(s, 'dom');
  const wrap = useRef<HTMLDivElement>(null);
  const sRef = useLatest(s);

  useEffect(() => {
    if (src && wrap.current) wrap.current.replaceChildren(src.el);
  }, [src]);

  // element-level styling
  useEffect(() => {
    if (!src) return;
    const el = src.el;
    el.style.transform = s.flipH || s.flipV ? `scale(${s.flipH ? -1 : 1},${s.flipV ? -1 : 1})` : '';
    if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement) el.style.objectFit = s.fit;
    if (s.content === 'color') el.style.background = s.color;
    if (s.content === 'text') {
      el.textContent = s.text;
      el.style.color = s.color;
    }
  }, [src, s.flipH, s.flipV, s.fit, s.content, s.color, s.text]);

  // YouTube sound via the iframe postMessage API (re-sent after load, since the player boots async)
  useEffect(() => {
    if (!(src?.el instanceof HTMLIFrameElement) || s.content !== 'youtube') return;
    const el = src.el;
    const timers: number[] = [];
    const send = () => [0, 400, 1500, 3500].forEach(t => timers.push(window.setTimeout(() => ytSetSound(el, sRef.current.sound), t)));
    send();
    el.addEventListener('load', send);
    return () => {
      el.removeEventListener('load', send);
      timers.forEach(clearTimeout);
    };
  }, [src, s.sound, s.content, sRef]);

  const [bw, bh] = boxSize(s, vp);
  const transform = cssMatrix(s, vp, bw, bh) ?? undefined;
  return (
    <div
      ref={wrap}
      className="surface"
      style={{
        width: bw,
        height: bh,
        transform,
        display: s.visible ? undefined : 'none',
        opacity: s.opacity,
        filter: s.brightness !== 1 ? `brightness(${s.brightness})` : undefined,
      }}
    />
  );
}
