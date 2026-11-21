import { useState } from 'react';
import './reader.css';

export default function StartScreen({ onFile, error, busy }) {
  const [order, setOrder] = useState('auto');
  const [drag, setDrag] = useState(false);

  const pick = (file) => file && onFile(file, order);

  return (
    <div className="start">
      <div className="start-card">
        <h1>Chat Reader</h1>
        <p className="muted">Open an exported WhatsApp chat (.txt). It is read and kept only in this browser. Nothing is uploaded.</p>

        <label
          className={`drop${drag ? ' drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        >
          <input type="file" accept=".txt,text/plain" disabled={busy} onChange={(e) => pick(e.target.files[0])} />
          {busy ? 'Reading your chat...' : 'Choose a chat file or drop it here'}
        </label>

        <label className="order">
          Date format
          <select value={order} onChange={(e) => setOrder(e.target.value)} disabled={busy}>
            <option value="auto">Detect automatically</option>
            <option value="MDY">Month/Day/Year (11/18/24)</option>
            <option value="DMY">Day/Month/Year (18/11/24)</option>
          </select>
        </label>

        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
