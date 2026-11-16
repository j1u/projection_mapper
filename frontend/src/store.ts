import { create } from 'zustand';
import { api } from './lib/api';
import { rotateSurface, resampleMesh, uniformGrid } from './lib/geometry';
import { dropCapture, shareCapture, subscribeLive } from './lib/live';
import { migrateSurface, newSurface, uid } from './lib/surfaces';
import type { MediaItem, Point, ProjectSummary, Surface, Viewport } from './types';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface Store {
  // project
  projectId: string | null;
  projectName: string;
  projects: ProjectSummary[];
  surfaces: Surface[];
  saveState: SaveState;
  backendError: string | null;
  loading: boolean;
  // media library
  media: MediaItem[];
  // selection
  sel: string | null;
  corner: number;
  mpt: number | null;
  // ui
  edit: boolean;
  panelHidden: boolean;
  panelRight: boolean;
  blackout: boolean;
  viewport: Viewport;
  liveVersion: number;
  toast: { msg: string; id: number } | null;

  // actions
  showToast(msg: string): void;
  setViewport(vp: Viewport): void;
  setUi(patch: Partial<Pick<Store, 'edit' | 'panelHidden' | 'panelRight' | 'blackout'>>): void;
  select(id: string | null): void;
  selectCorner(i: number): void;
  selectMeshPoint(k: number | null): void;

  updateSurface(id: string, patch: Partial<Surface> | ((s: Surface) => Surface)): void;
  addSurface(): void;
  deleteSurface(id: string): void;
  duplicateSurface(id: string): void;
  reorder(id: string, dir: 1 | -1): void;
  selectAdjacent(dir: 1 | -1): void;
  resetCorners(id: string): void;
  rotate(id: string): void;
  setMeshSize(id: string, cols: number, rows: number): void;
  flattenMesh(id: string): void;

  refreshProjects(): Promise<void>;
  openProject(id: string): Promise<void>;
  newProject(name: string, surfaces?: Surface[]): Promise<void>;
  renameProject(name: string): void;
  deleteProject(): Promise<void>;
  refreshMedia(): Promise<void>;
  addMedia(item: MediaItem): void;
  deleteMedia(id: string): Promise<void>;
}

const LAST_PROJECT = 'pm.lastProject';

// ---------- autosave ----------
let saveTimer: ReturnType<typeof setTimeout> | undefined;

async function doSave(keepalive = false) {
  saveTimer = undefined;
  const { projectId, projectName, surfaces } = useStore.getState();
  if (!projectId) return;
  useStore.setState({ saveState: 'saving' });
  try {
    await api.updateProject(projectId, { name: projectName, surfaces }, keepalive);
    if (!saveTimer && useStore.getState().projectId === projectId) useStore.setState({ saveState: 'saved' });
  } catch (e) {
    useStore.setState({ saveState: 'error' });
    useStore.getState().showToast('Save failed: ' + (e as Error).message);
  }
}

function markDirty() {
  useStore.setState({ saveState: 'dirty' });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 500);
}

export async function flushSave(keepalive = false) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    await doSave(keepalive);
  }
}

