import { useRef } from 'react';
import { migrateSurface } from '../../lib/surfaces';
import { useStore, type SaveState } from '../../store';
import type { Surface } from '../../types';

const SAVE_LABEL: Record<SaveState, string> = {
  idle: '', dirty: 'Unsaved…', saving: 'Saving…', saved: 'Saved', error: 'Save failed',
};

export function ProjectSection() {
  const projects = useStore(st => st.projects);
  const projectId = useStore(st => st.projectId);
  const projectName = useStore(st => st.projectName);
  const saveState = useStore(st => st.saveState);
  const st = useStore.getState();
  const importRef = useRef<HTMLInputElement>(null);

  const run = (p: Promise<unknown>) => p.catch(e => st.showToast((e as Error).message));

  const exportJson = () => {
    const { projectName: name, surfaces } = useStore.getState();
    const blob = new Blob([JSON.stringify({ name, surfaces }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/[^\w-]+/g, '_') || 'projection-map'}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importJson = async (f: File) => {
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.surfaces)) throw new Error('no "surfaces" array');
      const surfaces: Surface[] = d.surfaces.map((s: Partial<Surface>, i: number) => migrateSurface(s, i));
      await st.newProject(d.name || f.name.replace(/\.json$/i, ''), surfaces);
      st.showToast(`Imported ${surfaces.length} surfaces as a new project`);
    } catch (e) {
      st.showToast('Import failed: ' + (e as Error).message);
    }
  };

  return (
    <>
      <h4>
        Project <span className={'save ' + saveState}>{SAVE_LABEL[saveState]}</span>
      </h4>
      <label className="f">
        <span>Open</span>
        <select value={projectId ?? ''} onChange={e => run(st.openProject(e.target.value))}>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.id === projectId ? projectName : p.name}</option>
          ))}
        </select>
      </label>
      <label className="f">
        <span>Name</span>
        <input type="text" value={projectName} onChange={e => st.renameProject(e.target.value || 'Untitled')} />
      </label>
      <div className="row">
        <button onClick={() => run(st.newProject('Untitled'))}>New</button>
        <button onClick={exportJson}>Export</button>
        <button onClick={() => importRef.current?.click()}>Import</button>
        <button className="danger" onClick={() => confirm(`Delete project "${projectName}"?`) && run(st.deleteProject())}>Delete</button>
      </div>
      <input ref={importRef} type="file" accept=".json,application/json" hidden
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importJson(f); }} />
    </>
  );
}
