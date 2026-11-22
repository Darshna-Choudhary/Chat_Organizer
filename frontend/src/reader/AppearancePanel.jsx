import { useState } from 'react';
import { FONTS, FONT_SIZE_RANGE, THEMES, WALLPAPERS, buildStyle, getTheme, wallpaperUrl, daylightThemeId } from './themes.js';
import { fileToWallpaper } from './wallpaper.js';

const COLORS = {};
function previewOf(id) {
  if (!COLORS[id]) COLORS[id] = buildStyle({ theme: id }, new Date(2026, 0, 1, 12));
  return COLORS[id];
}

function ThemeSwatch({ theme }) {
  let bg;
  let them;
  let me;
  let radius;
  if (theme.id === 'daylight') {
    const hours = [7, 12, 18, 22].map((h) => previewOf(daylightThemeId(new Date(2026, 0, 1, h))));
    bg = { backgroundImage: `linear-gradient(90deg, ${hours.map((v) => v['--wallpaper']).join(', ')})` };
    them = '#ffffff';
    me = '#ffffff';
    radius = '10px';
  } else {
    const v = previewOf(theme.id);
    bg = { backgroundColor: v['--wp-color'], backgroundImage: v['--wp-image'] };
    them = v['--bubble-them'];
    me = v['--bubble-me'];
    radius = v['--radius'];
  }
  return (
    <span className="swatch" style={bg}>
      <i style={{ background: them, borderRadius: radius }} />
      <i style={{ background: me, borderRadius: radius }} />
    </span>
  );
}

function ThemeGrid({ group, appearance, onChange }) {
  return (
    <div className="theme-grid">
      {THEMES.filter((t) => t.group === group).map((t) => (
        <button key={t.id} className={`theme-card${appearance.theme === t.id ? ' on' : ''}`} title={t.blurb} aria-label={t.name} aria-pressed={appearance.theme === t.id} onClick={() => onChange({ theme: t.id })}>
          <ThemeSwatch theme={t} />
          <span>{t.name}</span>
        </button>
      ))}
    </div>
  );
}

// Side drawer, so the chat stays visible and changes show up live.
export default function AppearancePanel({ appearance: a, onChange, onReset, onClose }) {
  const [error, setError] = useState(null);
  const theme = getTheme(a.theme);
  const wp = a.wallpaper || { kind: 'theme' };

  async function pickImage(file) {
    if (!file) return;
    setError(null);
    try {
      onChange({ wallpaper: { kind: 'image', dataUrl: await fileToWallpaper(file) } });
    } catch (err) {
      setError(err.message || 'Could not use this image.');
    }
  }

  return (
    <aside className="drawer" role="dialog" aria-label="Appearance">
      <div className="modal-head">
        <b>Appearance</b>
        <button onClick={onClose} aria-label="Close appearance">{'\u2715'}</button>
      </div>

      <h3>Theme</h3>
      <p className="hint">Romantic</p>
      <ThemeGrid group="romantic" appearance={a} onChange={onChange} />
      <p className="hint">Familiar</p>
      <ThemeGrid group="familiar" appearance={a} onChange={onChange} />

      <h3>Bubble colors</h3>
      <div className="color-row">
        <label>Mine
          <input type="color" aria-label="My bubble color" value={a.bubbleMe || buildStyle({ theme: a.theme })['--bubble-me']} onChange={(e) => onChange({ bubbleMe: e.target.value })} />
        </label>
        <label>Theirs
          <input type="color" aria-label="Their bubble color" value={a.bubbleThem || buildStyle({ theme: a.theme })['--bubble-them']} onChange={(e) => onChange({ bubbleThem: e.target.value })} />
        </label>
        <button onClick={() => onChange({ bubbleMe: null, bubbleThem: null })}>Use theme colors</button>
      </div>

      <h3>Wallpaper</h3>
      <div className="wp-grid">
        <button className={`wp${wp.kind === 'theme' ? ' on' : ''}`} aria-label="Theme wallpaper" aria-pressed={wp.kind === 'theme'} onClick={() => onChange({ wallpaper: { kind: 'theme' } })}>
          <span className="wp-sw" style={{ backgroundColor: theme.wp ? undefined : theme.vars['--wallpaper'], backgroundImage: theme.wp ? wallpaperUrl(WALLPAPERS.find((p) => p.id === theme.wp)) : 'none' }} />Theme's own
        </button>
        <button className={`wp${wp.kind === 'none' ? ' on' : ''}`} aria-label="Plain wallpaper" aria-pressed={wp.kind === 'none'} onClick={() => onChange({ wallpaper: { kind: 'none' } })}>
          <span className="wp-sw" style={{ backgroundColor: theme.vars['--wallpaper'] }} />Plain
        </button>
        {WALLPAPERS.map((p) => (
          <button key={p.id} className={`wp${wp.kind === 'preset' && wp.id === p.id ? ' on' : ''}`} aria-label={`${p.name} wallpaper`} aria-pressed={wp.kind === 'preset' && wp.id === p.id} onClick={() => onChange({ wallpaper: { kind: 'preset', id: p.id } })}>
            <span className="wp-sw" style={{ backgroundColor: p.color, backgroundImage: wallpaperUrl(p) }} />{p.name}
          </button>
        ))}
        <label className={`wp${wp.kind === 'image' ? ' on' : ''}`}>
          <input type="file" accept="image/*" aria-label="Upload wallpaper" hidden onChange={(e) => pickImage(e.target.files[0])} />
          <span className="wp-sw plus">+</span>Your photo
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <h3>Text</h3>
      <label className="field">Font
        <select value={a.font} onChange={(e) => onChange({ font: e.target.value })}>
          <option value="theme">Theme default</option>
          {Object.entries(FONTS).map(([key, f]) => <option key={key} value={key}>{f.name}</option>)}
        </select>
      </label>
      <label className="field">Text size: {a.fontSize}px
        <input type="range" min={FONT_SIZE_RANGE.min} max={FONT_SIZE_RANGE.max} step="1" value={a.fontSize} aria-label="Text size" onChange={(e) => onChange({ fontSize: Number(e.target.value) })} />
      </label>

      <h3>Spacing</h3>
      <div className="seg">
        {['cozy', 'compact'].map((d) => (
          <button key={d} className={a.density === d ? 'on' : ''} aria-pressed={a.density === d} onClick={() => onChange({ density: d })}>{d === 'cozy' ? 'Cozy' : 'Compact'}</button>
        ))}
      </div>

      <button className="reset" onClick={onReset}>Reset appearance</button>
    </aside>
  );
}
