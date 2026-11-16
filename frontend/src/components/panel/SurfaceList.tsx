import { meshActive } from '../../lib/geometry';
import { useStore } from '../../store';
import type { ContentType } from '../../types';

const TAG: Partial<Record<ContentType, string>> = {
  youtube: 'YT', web: 'WEB', videourl: 'URL', imageurl: 'URL', webcam: 'CAM', screen: 'CAP', video: 'VID', image: 'IMG',
};

export function SurfaceList() {
  const surfaces = useStore(st => st.surfaces);
  const sel = useStore(st => st.sel);
  const st = useStore.getState();

  return (
    <>
      <h4>Surfaces</h4>
      <div className="row">
        <button className="primary" onClick={st.addSurface}>+ Surface</button>
        <button disabled={!sel} onClick={() => sel && st.duplicateSurface(sel)}>Duplicate</button>
        <button className="danger" disabled={!sel} onClick={() => sel && st.deleteSurface(sel)}>Delete</button>
      </div>
      <ul className="list">
        {surfaces.length === 0 && <li className="empty">No surfaces — click + Surface</li>}
        {surfaces.slice().reverse().map(s => (
          <li key={s.id} className={(s.id === sel ? 'sel ' : '') + (s.visible ? '' : 'hid')} onClick={() => st.select(s.id)}>
            <span className="dot" style={{ background: s.color }} />
            <span className="nm">{s.name}</span>
            {meshActive(s) && <span className="tag">MESH</span>}
            {TAG[s.content] && <span className="tag">{TAG[s.content]}</span>}
            <span className="eye" title="Toggle visibility"
              onClick={e => { e.stopPropagation(); st.updateSurface(s.id, { visible: !s.visible }); }}>
              {s.visible ? '👁' : '–'}
            </span>
          </li>
        ))}
      </ul>
      <div className="row" style={{ marginTop: 6 }}>
        <button disabled={!sel} onClick={() => sel && st.reorder(sel, 1)}>▲ Forward</button>
        <button disabled={!sel} onClick={() => sel && st.reorder(sel, -1)}>▼ Back</button>
      </div>
    </>
  );
}
