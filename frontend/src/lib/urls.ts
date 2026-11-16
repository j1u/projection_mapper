export interface YouTubeRef {
  id: string | null;
  list?: string | null;
  start?: number;
}

export function ytParse(raw: string): YouTubeRef | null {
  raw = (raw || '').trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return { id: raw };
  let u: URL;
  try {
    u = new URL(raw.includes('://') ? raw : 'https://' + raw);
  } catch {
    return null;
  }
  const h = u.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (h === 'youtu.be') id = u.pathname.slice(1).split('/')[0] || null;
  else if (h.endsWith('youtube.com') || h.endsWith('youtube-nocookie.com')) {
    id = u.searchParams.get('v');
    const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
    if (m) id = m[2];
  } else return null;
  const list = u.searchParams.get('list');
  const t = u.searchParams.get('t') || u.searchParams.get('start');
  let start = 0;
  if (t) {
    const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
    if (m) start = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  }
  if (!id && !list) return null;
  return { id, list, start };
}

export function ytSrc(p: YouTubeRef, origin?: string): string {
  const q = new URLSearchParams({
    autoplay: '1', mute: '1', loop: '1', controls: '0', rel: '0', playsinline: '1',
    enablejsapi: '1', iv_load_policy: '3', disablekb: '1',
  });
  if (origin?.startsWith('http')) q.set('origin', origin);
  if (p.start) q.set('start', String(p.start));
  if (p.list) {
    q.set('list', p.list);
    if (!p.id) return 'https://www.youtube.com/embed/videoseries?' + q;
  } else if (p.id) q.set('playlist', p.id); // required for loop=1 on a single video
  return `https://www.youtube.com/embed/${p.id}?` + q;
}

export function ytCommand(el: HTMLIFrameElement, func: string, args: unknown[] = []) {
  try {
    el.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  } catch {
    /* iframe not ready */
  }
}

export function ytSetSound(el: HTMLIFrameElement, on: boolean) {
  if (on) {
    ytCommand(el, 'unMute');
    ytCommand(el, 'setVolume', [100]);
  } else ytCommand(el, 'mute');
  ytCommand(el, 'playVideo');
}

export function webSrc(raw: string): string | null {
  raw = (raw || '').trim();
  if (!raw) return null;
  const url = raw.includes('://') ? raw : 'https://' + raw;
  const vm = url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1`;
  return url;
}