// ---------- store ----------
export const useStore = create<Store>()((set, get) => {
  /** Apply a change to the surfaces array and schedule a save. */
  const setSurfaces = (fn: (list: Surface[]) => Surface[], extra: Partial<Store> = {}) => {
    set(st => ({ surfaces: fn(st.surfaces), ...extra }));
    markDirty();
  };
  const mapOne = (id: string, fn: (s: Surface) => Surface) => setSurfaces(list => list.map(s => (s.id === id ? fn(s) : s)));

  return {
    projectId: null,
    projectName: '',
    projects: [],
    surfaces: [],
    saveState: 'idle',
    backendError: null,
    loading: true,
    media: [],
    sel: null,
    corner: 0,
    mpt: null,
    edit: true,
    panelHidden: false,
    panelRight: false,
    blackout: false,
    viewport: { w: Math.max(1, window.innerWidth), h: Math.max(1, window.innerHeight) },
    liveVersion: 0,
    toast: null,

    showToast: msg => set({ toast: { msg, id: Date.now() } }),
    setViewport: ({ w, h }) => set({ viewport: { w: Math.max(1, w), h: Math.max(1, h) } }),
    setUi: patch => set(patch),
    select: id => set({ sel: id, mpt: null }),
    selectCorner: i => set({ corner: i, mpt: null }),
    selectMeshPoint: k => set({ mpt: k }),

    updateSurface: (id, patch) => mapOne(id, s => (typeof patch === 'function' ? patch(s) : { ...s, ...patch })),

    addSurface: () => {
      const s = newSurface(get().surfaces.length);
      setSurfaces(list => [...list, s], { sel: s.id, corner: 0, mpt: null });
    },
    deleteSurface: id => {
      const list = get().surfaces, i = list.findIndex(s => s.id === id);
      if (i < 0) return;
      dropCapture(id);
      const rest = list.filter(s => s.id !== id);
      setSurfaces(() => rest, { sel: rest[Math.min(i, rest.length - 1)]?.id ?? null, mpt: null });
    },
    duplicateSurface: id => {
      const s = get().surfaces.find(x => x.id === id);
      if (!s) return;
      const d: Surface = structuredClone(s);
      d.id = uid();
      d.name = s.name + ' copy';
      d.pts = d.pts.map(([x, y]): Point => [x + 0.03, y + 0.03]);
      shareCapture(s.id, d.id);
      setSurfaces(list => [...list, d], { sel: d.id, mpt: null });
    },
    reorder: (id, dir) => {
      const list = get().surfaces.slice(), i = list.findIndex(s => s.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      setSurfaces(() => list);
    },
    selectAdjacent: dir => {
      const { surfaces: list, sel } = get();
      if (!list.length) return;
      const i = Math.max(0, list.findIndex(s => s.id === sel));
      set({ sel: list[(i + dir + list.length) % list.length].id, mpt: null });
    },
    resetCorners: id => mapOne(id, s => ({ ...s, pts: [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]] })),
    rotate: id => {
      mapOne(id, rotateSurface);
      set({ mpt: null });
    },
    setMeshSize: (id, cols, rows) => {
      mapOne(id, s => ({ ...s, mesh: resampleMesh(s.mesh, cols, rows) }));
      set({ mpt: null });
    },
    flattenMesh: id => {
      mapOne(id, s => ({ ...s, mesh: { ...s.mesh, pts: uniformGrid(s.mesh.cols, s.mesh.rows) } }));
      set({ mpt: null });
    },

    // ---------- server ----------
    refreshProjects: async () => set({ projects: await api.listProjects() }),

    openProject: async id => {
      await flushSave();
      const p = await api.getProject(id);
      localStorage.setItem(LAST_PROJECT, p.id);
      set({
        projectId: p.id,
        projectName: p.name,
        surfaces: p.surfaces.map(migrateSurface),
        sel: p.surfaces[0]?.id ?? null,
        corner: 0,
        mpt: null,
        saveState: 'saved',
        loading: false,
      });
    },
    newProject: async (name, surfaces) => {
      await flushSave();
      const p = await api.createProject({ name, surfaces: surfaces ?? [newSurface(0)] });
      await get().refreshProjects();
      await get().openProject(p.id);
    },
    renameProject: name => {
      set({ projectName: name });
      markDirty();
      set(st => ({ projects: st.projects.map(p => (p.id === st.projectId ? { ...p, name } : p)) }));
    },
    deleteProject: async () => {
      const id = get().projectId;
      if (!id) return;
      clearTimeout(saveTimer);
      saveTimer = undefined;
      await api.deleteProject(id);
      await get().refreshProjects();
      const next = get().projects[0];
      if (next) await get().openProject(next.id);
      else await get().newProject('Untitled');
    },

    refreshMedia: async () => set({ media: await api.listMedia() }),
    addMedia: item => set(st => ({ media: [item, ...st.media] })),
    deleteMedia: async id => {
      await api.deleteMedia(id);
      set(st => ({ media: st.media.filter(m => m.id !== id) }));
      setSurfaces(list => list.map(s => (s.mediaId === id ? { ...s, mediaId: null } : s)));
    },
  };
});

subscribeLive(() => useStore.setState(st => ({ liveVersion: st.liveVersion + 1 })));

export const useSelected = () => useStore(st => st.surfaces.find(s => s.id === st.sel) ?? null);

/** Load projects + media and open the last-used project (creating one on first run). */
let booted = false;
export async function boot() {
  if (booted) return; // StrictMode runs effects twice in dev
  booted = true;
  const st = useStore.getState();
  try {
    const [projects, media] = await Promise.all([api.listProjects(), api.listMedia()]);
    useStore.setState({ projects, media, backendError: null });
    const last = localStorage.getItem(LAST_PROJECT);
    const id = projects.find(p => p.id === last)?.id ?? projects[0]?.id;
    if (id) await st.openProject(id);
    else await st.newProject('My first project');
  } catch (e) {
    useStore.setState({ backendError: (e as Error).message || 'Backend not reachable', loading: false });
  }
}
