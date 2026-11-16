import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { IFRAME_CONTENT } from '../../lib/geometry';
import { getCamera, getCapture, listCameras, startCamera, startCapture } from '../../lib/live';
import { useStore } from '../../store';
import type { ContentType, Surface } from '../../types';

export const URL_PLACEHOLDER: Partial<Record<ContentType, string>> = {
  youtube: 'https://youtube.com/watch?v=…',
  videourl: 'https://…/video.mp4',
  imageurl: 'https://…/image.jpg',
  web: 'https://vimeo.com/… or any embeddable page',
};

function MediaPicker({ s, kind }: { s: Surface; kind: 'image' | 'video' }) {
  const all = useStore(st => st.media);
  const media = all.filter(m => m.contentType.startsWith(kind + '/'));
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const st = useStore.getState();

  const upload = async (f: File) => {
    setProgress(0);
    try {
      const item = await api.uploadMedia(f, setProgress);
      st.addMedia(item);
      st.updateSurface(s.id, { mediaId: item.id });
    } catch (e) {
      st.showToast('Upload failed: ' + (e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <label className="f">
        <span>Library</span>
        <select value={s.mediaId ?? ''} onChange={e => st.updateSurface(s.id, { mediaId: e.target.value || null })}>
          <option value="">— choose {kind} —</option>
          {media.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <div className="row">
        <button disabled={progress != null} onClick={() => fileRef.current?.click()}>Upload {kind} file…</button>
      </div>
      {progress != null && <progress className="upload" value={progress} max={1} />}
      <input ref={fileRef} type="file" hidden accept={kind + '/*'}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
    </>
  );
}

function UrlField({ s }: { s: Surface }) {
  const [draft, setDraft] = useState(s.url);
  useEffect(() => setDraft(s.url), [s.id, s.url]);
  const commit = () => draft.trim() !== s.url && useStore.getState().updateSurface(s.id, { url: draft.trim() });
  return (
    <div className="url-row">
      <input type="text" value={draft} placeholder={URL_PLACEHOLDER[s.content]} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); } }} />
      <button onClick={commit}>Load</button>
    </div>
  );
}

function CameraFields({ s }: { s: Surface }) {
  const live = useStore(st => st.liveVersion);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => void listCameras().then(setCams), [live]);
  const st = useStore.getState();
  const start = (deviceId: string) =>
    startCamera(deviceId).catch(e => st.showToast('Could not start camera: ' + (e as Error).message));
  return (
    <>
      <label className="f">
        <span>Device</span>
        <select value={s.deviceId} onChange={e => { st.updateSurface(s.id, { deviceId: e.target.value }); start(e.target.value); }}>
          <option value="">Default camera</option>
          {cams.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
        </select>
      </label>
      <div className="row">
        <button onClick={() => start(s.deviceId)}>{getCamera(s.deviceId) ? 'Camera running' : 'Start camera'}</button>
      </div>
    </>
  );
}

function CaptureFields({ s }: { s: Surface }) {
  useStore(st => st.liveVersion);
  const cap = getCapture(s.id);
  const begin = () =>
    startCapture(s.id).catch(e => {
      if ((e as Error).name !== 'NotAllowedError') useStore.getState().showToast('Capture failed: ' + (e as Error).message);
    });
  return (
    <>
      <div className="row"><button onClick={begin}>{cap ? 'Change capture…' : 'Start capture…'}</button></div>
      <div className="media-name">{cap ? '● ' + cap.name : 'Not capturing'}</div>
    </>
  );
}

export function SourceFields({ s }: { s: Surface }) {
  const c = s.content;
  const notes: string[] = [];
  if (IFRAME_CONTENT.includes(c) && s.mesh.on)
    notes.push("Mesh warp can't bend YouTube / web pages (the browser won't expose their pixels), so corner-pin is used. To mesh-warp it, play it in another window and use Screen / window / tab capture.");
  if (c === 'web') notes.push('Many sites block embedding. Player/embed links (Vimeo, YouTube embed, Shadertoy embed) work best.');
  if ((c === 'videourl' || c === 'imageurl') && s.mesh.on)
    notes.push('Mesh warp needs the media server to allow CORS. If it stays black, turn mesh off or use screen capture.');
  if (c === 'screen') notes.push('Tip: open YouTube (or any app) in another window, then capture that window or tab.');

  return (
    <>
      {(c === 'image' || c === 'video') && <MediaPicker s={s} kind={c} />}
      {URL_PLACEHOLDER[c] && <UrlField s={s} />}
      {c === 'webcam' && <CameraFields s={s} />}
      {c === 'screen' && <CaptureFields s={s} />}
      {notes.length > 0 && <div className="note">{notes.map((n, i) => <p key={i}>{n}</p>)}</div>}
    </>
  );
}

/** Side effects when the user switches content type. */
export function onContentChosen(s: Surface, content: ContentType) {
  const st = useStore.getState();
  if (content === 'webcam') startCamera(s.deviceId).catch(e => st.showToast('Could not start camera: ' + (e as Error).message));
  if (content === 'screen' && !getCapture(s.id))
    startCapture(s.id).catch(e => {
      if ((e as Error).name !== 'NotAllowedError') st.showToast('Capture failed: ' + (e as Error).message);
    });
}
