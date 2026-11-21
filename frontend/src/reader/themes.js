// Themes and appearance. Pure data + helpers (no React). Everything is plain CSS variables so the
// layout never changes, only the look. No remote fonts or images: works fully offline.

const BASE = {
  '--wallpaper': '#efeae2',
  '--bar': '#008069',
  '--bar-text': '#ffffff',
  '--bar-ctl': 'rgba(255,255,255,.2)',
  '--bubble-them': '#ffffff',
  '--bubble-me': '#d9fdd3',
  '--them-text': '#111b21',
  '--me-text': '#111b21',
  '--me-link': '#027eb5',
  '--me-meta': '#667781',
  '--text': '#111b21',
  '--muted': '#667781',
  '--chip': '#ffffff',
  '--chip-sys': '#fff3c5',
  '--panel': '#ffffff',
  '--line': '#e9edef',
  '--flash': '#fff6a8',
  '--accent': '#008069',
  '--link': '#027eb5',
  '--name-l': '38%',
  '--scheme': 'light',
  '--pattern': 'rgba(0,0,0,.07)',
  '--radius': '8px',
  '--first-corner': '0px',
  '--tail': 'block',
};

const SYSTEM_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

export const FONTS = {
  system: { name: 'System', stack: SYSTEM_FONT },
  serif: { name: 'Serif', stack: "Georgia, 'Times New Roman', 'Noto Serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', serif" },
  rounded: { name: 'Rounded', stack: "ui-rounded, 'SF Pro Rounded', Nunito, Quicksand, system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif" },
  mono: { name: 'Typewriter', stack: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', monospace" },
  hand: { name: 'Handwritten', stack: "'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Comic Sans MS', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', cursive" },
};

function theme(id, name, font, vars) {
  return { id, name, font: FONTS[font].stack, vars: { ...BASE, ...vars } };
}

export const THEMES = [
  theme('whatsapp-light', 'WhatsApp Light', 'system', {}),
  theme('whatsapp-dark', 'WhatsApp Dark', 'system', {
    '--wallpaper': '#0b141a', '--bar': '#202c33', '--bar-text': '#e9edef', '--bar-ctl': 'rgba(255,255,255,.1)',
    '--bubble-them': '#202c33', '--bubble-me': '#005c4b', '--them-text': '#e9edef', '--me-text': '#e9edef',
    '--me-link': '#53bdeb', '--me-meta': '#8fb3a9', '--text': '#e9edef', '--muted': '#8696a0', '--chip': '#182229',
    '--chip-sys': '#1d2b30', '--panel': '#111b21', '--line': '#233138', '--flash': '#4a4a1f', '--accent': '#00a884',
    '--link': '#53bdeb', '--name-l': '70%', '--scheme': 'dark', '--pattern': 'rgba(255,255,255,.05)',
  }),
  theme('classic', 'Classic', 'system', {
    '--wallpaper': '#e5ddd5', '--bar': '#075e54', '--bubble-me': '#dcf8c6', '--them-text': '#303030', '--me-text': '#303030',
    '--text': '#303030', '--muted': '#8a8a8a', '--me-meta': '#8a8a8a', '--chip': '#e1f3fb', '--chip-sys': '#fcf4cb',
    '--line': '#e5e5e5', '--accent': '#075e54', '--link': '#34b7f1', '--me-link': '#34b7f1', '--radius': '7px',
  }),
  theme('imessage', 'iMessage', 'system', {
    '--wallpaper': '#ffffff', '--bar': '#f6f6f8', '--bar-text': '#111111', '--bar-ctl': 'rgba(0,0,0,.06)',
    '--bubble-them': '#e9e9eb', '--bubble-me': '#0a84ff', '--them-text': '#111111', '--me-text': '#ffffff',
    '--me-link': '#ffffff', '--me-meta': 'rgba(255,255,255,.75)', '--text': '#111111', '--muted': '#8a8a8e',
    '--chip': '#f2f2f7', '--chip-sys': '#f2f2f7', '--line': '#e5e5ea', '--accent': '#0a84ff', '--link': '#0a6cd6',
    '--radius': '18px', '--first-corner': '18px', '--tail': 'none',
  }),
  theme('sepia', 'Sepia Diary', 'serif', {
    '--wallpaper': '#f4ecd8', '--bar': '#6b4f2a', '--bar-text': '#fdf6e3', '--bubble-them': '#fffaf0', '--bubble-me': '#eadcb8',
    '--them-text': '#3b2f1e', '--me-text': '#3b2f1e', '--me-link': '#8b4513', '--me-meta': '#8a7655', '--text': '#3b2f1e',
    '--muted': '#8a7655', '--chip': '#efe3c4', '--chip-sys': '#e8d9a8', '--panel': '#fffaf0', '--line': '#e3d6b5',
    '--flash': '#f7e08a', '--accent': '#6b4f2a', '--link': '#8b4513', '--name-l': '30%', '--radius': '6px', '--tail': 'none',
  }),
  theme('midnight', 'Midnight', 'system', {
    '--wallpaper': '#000000', '--bar': '#0d0d12', '--bar-text': '#e8e6f2', '--bar-ctl': 'rgba(255,255,255,.1)',
    '--bubble-them': '#17171f', '--bubble-me': '#5b3fd1', '--them-text': '#e8e6f2', '--me-text': '#ffffff', '--me-link': '#d8d0ff',
    '--me-meta': 'rgba(255,255,255,.7)', '--text': '#e8e6f2', '--muted': '#8a88a0', '--chip': '#14141b', '--chip-sys': '#1b1a26',
    '--panel': '#101016', '--line': '#24232f', '--flash': '#3a3560', '--accent': '#8b6cff', '--link': '#a99bff', '--name-l': '72%',
    '--scheme': 'dark', '--pattern': 'rgba(255,255,255,.05)', '--radius': '14px', '--first-corner': '14px', '--tail': 'none',
  }),
  theme('rose', 'Rose', 'rounded', {
    '--wallpaper': '#fff0f3', '--bar': '#e8537a', '--bubble-me': '#ffd1dc', '--them-text': '#4a1f2b', '--me-text': '#4a1f2b',
    '--me-link': '#c2185b', '--me-meta': '#a0687a', '--text': '#4a1f2b', '--muted': '#a0687a', '--chip': '#ffe0e8',
    '--chip-sys': '#fff3cd', '--line': '#f6d4dc', '--flash': '#ffe58f', '--accent': '#e8537a', '--link': '#c2185b',
    '--name-l': '36%', '--radius': '16px', '--first-corner': '4px', '--tail': 'none', '--pattern': 'rgba(232,83,122,.10)',
  }),
];

const HEART = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cpath d='M28 38C18 31 18 24 23 22c3-1 5 1 5 3 0-2 2-4 5-3 5 2 5 9-5 16z' fill='%23e8537a' fill-opacity='.14'/%3E%3C/svg%3E\")";

export const WALLPAPERS = [
  { id: 'dots', name: 'Dots', image: 'radial-gradient(var(--pattern) 1.3px, transparent 1.6px)', size: '18px 18px', repeat: 'repeat' },
  { id: 'grid', name: 'Grid', image: 'linear-gradient(var(--pattern) 1px, transparent 1px), linear-gradient(90deg, var(--pattern) 1px, transparent 1px)', size: '24px 24px', repeat: 'repeat' },
  { id: 'stripes', name: 'Stripes', image: 'repeating-linear-gradient(45deg, var(--pattern) 0 1px, transparent 1px 14px)', size: 'auto', repeat: 'repeat' },
  { id: 'hearts', name: 'Hearts', image: HEART, size: '56px 56px', repeat: 'repeat' },
  { id: 'sunset', name: 'Sunset', image: 'linear-gradient(160deg, #fde2c8, #f7b6c2 55%, #c3a6e8)', size: 'cover', repeat: 'no-repeat' },
  { id: 'ocean', name: 'Ocean', image: 'linear-gradient(160deg, #cfeefc, #a8d8f0 55%, #8fb8f0)', size: 'cover', repeat: 'no-repeat' },
  { id: 'night', name: 'Night', image: 'linear-gradient(160deg, #0f2027, #203a43 55%, #2c5364)', size: 'cover', repeat: 'no-repeat' },
];

export const DEFAULT_APPEARANCE = {
  theme: 'whatsapp-light',
  bubbleMe: null, // custom hex, or null to use the theme's color
  bubbleThem: null,
  wallpaper: { kind: 'theme' }, // { kind: 'theme' } | { kind: 'preset', id } | { kind: 'image', dataUrl }
  font: 'theme', // 'theme' or a key of FONTS
  fontSize: 15,
  density: 'cozy', // 'cozy' | 'compact'
};

export const FONT_SIZE_RANGE = { min: 13, max: 22 };

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

// Black or white text, whichever reads better on the given #rrggbb background.
export function readableText(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#111b21';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111b21' : '#ffffff';
}

// Appearance settings -> CSS variables for the .app wrapper.
export function buildStyle(appearance) {
  const a = { ...DEFAULT_APPEARANCE, ...appearance };
  const t = getTheme(a.theme);
  const vars = { ...t.vars };

  if (/^#[0-9a-f]{6}$/i.test(a.bubbleMe || '')) {
    const text = readableText(a.bubbleMe);
    vars['--bubble-me'] = a.bubbleMe;
    vars['--me-text'] = text;
    vars['--me-link'] = text === '#ffffff' ? '#ffffff' : t.vars['--link'];
    vars['--me-meta'] = text === '#ffffff' ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.5)';
  }
  if (/^#[0-9a-f]{6}$/i.test(a.bubbleThem || '')) {
    vars['--bubble-them'] = a.bubbleThem;
    vars['--them-text'] = readableText(a.bubbleThem);
  }

  const wp = a.wallpaper || { kind: 'theme' };
  const preset = wp.kind === 'preset' ? WALLPAPERS.find((p) => p.id === wp.id) : null;
  if (preset) {
    vars['--wp-image'] = preset.image;
    vars['--wp-size'] = preset.size;
    vars['--wp-repeat'] = preset.repeat;
    vars['--wp-pos'] = 'center';
  } else if (wp.kind === 'image' && typeof wp.dataUrl === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(wp.dataUrl)) {
    vars['--wp-image'] = `url("${wp.dataUrl}")`;
    vars['--wp-size'] = 'cover';
    vars['--wp-repeat'] = 'no-repeat';
    vars['--wp-pos'] = 'center';
  } else {
    vars['--wp-image'] = 'none';
    vars['--wp-size'] = 'auto';
    vars['--wp-repeat'] = 'repeat';
    vars['--wp-pos'] = '0 0';
  }

  vars['--font-stack'] = a.font !== 'theme' && FONTS[a.font] ? FONTS[a.font].stack : t.font;
  const size = Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, Number(a.fontSize) || DEFAULT_APPEARANCE.fontSize));
  vars['--fs'] = size + 'px';

  const compact = a.density === 'compact';
  vars['--pad-y'] = compact ? '3px' : '5px';
  vars['--pad-b'] = compact ? '2px' : '4px';
  vars['--row-pad'] = compact ? '0px' : '1px';
  vars['--first-gap'] = compact ? '3px' : '7px';
  vars['--chip-pt'] = compact ? '6px' : '10px';
  return vars;
}
