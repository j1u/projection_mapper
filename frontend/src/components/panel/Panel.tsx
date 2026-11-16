import { setEditMode, toggleBlackout, toggleFullscreen } from '../../hooks/useKeyboard';
import { useStore } from '../../store';
import { MediaLibrary } from './MediaLibrary';
import { ProjectSection } from './ProjectSection';
import { SurfaceList } from './SurfaceList';
import { SurfaceProps } from './SurfaceProps';

const SHORTCUTS: [string, string][] = [
  ['Tab', 'Toggle edit / output mode'], ['F', 'Fullscreen'], ['H', 'Hide / show panel'], ['B', 'Blackout'],
  ['N', 'New surface'], ['M', 'Toggle mesh warp'], ['1–4', 'Select corner'],
  ['←↑↓→', 'Nudge selected point 1px (Shift: 10px)'], ['Ctrl+←↑↓→', 'Move whole surface'],
  ['[ ]', 'Previous / next surface'], ['Del', 'Delete surface'], ['Shift+drag', 'Fine adjust'],
];

export function Panel() {
  const right = useStore(st => st.panelRight);
  const st = useStore.getState();
  return (
    <div className={'panel' + (right ? ' right' : '')}>
      <header>
        <span>◩ Projection Mapper</span>
        <button title="Move panel to other side" onClick={() => st.setUi({ panelRight: !right })}>⇆</button>
        <button title="Hide panel (H)" onClick={() => { st.setUi({ panelHidden: true }); st.showToast('Panel hidden — press H to show'); }}>✕</button>
      </header>
      <div className="scroll">
        <ProjectSection />
        <SurfaceList />
        <SurfaceProps />

        <h4>Output</h4>
        <div className="row">
          <button className="primary" onClick={toggleFullscreen}>Fullscreen (F)</button>
          <button onClick={() => setEditMode(false)}>Output mode (Tab)</button>
        </div>
        <div className="row"><button onClick={toggleBlackout}>Blackout (B)</button></div>
        <p className="hint">Drag this browser window onto the projector display, press <kbd>F</kbd>, then drag the corner handles onto your physical surface.</p>

        <MediaLibrary />

        <details>
          <summary>Keyboard shortcuts</summary>
          <div className="keys">
            {SHORTCUTS.map(([k, d]) => [<kbd key={k}>{k}</kbd>, <span key={k + 'd'}>{d}</span>])}
          </div>
        </details>
      </div>
    </div>
  );
}
