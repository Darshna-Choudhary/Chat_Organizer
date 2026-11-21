import { useContext, useEffect, useState } from 'react';
import { MediaContext } from './MediaContext.js';
import { fmtSize, isVoiceNote, mediaKind } from '../media/kinds.js';

const AUTO_LIMIT = 8 * 1024 * 1024; // bigger zip entries wait for a tap so scrolling stays fast

// Object URL for one file, created only while this row is on screen and revoked when it leaves.
function useObjectUrl(store, name, enabled) {
  const [state, setState] = useState({ name: null, url: null, error: false });
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    let made = null;
    store
      .getBlob(name)
      .then((blob) => {
        if (!alive) return;
        made = URL.createObjectURL(blob);
        setState({ name, url: made, error: false });
      })
      .catch(() => alive && setState({ name, url: null, error: true }));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [store, name, enabled]);
  return state.name === name ? state : { name, url: null, error: false };
}

async function download(store, name) {
  const blob = await store.getBlob(name);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function MediaView({ name }) {
  const { store, openImage } = useContext(MediaContext);
  const entry = store ? store.get(name) : null;
  const kind = mediaKind(name);
  const [tapped, setTapped] = useState(false);
  const [broken, setBroken] = useState(false);

  const small = !!entry && (entry.cheap || (entry.size ?? 0) <= AUTO_LIMIT);
  const wantsLoad = !!entry && kind !== 'document' && (kind === 'video' ? entry.cheap || tapped : small || tapped);
  const { url, error } = useObjectUrl(store, name, wantsLoad);
  const size = entry && entry.size != null ? ' \u00B7 ' + fmtSize(entry.size) : '';

  if (!store) return <span className="media">{'\u{1F4CE} '}{name}</span>;
  if (!entry) return <span className="media missing">{'\u{1F4CE} '}{name}<small> {'\u00B7'} not in your media files</small></span>;

  const docChip = (label) => (
    <button className="doc" onClick={() => download(store, name)}>
      {'\u{1F4C4} '}{name}<small>{size}{label}</small>
    </button>
  );
  if (kind === 'document') return docChip(' \u00B7 tap to save');
  if (error || broken) return docChip(" \u00B7 can't preview, tap to save");

  if (kind === 'image' || kind === 'sticker') {
    if (url) {
      return (
        <img
          className={kind === 'sticker' ? 'mimg sticker-img' : 'mimg'}
          src={url}
          alt={name}
          onClick={() => kind === 'image' && openImage(name)}
          onError={() => setBroken(true)}
        />
      );
    }
    if (!wantsLoad) return <button className="play" onClick={() => setTapped(true)}>{'\u{1F5BC} '}Photo{size} {'\u00B7'} tap to load</button>;
    return <div className="ph">Loading...</div>;
  }

  if (kind === 'video') {
    if (url) return <video className="mvid" controls preload="metadata" playsInline src={url} />;
    if (!wantsLoad) return <button className="play" onClick={() => setTapped(true)}>{'\u25B6 '}Video{size} {'\u00B7'} tap to load</button>;
    return <div className="ph">Loading...</div>;
  }

  // audio
  const label = isVoiceNote(name) ? '\u{1F3A4} Voice message' : '\u{1F3B5} ' + name;
  return (
    <div className="maudio">
      <div className="muted">{label}{size}</div>
      {url ? <audio controls preload="metadata" src={url} /> : wantsLoad ? <div className="ph slim">Loading...</div> : <button className="play" onClick={() => setTapped(true)}>{'\u25B6 '}tap to load</button>}
    </div>
  );
}
