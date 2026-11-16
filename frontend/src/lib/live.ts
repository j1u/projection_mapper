/**
 * Live (non-serializable) media: camera streams and screen captures.
 * Kept outside React state; subscribers are notified on change.
 */
const cams = new Map<string, MediaStream>(); // deviceId ('' = default)
const captures = new Map<string, { stream: MediaStream; name: string }>(); // surface id
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

export const subscribeLive = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

export const getCamera = (deviceId: string) => cams.get(deviceId || '');

export async function startCamera(deviceId: string): Promise<MediaStream> {
  const key = deviceId || '';
  const existing = cams.get(key);
  if (existing) return existing;
  const size = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  const stream = await navigator.mediaDevices.getUserMedia({
    video: deviceId ? { deviceId: { exact: deviceId }, ...size } : size,
    audio: false,
  });
  cams.set(key, stream);
  notify();
  return stream;
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  try {
    return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
  } catch {
    return [];
  }
}

/** Restart cameras on load if the user already granted permission. */
export async function autoStartCameras(deviceIds: string[]) {
  if (!deviceIds.length) return;
  try {
    const p = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (p.state !== 'granted') return;
    for (const id of new Set(deviceIds)) await startCamera(id).catch(() => {});
  } catch {
    /* permissions API unavailable */
  }
}

export const getCapture = (surfaceId: string) => captures.get(surfaceId);

export async function startCapture(surfaceId: string) {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60 } }, audio: false });
  const track = stream.getVideoTracks()[0];
  captures.set(surfaceId, { stream, name: track.label || 'Screen capture' });
  track.addEventListener('ended', () => {
    for (const [id, c] of captures) if (c.stream === stream) captures.delete(id);
    notify();
  });
  notify();
}

export function shareCapture(fromId: string, toId: string) {
  const c = captures.get(fromId);
  if (c) {
    captures.set(toId, c);
    notify();
  }
}

export function dropCapture(surfaceId: string) {
  if (captures.delete(surfaceId)) notify();
}
