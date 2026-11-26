// The optional opening screen, and the editor for it.
function Flourish() {
  return (
    <svg className="flourish" width="150" height="14" viewBox="0 0 150 14" aria-hidden="true">
      <path d="M0 7h58M92 7h58" stroke="currentColor" strokeWidth="1" opacity=".5" />
      <path d="M75 1.5l5.5 5.5L75 12.5 69.5 7z" fill="currentColor" opacity=".75" />
    </svg>
  );
}

export function WelcomeScreen({ welcome, summary, onStart }) {
  return (
    <div className="welcome" role="dialog" aria-label="Welcome">
      <div className="welcome-card">
        <h1>{welcome.title}</h1>
        <Flourish />
        {welcome.showSummary && summary && <p className="muted">{summary}</p>}
        {welcome.message && <p className="wmsg">{welcome.message}</p>}
        <button className="wstart" onClick={onStart}>{welcome.button || 'Start reading'}</button>
      </div>
    </div>
  );
}

export function WelcomeEditor({ welcome, onChange, onPreview, onClose }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Welcome screen settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>Welcome screen</b><button onClick={onClose} aria-label="Close welcome settings">{'\u2715'}</button></div>
        <label className="check"><input type="checkbox" checked={welcome.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} /> Show it when the chat opens</label>
        <label className="check"><input type="checkbox" checked={!!welcome.showOnce} onChange={(e) => onChange({ showOnce: e.target.checked })} /> Only the first time on this device</label>
        <label className="field">Title
          <input value={welcome.title} maxLength={80} onChange={(e) => onChange({ title: e.target.value })} />
        </label>
        <label className="field">Message
          <textarea rows={6} value={welcome.message} maxLength={2000} onChange={(e) => onChange({ message: e.target.value })} />
        </label>
        <label className="field">Button text
          <input value={welcome.button} maxLength={30} onChange={(e) => onChange({ button: e.target.value })} />
        </label>
        <label className="check"><input type="checkbox" checked={welcome.showSummary} onChange={(e) => onChange({ showSummary: e.target.checked })} /> Show the dates and message count</label>
        <div className="row-btns">
          <button onClick={onPreview}>Preview</button>
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
