import { useStore } from '../../store';

const fmtSize = (n: number) => (n > 1e9 ? (n / 1e9).toFixed(1) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.ceil(n / 1e3) + ' KB');

export function MediaLibrary() {
  const media = useStore(st => st.media);
  const st = useStore.getState();
  const remove = (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from the media library? Surfaces using it will go blank.`)) return;
    st.deleteMedia(id).catch(e => st.showToast((e as Error).message));
  };
  return (
    <details>
      <summary>Media library ({media.length})</summary>
      {media.length === 0 ? (
        <p className="hint">Uploaded images and videos are stored on the server and appear here.</p>
      ) : (
        <ul className="list media">
          {media.map(m => (
            <li key={m.id}>
              <span className="tag">{m.contentType.split('/')[0].toUpperCase()}</span>
              <span className="nm" title={m.name}>{m.name}</span>
              <span className="size">{fmtSize(m.size)}</span>
              <span className="eye" title="Delete" onClick={() => remove(m.id, m.name)}>🗑</span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
