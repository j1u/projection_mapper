import { isPattern } from '../../lib/sources';
import { useSelected, useStore } from '../../store';
import type { ContentType, Fit, Surface } from '../../types';
import { onContentChosen, SourceFields } from './SourceFields';

const MESH_SIZES = ['3x3', '4x3', '3x4', '4x4', '5x5', '6x4', '4x6', '6x6', '8x8'];
const FIT_CONTENT: ContentType[] = ['image', 'video', 'imageurl', 'videourl', 'webcam', 'screen', 'youtube'];
const SOUND_CONTENT: ContentType[] = ['video', 'videourl', 'youtube'];

export function SurfaceProps() {
  const s = useSelected();
  if (!s) return <p className="hint">Select a surface to edit it.</p>;
  return <Props s={s} />;
}

function Props({ s }: { s: Surface }) {
  const st = useStore.getState();
  const set = (patch: Partial<Surface>) => st.updateSurface(s.id, patch);
  const c = s.content;

  return (
    <>
      <h4>Selected surface</h4>
      <label className="f"><span>Name</span><input type="text" value={s.name} onChange={e => set({ name: e.target.value })} /></label>
      <label className="f">
        <span>Content</span>
        <select value={c} onChange={e => { const v = e.target.value as ContentType; set({ content: v }); onContentChosen(s, v); }}>
          <optgroup label="Patterns">
            <option value="grid">Calibration grid</option>
            <option value="plasma">Plasma</option>
            <option value="stripes">Moving stripes</option>
            <option value="rings">Pulse rings</option>
          </optgroup>
          <optgroup label="Basic">
            <option value="color">Solid color</option>
            <option value="text">Text</option>
          </optgroup>
          <optgroup label="Media library">
            <option value="image">Image</option>
            <option value="video">Video</option>
          </optgroup>
          <optgroup label="Online">
            <option value="youtube">YouTube</option>
            <option value="videourl">Video URL (.mp4 / .webm)</option>
            <option value="imageurl">Image URL</option>
            <option value="web">Web page / embed (Vimeo, etc.)</option>
          </optgroup>
          <optgroup label="Live">
            <option value="webcam">Camera / capture card</option>
            <option value="screen">Screen / window / tab capture</option>
          </optgroup>
        </select>
      </label>

      <SourceFields s={s} />

      {c === 'text' && <label className="f"><span>Text</span><input type="text" value={s.text} onChange={e => set({ text: e.target.value })} /></label>}
      {(isPattern(c) || c === 'color' || c === 'text') && (
        <label className="f"><span>Color</span><input type="color" value={s.color} onChange={e => set({ color: e.target.value })} /></label>
      )}
      {FIT_CONTENT.includes(c) && (
        <label className="f">
          <span>Fit</span>
          <select value={s.fit} onChange={e => set({ fit: e.target.value as Fit })}>
            <option value="fill">Stretch to surface</option>
            <option value="cover">Cover (crop)</option>
            <option value="contain">Contain (letterbox)</option>
          </select>
        </label>
      )}
      <label className="f"><span>Opacity</span>
        <input type="range" min={0} max={1} step={0.01} value={s.opacity} onChange={e => set({ opacity: +e.target.value })} /></label>
      <label className="f"><span>Brightness</span>
        <input type="range" min={0} max={2} step={0.01} value={s.brightness} onChange={e => set({ brightness: +e.target.value })} /></label>
      <div className="checks">
        <label><input type="checkbox" checked={s.visible} onChange={e => set({ visible: e.target.checked })} /> Visible</label>
        <label><input type="checkbox" checked={s.flipH} onChange={e => set({ flipH: e.target.checked })} /> Flip H</label>
        <label><input type="checkbox" checked={s.flipV} onChange={e => set({ flipV: e.target.checked })} /> Flip V</label>
        {SOUND_CONTENT.includes(c) && (
          <label><input type="checkbox" checked={s.sound} onChange={e => set({ sound: e.target.checked })} /> Sound</label>
        )}
      </div>

      <div className="meshbox">
        <div className="checks" style={{ margin: 0 }}>
          <label>
            <input type="checkbox" checked={s.mesh.on}
              onChange={e => { st.updateSurface(s.id, x => ({ ...x, mesh: { ...x.mesh, on: e.target.checked } })); st.selectMeshPoint(null); }} />
            <b>Mesh warp</b> (curved surfaces)
          </label>
        </div>
        {s.mesh.on && (
          <div style={{ marginTop: 8 }}>
            <label className="f">
              <span>Grid points</span>
              <select value={`${s.mesh.cols}x${s.mesh.rows}`}
                onChange={e => { const [cc, rr] = e.target.value.split('x').map(Number); st.setMeshSize(s.id, cc, rr); }}>
                {!MESH_SIZES.includes(`${s.mesh.cols}x${s.mesh.rows}`) && <option>{`${s.mesh.cols}x${s.mesh.rows}`}</option>}
                {MESH_SIZES.map(m => <option key={m}>{m}</option>)}
              </select>
            </label>
            <div className="row"><button onClick={() => st.flattenMesh(s.id)}>Flatten mesh</button></div>
            <div className="hint">Corners set the overall shape. Drag the small white dots to bend the surface.</div>
          </div>
        )}
      </div>

      <div className="row">
        <button onClick={() => st.resetCorners(s.id)}>Reset corners</button>
        <button onClick={() => st.rotate(s.id)} title="Rotate content 90°">Rotate 90°</button>
      </div>
    </>
  );
}
