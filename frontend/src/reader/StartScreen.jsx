import { useState } from 'react';
import { openPicked } from '../media/sources.js';
import { pickChatFile, pickDirectory } from '../media/pickers.js';
import './reader.css';

export default function StartScreen({ onOpen, error, busy }) {
  const [order, setOrder] = useState('auto');
  const [drag, setDrag] = useState(false);
  const [opening, setOpening] = useState(false);
  const [localError, setLocalError] = useState(null);
  const working = busy || opening;

  async function open(picked) {
    if (!picked) return;
    setLocalError(null);
    setOpening(true);
    try {
      await onOpen(await openPicked(picked), order);
    } catch (err) {
      setLocalError(err.message || 'Could not open this.');
    } finally {
      setOpening(false);
    }
  }

  function dropped(e) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!/\.(txt|zip)$/i.test(file.name)) {
      setLocalError('Please drop a .txt or .zip file. For a folder, use "Choose a folder".');
      return;
    }
    open({ kind: 'file', file });
  }

  return (
    <div className="start">
      <div className="start-card">
        <h1>Chat Reader</h1>
        <p className="muted">Open an exported WhatsApp chat. It is read and kept only in this browser. Nothing is uploaded.</p>

        <div
          className={`drop${drag ? ' drag' : ''}`}
          role="button"
          tabIndex={0}
          onClick={async () => !working && open(await pickChatFile())}
          onKeyDown={async (e) => e.key === 'Enter' && !working && open(await pickChatFile())}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={dropped}
        >
          {working ? 'Reading your chat...' : 'Choose a .txt or .zip export, or drop it here'}
        </div>
        <button className="alt" disabled={working} onClick={async () => open(await pickDirectory())}>Choose a folder (chat + photos)</button>
        <p className="muted small">A .zip or folder exported with "Include media" brings your photos, videos and voice notes along. You can also add them later from the settings menu.</p>

        <label className="order">
          Date format
          <select value={order} onChange={(e) => setOrder(e.target.value)} disabled={working}>
            <option value="auto">Detect automatically</option>
            <option value="MDY">Month/Day/Year (11/18/24)</option>
            <option value="DMY">Day/Month/Year (18/11/24)</option>
          </select>
        </label>

        {(localError || error) && <p className="error" role="alert">{localError || error}</p>}
      </div>
    </div>
  );
}
