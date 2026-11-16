import type { ContentType, Surface } from '../types';

export const PATTERN_SIZE = 512;

const MISSING: Partial<Record<ContentType, [string, string]>> = {
  image: ['No image chosen', 'Pick or upload one in the panel'],
  video: ['No video chosen', 'Pick or upload one in the panel'],
  youtube: ['No YouTube link', 'Paste a link in the panel'],
  videourl: ['No video URL', 'Paste a link in the panel'],
  imageurl: ['No image URL', 'Paste a link in the panel'],
  web: ['No web page URL', 'Paste a link in the panel'],
  webcam: ['Camera not started', 'Click "Start camera" in the panel'],
  screen: ['No capture running', 'Click "Start capture…" in the panel'],
};

const off = typeof document !== 'undefined' ? document.createElement('canvas') : null;
let offImg: ImageData | null = null;

const hexRgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export type GenName = 'grid' | 'plasma' | 'stripes' | 'rings' | 'missing';

/** Draw one frame of a generative pattern into a PATTERN_SIZE² canvas. */
export function drawPattern(c: CanvasRenderingContext2D, gen: GenName, s: Surface, t: number) {
  const N = PATTERN_SIZE;
  c.save();
  c.fillStyle = '#000';
  c.fillRect(0, 0, N, N);
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  };
  switch (gen) {
    case 'grid': {
      c.strokeStyle = 'rgba(255,255,255,.35)';
      c.lineWidth = 1;
      for (let i = 1; i < 16; i++) {
        const x = (i * N) / 16;
        line(x, 0, x, N);
        line(0, x, N, x);
      }
      c.strokeStyle = 'rgba(255,255,255,.2)';
      line(0, 0, N, N);
      line(N, 0, 0, N);
      c.strokeStyle = s.color;
      c.lineWidth = 3;
      line(N / 2, 0, N / 2, N);
      line(0, N / 2, N, N / 2);
      c.beginPath(); c.arc(N / 2, N / 2, N * 0.38, 0, 7); c.stroke();
      c.beginPath(); c.arc(N / 2, N / 2, N * 0.16, 0, 7); c.stroke();
      c.lineWidth = 8;
      c.strokeRect(4, 4, N - 8, N - 8);
      c.fillStyle = '#fff';
      c.font = 'bold 30px system-ui';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      ([[34, 34], [N - 34, 34], [N - 34, N - 34], [34, N - 34]] as const).forEach(([x, y], i) => c.fillText(String(i + 1), x, y));
      c.font = 'bold 24px system-ui';
      const w = c.measureText(s.name).width + 20;
      c.fillStyle = '#000';
      c.fillRect(N / 2 - w / 2, N / 2 + 40, w, 34);
      c.fillStyle = '#fff';
      c.fillText(s.name, N / 2, N / 2 + 58);
      break;
    }
    case 'plasma': {
      if (!off) break;
      const R = 96;
      off.width = off.height = R;
      const oc = off.getContext('2d')!;
      offImg ??= oc.createImageData(R, R);
      const d = offImg.data, [br, bg, bb] = hexRgb(s.color);
      for (let y = 0, k = 0; y < R; y++)
        for (let x = 0; x < R; x++, k += 4) {
          const v = Math.sin(x * 0.09 + t) + Math.sin(y * 0.07 - t * 1.3) + Math.sin((x + y) * 0.05 + t * 0.7) +
            Math.sin(Math.hypot(x - 48, y - 48) * 0.13 - t * 2);
          const a = (v * Math.PI) / 2;
          d[k] = (128 + 127 * Math.sin(a)) * 0.6 + br * 0.4;
          d[k + 1] = (128 + 127 * Math.sin(a + 2.09)) * 0.6 + bg * 0.4;
          d[k + 2] = (128 + 127 * Math.sin(a + 4.19)) * 0.6 + bb * 0.4;
          d[k + 3] = 255;
        }
      oc.putImageData(offImg, 0, 0);
      c.imageSmoothingEnabled = true;
      c.drawImage(off, 0, 0, N, N);
      break;
    }
    case 'stripes': {
      c.translate(N / 2, N / 2);
      c.rotate(Math.PI / 4);
      c.fillStyle = s.color;
      const p = 80, sh = (t * 90) % p;
      for (let x = -N; x < N; x += p) c.fillRect(x + sh, -N, p / 2, 2 * N);
      break;
    }
    case 'rings': {
      c.strokeStyle = s.color;
      c.lineWidth = 22;
      const max = N * 0.72;
      for (let i = 0; i < 6; i++) {
        const r = ((i * max) / 6 + t * 70) % max;
        c.globalAlpha = 1 - r / max;
        c.beginPath(); c.arc(N / 2, N / 2, r, 0, 7); c.stroke();
      }
      break;
    }
    case 'missing': {
      c.strokeStyle = 'rgba(255,255,255,.15)';
      for (let i = 1; i < 8; i++) {
        const x = (i * N) / 8;
        line(x, 0, x, N);
        line(0, x, N, x);
      }
      c.strokeStyle = s.color;
      c.lineWidth = 6;
      c.strokeRect(3, 3, N - 6, N - 6);
      c.fillStyle = '#fff';
      c.font = 'bold 26px system-ui';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const msg = MISSING[s.content] ?? ['No content', ''];
      c.fillText(msg[0], N / 2, N / 2 - 18);
      c.font = '20px system-ui';
      c.fillStyle = '#aaa';
      c.fillText(msg[1], N / 2, N / 2 + 18);
      break;
    }
  }
  c.restore();
}

/** Solid color / wrapped text into a canvas sized to the surface aspect (GL path). */
export function drawStatic(cv: HTMLCanvasElement, s: Surface, aspect: number) {
  cv.width = 1024;
  cv.height = Math.max(64, Math.min(4096, Math.round(1024 / aspect)));
  const c = cv.getContext('2d')!, W = cv.width, H = cv.height;
  if (s.content === 'color') {
    c.fillStyle = s.color;
    c.fillRect(0, 0, W, H);
    return;
  }
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  c.fillStyle = s.color;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let size = Math.min(W * 0.15, H * 0.8);
  let lines: string[] = [];
  for (;;) {
    c.font = `700 ${size}px system-ui, sans-serif`;
    lines = [];
    let ln = '';
    for (const w of String(s.text).split(/\s+/)) {
      const t = ln ? ln + ' ' + w : w;
      if (c.measureText(t).width > W * 0.9 && ln) {
        lines.push(ln);
        ln = w;
      } else ln = t;
    }
    lines.push(ln);
    const wide = Math.max(...lines.map(l => c.measureText(l).width));
    if ((lines.length * size * 1.1 <= H * 0.9 && wide <= W * 0.92) || size < 8) break;
    size *= 0.9;
  }
  lines.forEach((l, i) => c.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
}
