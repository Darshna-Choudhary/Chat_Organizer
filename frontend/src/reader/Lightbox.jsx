import { useEffect, useState } from 'react';

// Full-screen photo. Makes its own object URL so it stays valid even if the chat row scrolls away.
export default function Lightbox({ store, name, onClose }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    let made = null;
    store
      .getBlob(name)
      .then((blob) => {
        if (!alive) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [store, name]);

  return (
    <div className="lightbox" role="dialog" aria-label="Photo" onClick={onClose}>
      <button className="lb-close" aria-label="Close photo" onClick={onClose}>{'\u2715'}</button>
      {url ? <img src={url} alt={name} onClick={(e) => e.stopPropagation()} /> : <p>Loading...</p>}
      {url && <a className="lb-save" href={url} download={name} onClick={(e) => e.stopPropagation()}>Save</a>}
    </div>
  );
}
