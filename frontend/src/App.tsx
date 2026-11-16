import { useEffect } from 'react';
import { Overlay } from './components/Overlay';
import { Panel } from './components/panel/Panel';
import { Stage } from './components/Stage';
import { Toast } from './components/Toast';
import { useKeyboard } from './hooks/useKeyboard';
import { autoStartCameras } from './lib/live';
import { boot, flushSave, useStore } from './store';

export default function App() {
  const edit = useStore(st => st.edit);
  const panelHidden = useStore(st => st.panelHidden);
  const blackout = useStore(st => st.blackout);
  const loading = useStore(st => st.loading);
  const backendError = useStore(st => st.backendError);
  const projectId = useStore(st => st.projectId);

  useKeyboard();

  useEffect(() => {
    boot();
    const onResize = () => useStore.getState().setViewport({ w: window.innerWidth, h: window.innerHeight });
    const onUnload = () => void flushSave(true);
    window.addEventListener('resize', onResize);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  // restart cameras for this project if permission was granted before
  useEffect(() => {
    if (!projectId) return;
    const ids = useStore.getState().surfaces.filter(s => s.content === 'webcam').map(s => s.deviceId);
    autoStartCameras(ids);
  }, [projectId]);

  if (backendError)
    return (
      <div className="splash">
        <h2>Can't reach the Projection Mapper server</h2>
        <p>{backendError}</p>
        <p>Start it with <code>start.bat</code> (or <code>uvicorn app.main:app</code> in <code>backend/</code>), then reload.</p>
        <button className="primary" onClick={() => location.reload()}>Retry</button>
      </div>
    );
  if (loading) return <div className="splash"><p>Loading…</p></div>;

  return (
    <div className={['app', edit && 'edit', blackout && 'blackout'].filter(Boolean).join(' ')}>
      <Stage />
      {edit && <Overlay />}
      {edit && !panelHidden && <Panel />}
      <Toast />
    </div>
  );
}
