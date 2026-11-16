import type { MediaItem, Project, ProjectSummary, Surface } from '../types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(method: string, path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  if (!r.ok) {
    let msg = r.statusText;
    try {
      const j = await r.json();
      msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail ?? j);
    } catch {
      /* not json */
    }
    throw new ApiError(r.status, msg);
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}

export interface ProjectBody {
  name?: string;
  surfaces?: Surface[];
}

export const api = {
  listProjects: () => req<ProjectSummary[]>('GET', '/api/projects'),
  getProject: (id: string) => req<Project>('GET', `/api/projects/${id}`),
  createProject: (body: ProjectBody) => req<Project>('POST', '/api/projects', body),
  updateProject: (id: string, body: ProjectBody, keepalive = false) =>
    req<Project>('PUT', `/api/projects/${id}`, body, { keepalive }),
  deleteProject: (id: string) => req<void>('DELETE', `/api/projects/${id}`),

  listMedia: () => req<MediaItem[]>('GET', '/api/media'),
  deleteMedia: (id: string) => req<void>('DELETE', `/api/media/${id}`),

  /** Upload with progress (fetch has no upload progress, so XHR). */
  uploadMedia(file: File, onProgress?: (fraction: number) => void): Promise<MediaItem> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/media');
      xhr.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
        else {
          let msg = xhr.statusText;
          try {
            msg = JSON.parse(xhr.responseText).detail ?? msg;
          } catch {
            /* ignore */
          }
          reject(new ApiError(xhr.status, msg));
        }
      };
      xhr.onerror = () => reject(new ApiError(0, 'Network error'));
      const fd = new FormData();
      fd.append('file', file);
      xhr.send(fd);
    });
  },
};
