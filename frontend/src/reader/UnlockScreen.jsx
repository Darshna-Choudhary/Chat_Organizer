import { useState } from 'react';

function Flourish() {
  return (
    <svg className="flourish" width="150" height="14" viewBox="0 0 150 14" aria-hidden="true">
      <path d="M0 7h58M92 7h58" stroke="currentColor" strokeWidth="1" opacity=".5" />
      <path d="M75 1.5l5.5 5.5L75 12.5 69.5 7z" fill="currentColor" opacity=".75" />
    </svg>
  );
}

// The first screen of a published vault: a private phrase opens everything.
export default function UnlockScreen({ meta, onUnlock, busy, error }) {
  const [phrase, setPhrase] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);

  function submit(e) {
    e.preventDefault();
    if (phrase.trim() && !busy) onUnlock(phrase, remember);
  }

  return (
    <div className="welcome">
      <form className="welcome-card unlock" onSubmit={submit} aria-label="Unlock">
        <h1>{meta.lockTitle || 'Welcome'}</h1>
        <Flourish />
        {meta.hint && <p className="muted">A little hint: {meta.hint}</p>}
        <div className="unlock-field">
          <input
            type={show ? 'text' : 'password'}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="Your secret phrase"
            aria-label="Secret phrase"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            disabled={busy}
          />
          <button type="button" className="unlock-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide phrase' : 'Show phrase'} aria-pressed={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && <p className="unlock-error" role="alert">{error}</p>}
        <button className="wstart" type="submit" disabled={busy || !phrase.trim()}>{busy ? 'Opening...' : 'Unlock'}</button>
        <label className="check unlock-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep this device unlocked
        </label>
      </form>
    </div>
  );
}
