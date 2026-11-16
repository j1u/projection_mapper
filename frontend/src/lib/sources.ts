/**
 * Creates the DOM element that provides a surface's pixels (canvas, img, video, iframe, div).
 * DOM surfaces append it into a CSS-transformed box; GL surfaces upload it as a texture.
 */
import type { Surface } from '../types';
import { getCamera, getCapture } from './live';
import { PATTERN_SIZE, type GenName } from './patterns';
import { webSrc, ytParse, ytSrc } from './urls';

export type RenderMode = 'dom' | 'gl';

export interface Source {
  el: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | HTMLIFrameElement | HTMLDivElement;
  kind: 'canvas' | 'img' | 'video' | 'iframe' | 'div';
  gen?: GenName;
  ctx?: CanvasRenderingContext2D;
  /** Canvas holding solid color / text for GL (redrawn when they change). */
  isStatic?: boolean;
}

export const PATTERNS = ['grid', 'plasma', 'stripes', 'rings'] as const;
export const isPattern = (c: string): c is (typeof PATTERNS)[number] => (PATTERNS as readonly string[]).includes(c);

/** Changes whenever the source element must be rebuilt. */
export function contentKey(s: Surface, mediaUrl: string | null): string {
  switch (s.content) {
    case 'image':
    case 'video':
      return `${s.content}|${mediaUrl ?? ''}`;
    case 'screen':
      return `screen|${getCapture(s.id)?.stream.id ?? ''}`;
    case 'webcam':
      return `webcam|${s.deviceId}|${getCamera(s.deviceId)?.id ?? ''}`;
    case 'youtube':
    case 'web':
    case 'videourl':
    case 'imageurl':
      return `${s.content}|${s.url.trim()}`;
    default:
      return s.content;
  }
}

function canvasSource(gen: GenName | undefined, size = PATTERN_SIZE): Source {
  const el = document.createElement('canvas');
  el.width = el.height = size;
  return { el, kind: 'canvas', gen, ctx: el.getContext('2d')! };
}

function videoElement() {
  const v = document.createElement('video');
  v.loop = true;
  v.muted = true;
  v.autoplay = true;
  v.playsInline = true;
  return v;
}

interface MakeOpts {
  mediaUrl: string | null;
  onError: (msg: string) => void;
}

export function makeSource(s: Surface, mode: RenderMode, { mediaUrl, onError }: MakeOpts): Source {
  const gl = mode === 'gl';
  const missing = () => canvasSource('missing');
  switch (s.content) {
    case 'grid':
    case 'plasma':
    case 'stripes':
    case 'rings':
      return canvasSource(s.content);
    case 'color':
    case 'text': {
      if (gl) return { ...canvasSource(undefined, 1024), isStatic: true };
      const el = document.createElement('div');
      if (s.content === 'text') el.className = 'txt';
      return { el, kind: 'div' };
    }
    case 'image':
    case 'imageurl': {
      const url = s.content === 'image' ? mediaUrl : s.url.trim();
      if (!url) return missing();
      const el = new Image();
      el.draggable = false;
      if (gl && s.content === 'imageurl') el.crossOrigin = 'anonymous';
      el.onerror = () => onError('Could not load image' + (gl && s.content === 'imageurl' ? ' — mesh warp needs the server to allow CORS' : ''));
      el.src = url;
      return { el, kind: 'img' };
    }
    case 'video':
    case 'videourl': {
      const url = s.content === 'video' ? mediaUrl : s.url.trim();
      if (!url) return missing();
      const el = videoElement();
      if (gl && s.content === 'videourl') el.crossOrigin = 'anonymous';
      el.onerror = () => onError('Could not load video' + (gl && s.content === 'videourl' ? ' — mesh warp needs the server to allow CORS' : ''));
      el.src = url;
      el.play().catch(() => {});
      return { el, kind: 'video' };
    }
    case 'webcam':
    case 'screen': {
      const stream = s.content === 'webcam' ? getCamera(s.deviceId) : getCapture(s.id)?.stream;
      if (!stream) return missing();
      const el = videoElement();
      el.srcObject = stream;
      el.play().catch(() => {});
      return { el, kind: 'video' };
    }
    case 'youtube': {
      const ref = ytParse(s.url);
      if (!ref) return missing();
      const el = document.createElement('iframe');
      el.allow = 'autoplay; encrypted-media; picture-in-picture';
      el.referrerPolicy = 'strict-origin-when-cross-origin';
      el.src = ytSrc(ref, location.origin);
      return { el, kind: 'iframe' };
    }
    case 'web': {
      const url = webSrc(s.url);
      if (!url) return missing();
      const el = document.createElement('iframe');
      el.allow = 'autoplay; fullscreen; encrypted-media';
      el.src = url;
      return { el, kind: 'iframe' };
    }
  }
}

export function teardown(src: Source) {
  const el = src.el;
  if (el instanceof HTMLVideoElement) {
    el.pause();
    el.srcObject = null;
    el.removeAttribute('src');
    el.load();
  } else if (el instanceof HTMLIFrameElement) el.src = 'about:blank';
  el.remove();
}
