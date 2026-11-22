// Themes and appearance. Pure data + helpers (no React). Everything is plain CSS variables so the
// layout never changes, only the look. Fonts are bundled with the app and wallpapers are drawn as SVG,
// so it all works fully offline.
import { WALLPAPERS, getWallpaper, wallpaperUrl } from './wallpapers.js';

export { WALLPAPERS, wallpaperUrl };

const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'";
const SYSTEM = `system-ui, -apple-system, 'Segoe UI', Roboto, ${EMOJI}, sans-serif`;
const NUNITO = `Nunito, ui-rounded, system-ui, ${EMOJI}, sans-serif`;
const LORA = `Lora, Georgia, 'Times New Roman', ${EMOJI}, serif`;
const CORMORANT = `'Cormorant Garamond', Georgia, 'Times New Roman', ${EMOJI}, serif`;
const CAVEAT = `Caveat, 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', ${EMOJI}, cursive`;

// scale: some typefaces run small, so they get a little extra size to feel the same.
export const FONTS = {
  system: { name: 'System', stack: SYSTEM, scale: 1 },
  rounded: { name: 'Soft (Nunito)', stack: NUNITO, scale: 1 },
  serif: { name: 'Storybook (Lora)', stack: LORA, scale: 1 },
  elegant: { name: 'Elegant (Cormorant)', stack: CORMORANT, scale: 1.18 },
  hand: { name: 'Handwritten (Caveat)', stack: CAVEAT, scale: 1.28 },
  mono: { name: 'Typewriter', stack: `ui-monospace, 'SFMono-Regular', Menlo, Consolas, ${EMOJI}, monospace`, scale: 1 },
};

const BASE = {
  '--wallpaper': '#efeae2',
  '--bar': '#008069',
  '--bar-img': 'none',
  '--bar-text': '#ffffff',
  '--bar-ctl': 'rgba(255,255,255,.2)',
  '--bubble-them': '#ffffff',
  '--bubble-me': '#d9fdd3',
  '--bubble-shadow': '0 1px .5px rgba(11,20,26,.13)',
  '--them-text': '#111b21',
  '--me-text': '#111b21',
  '--me-link': '#016a96',
  '--me-meta': '#566871',
  '--text': '#111b21',
  '--muted': '#667781',
  '--chip': '#ffffff',
  '--chip-sys': '#fff3c5',
  '--chip-font': 'inherit',
  '--chip-style': 'normal',
  '--chip-fs': 'calc(var(--fs) - 2.5px)',
  '--title-font': 'inherit',
  '--title-style': 'normal',
  '--title-fs': '16px',
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

// Shared by the romantic themes: Cormorant italics for the title and date chips.
const ROMANTIC = {
  '--chip-font': 'var(--display-font)',
  '--chip-style': 'italic',
  '--chip-fs': 'calc(var(--fs) + 2px)',
  '--title-font': 'var(--display-font)',
  '--title-style': 'italic',
  '--title-fs': '23px',
  '--tail': 'none',
};

function theme(id, name, group, blurb, font, wp, vars) {
  return { id, name, group, blurb, font, wp, vars: { ...BASE, ...vars } };
}

export const THEMES = [
  theme('golden-hour', 'Golden Hour', 'romantic', 'Warm apricot light, like the last hour of a perfect day', NUNITO, 'golden', {
    ...ROMANTIC,
    '--wallpaper': '#ffe6d0', '--bar': '#ffdcbc', '--bar-img': 'linear-gradient(180deg,#ffe8d2,#ffd6b4)', '--bar-text': '#5a2f20', '--bar-ctl': 'rgba(90,47,32,.09)',
    '--bubble-them': '#fffaf4', '--bubble-me': '#ffd8b6', '--bubble-shadow': '0 1px 2px rgba(160,90,50,.18)',
    '--them-text': '#4a2a1e', '--me-text': '#4a2a1e', '--me-link': '#a23f22', '--me-meta': '#85523c', '--text': '#4a2a1e', '--muted': '#87584a',
    '--chip': '#fff4e6', '--chip-sys': '#ffeab5', '--panel': '#fff8f0', '--line': '#f1dac6', '--flash': '#ffe39a', '--accent': '#b8502f', '--link': '#a23f22',
    '--name-l': '32%', '--pattern': 'rgba(150,80,50,.07)', '--radius': '18px', '--first-corner': '6px',
  }),
  theme('candlelight', 'Candlelight', 'romantic', 'Deep wine and amber, a quiet table for two', LORA, 'candle', {
    ...ROMANTIC,
    '--wallpaper': '#1a1013', '--bar': '#2a161b', '--bar-img': 'linear-gradient(180deg,#341b22,#26141a)', '--bar-text': '#f6e6d8', '--bar-ctl': 'rgba(255,220,180,.10)',
    '--bubble-them': '#2c1b20', '--bubble-me': '#6a2e3d', '--bubble-shadow': '0 0 0 1px rgba(255,190,130,.08), 0 2px 10px rgba(0,0,0,.35)',
    '--them-text': '#f4e4d6', '--me-text': '#fbeee4', '--me-link': '#ffc999', '--me-meta': '#e5bfb0', '--text': '#f4e4d6', '--muted': '#b99a8a',
    '--chip': '#2a181d', '--chip-sys': '#3a2417', '--panel': '#241418', '--line': '#3a2428', '--flash': '#5a4020', '--accent': '#f0b267', '--link': '#f4b97a',
    '--name-l': '72%', '--scheme': 'dark', '--pattern': 'rgba(255,190,130,.06)', '--radius': '16px', '--first-corner': '5px',
  }),
  theme('love-letters', 'Love Letters', 'romantic', 'Aged paper, ink and a wax-red seal', LORA, 'paper', {
    ...ROMANTIC,
    '--wallpaper': '#f2e4c9', '--bar': '#e7d3ae', '--bar-img': 'linear-gradient(180deg,#ecdbb9,#e3cda5)', '--bar-text': '#4a3622', '--bar-ctl': 'rgba(74,54,34,.09)',
    '--bubble-them': '#fcf6e8', '--bubble-me': '#efdcb9', '--bubble-shadow': '0 1px 0 rgba(120,85,40,.25), 0 2px 6px rgba(120,85,40,.14)',
    '--them-text': '#3e2e1c', '--me-text': '#3e2e1c', '--me-link': '#8e2f2f', '--me-meta': '#745b3d', '--text': '#3e2e1c', '--muted': '#745b3d',
    '--chip': '#f7ecd3', '--chip-sys': '#efd9a6', '--panel': '#fbf4e4', '--line': '#e2d0aa', '--flash': '#f5df8c', '--accent': '#8e2f2f', '--link': '#8e2f2f',
    '--name-l': '27%', '--pattern': 'rgba(120,85,40,.08)', '--radius': '3px', '--first-corner': '3px',
  }),
  theme('moonlit', 'Moonlit', 'romantic', 'A deep blue night with a soft moon and a few stars', NUNITO, 'starry', {
    ...ROMANTIC,
    '--wallpaper': '#0d1230', '--bar': '#151c46', '--bar-img': 'linear-gradient(180deg,#1a2253,#121842)', '--bar-text': '#e8ebff', '--bar-ctl': 'rgba(200,210,255,.12)',
    '--bubble-them': '#1b2350', '--bubble-me': '#3a4796', '--bubble-shadow': '0 0 0 1px rgba(160,176,255,.10), 0 2px 12px rgba(5,8,30,.45)',
    '--them-text': '#e6e9ff', '--me-text': '#f3f4ff', '--me-link': '#cfd8ff', '--me-meta': '#c0c8f4', '--text': '#e6e9ff', '--muted': '#9aa3d6',
    '--chip': '#161d46', '--chip-sys': '#222a5e', '--panel': '#121840', '--line': '#252d63', '--flash': '#3f4a8c', '--accent': '#9fb0ff', '--link': '#a9b8ff',
    '--name-l': '74%', '--scheme': 'dark', '--pattern': 'rgba(255,255,255,.05)', '--radius': '17px', '--first-corner': '5px',
  }),
  theme('fireflies', 'Fireflies', 'romantic', 'A summer garden after dark, lit by tiny lights', NUNITO, 'fireflies', {
    ...ROMANTIC,
    '--wallpaper': '#0c1c1e', '--bar': '#12292a', '--bar-img': 'linear-gradient(180deg,#16322f,#0f2425)', '--bar-text': '#e4f1e8', '--bar-ctl': 'rgba(210,240,220,.10)',
    '--bubble-them': '#173533', '--bubble-me': '#2b5a45', '--bubble-shadow': '0 0 0 1px rgba(232,210,122,.07), 0 2px 10px rgba(0,0,0,.4)',
    '--them-text': '#e2efe6', '--me-text': '#eef7ef', '--me-link': '#f0dd8a', '--me-meta': '#b9d6c4', '--text': '#e2efe6', '--muted': '#93b3a5',
    '--chip': '#12292a', '--chip-sys': '#2a3a22', '--panel': '#102626', '--line': '#1f4040', '--flash': '#4b5a26', '--accent': '#e8d27a', '--link': '#e8d27a',
    '--name-l': '72%', '--scheme': 'dark', '--pattern': 'rgba(255,255,255,.05)', '--radius': '17px', '--first-corner': '5px',
  }),
  theme('monsoon', 'Monsoon', 'romantic', 'Rain on the window, warm lights blurred behind it', NUNITO, 'rain', {
    ...ROMANTIC,
    '--wallpaper': '#dfe9ea', '--bar': '#cde0df', '--bar-img': 'linear-gradient(180deg,#d6e7e5,#c3d9d7)', '--bar-text': '#1f4442', '--bar-ctl': 'rgba(31,68,66,.09)',
    '--bubble-them': '#f6fbfa', '--bubble-me': '#c9e4e0', '--bubble-shadow': '0 1px 2px rgba(40,90,90,.2)',
    '--them-text': '#1f3b3a', '--me-text': '#1a3a38', '--me-link': '#1f6b66', '--me-meta': '#3b6662', '--text': '#1f3b3a', '--muted': '#52756f',
    '--chip': '#eaf4f3', '--chip-sys': '#f3efc9', '--panel': '#f4fafa', '--line': '#d3e3e2', '--flash': '#f2ec9a', '--accent': '#2a7a75', '--link': '#1f6b66',
    '--name-l': '27%', '--pattern': 'rgba(31,68,66,.07)', '--radius': '17px', '--first-corner': '5px',
  }),
  theme('peony', 'Peony', 'romantic', 'Blush petals drifting, soft and unhurried', NUNITO, 'petals', {
    ...ROMANTIC,
    '--wallpaper': '#fdeaee', '--bar': '#fbd9e1', '--bar-img': 'linear-gradient(180deg,#fde0e7,#f9d0db)', '--bar-text': '#6a2740', '--bar-ctl': 'rgba(106,39,64,.09)',
    '--bubble-them': '#fffafb', '--bubble-me': '#f8cdd8', '--bubble-shadow': '0 1px 2px rgba(190,80,120,.18)',
    '--them-text': '#4d2433', '--me-text': '#4d2433', '--me-link': '#a82b55', '--me-meta': '#82445a', '--text': '#4d2433', '--muted': '#8e566a',
    '--chip': '#fff0f3', '--chip-sys': '#fff0c9', '--panel': '#fff7f9', '--line': '#f5d5dd', '--flash': '#ffe49c', '--accent': '#b83a6d', '--link': '#a82b55',
    '--name-l': '32%', '--pattern': 'rgba(190,80,120,.08)', '--radius': '18px', '--first-corner': '6px',
  }),
  theme('lavender-dusk', 'Lavender Dusk', 'romantic', 'Twilight over lilac hills', NUNITO, 'lavender', {
    ...ROMANTIC,
    '--wallpaper': '#e5daf7', '--bar': '#e0d3f6', '--bar-img': 'linear-gradient(180deg,#e8ddfa,#d9c9f3)', '--bar-text': '#42306e', '--bar-ctl': 'rgba(66,48,110,.09)',
    '--bubble-them': '#fdfaff', '--bubble-me': '#dccbf6', '--bubble-shadow': '0 1px 2px rgba(110,80,180,.18)',
    '--them-text': '#3a2c5c', '--me-text': '#352858', '--me-link': '#6240b0', '--me-meta': '#5e4789', '--text': '#3a2c5c', '--muted': '#69568f',
    '--chip': '#f1eafc', '--chip-sys': '#fbeccf', '--panel': '#faf7ff', '--line': '#e1d6f3', '--flash': '#fbe79a', '--accent': '#6f4fb8', '--link': '#6240b0',
    '--name-l': '32%', '--pattern': 'rgba(110,80,180,.08)', '--radius': '18px', '--first-corner': '6px',
  }),
  // follows the clock; see daylightThemeId
  theme('daylight', 'Through the Day', 'romantic', 'Changes with the hour: blush at dawn, gold by day, lavender at dusk, moonlight at night', NUNITO, null, {}),

  theme('whatsapp-light', 'WhatsApp Light', 'familiar', 'The look you know', SYSTEM, null, {}),
  theme('whatsapp-dark', 'WhatsApp Dark', 'familiar', 'Easy on the eyes at night', SYSTEM, null, {
    '--wallpaper': '#0b141a', '--bar': '#202c33', '--bar-text': '#e9edef', '--bar-ctl': 'rgba(255,255,255,.1)',
    '--bubble-them': '#202c33', '--bubble-me': '#005c4b', '--them-text': '#e9edef', '--me-text': '#e9edef',
    '--me-link': '#8fd3f4', '--me-meta': '#b4d2c8', '--text': '#e9edef', '--muted': '#8696a0', '--chip': '#182229',
    '--chip-sys': '#1d2b30', '--panel': '#111b21', '--line': '#233138', '--flash': '#4a4a1f', '--accent': '#00a884',
    '--link': '#53bdeb', '--name-l': '70%', '--scheme': 'dark', '--pattern': 'rgba(255,255,255,.05)',
  }),
  theme('classic', 'Classic', 'familiar', 'The older green-and-cream WhatsApp', SYSTEM, null, {
    '--wallpaper': '#e5ddd5', '--bar': '#075e54', '--bubble-me': '#dcf8c6', '--them-text': '#303030', '--me-text': '#303030',
    '--text': '#303030', '--muted': '#666666', '--me-meta': '#656565', '--chip': '#e1f3fb', '--chip-sys': '#fcf4cb',
    '--line': '#e5e5e5', '--accent': '#075e54', '--link': '#1a76a3', '--me-link': '#146a94', '--radius': '7px',
  }),
  theme('imessage', 'iMessage', 'familiar', 'Clean blue and grey', SYSTEM, null, {
    '--wallpaper': '#ffffff', '--bar': '#f6f6f8', '--bar-text': '#111111', '--bar-ctl': 'rgba(0,0,0,.06)',
    '--bubble-them': '#e9e9eb', '--bubble-me': '#0a6fe0', '--them-text': '#111111', '--me-text': '#ffffff',
    '--me-link': '#ffffff', '--me-meta': 'rgba(255,255,255,.78)', '--text': '#111111', '--muted': '#636366',
    '--chip': '#f2f2f7', '--chip-sys': '#f2f2f7', '--line': '#e5e5ea', '--accent': '#0a6fe0', '--link': '#0a5fc0',
    '--radius': '18px', '--first-corner': '18px', '--tail': 'none',
  }),
];

// Themes saved by earlier versions keep working.
const LEGACY_IDS = { rose: 'peony', sepia: 'love-letters', midnight: 'moonlit' };

export const DEFAULT_APPEARANCE = {
  theme: 'whatsapp-light',
  bubbleMe: null, // custom hex, or null to use the theme's color
  bubbleThem: null,
  wallpaper: { kind: 'theme' }, // { kind: 'theme' } | { kind: 'none' } | { kind: 'preset', id } | { kind: 'image', dataUrl }
  font: 'theme', // 'theme' or a key of FONTS
  fontSize: 15,
  density: 'cozy', // 'cozy' | 'compact'
};

export const FONT_SIZE_RANGE = { min: 13, max: 22 };

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === LEGACY_IDS[id]) || THEMES.find((t) => t.id === 'whatsapp-light');
}

// 'Through the Day' picks a theme from the hour: dawn, day, dusk, night.
export function daylightThemeId(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 10) return 'peony';
  if (h >= 10 && h < 16) return 'golden-hour';
  if (h >= 16 && h < 20) return 'lavender-dusk';
  return 'moonlit';
}

export function resolveTheme(id, now = new Date()) {
  const t = getTheme(id);
  return t.id === 'daylight' ? getTheme(daylightThemeId(now)) : t;
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
export function buildStyle(appearance, now = new Date()) {
  const a = { ...DEFAULT_APPEARANCE, ...appearance };
  const t = resolveTheme(a.theme, now);
  const vars = { ...t.vars };

  if (/^#[0-9a-f]{6}$/i.test(a.bubbleMe || '')) {
    const text = readableText(a.bubbleMe);
    vars['--bubble-me'] = a.bubbleMe;
    vars['--me-text'] = text;
    vars['--me-link'] = text === '#ffffff' ? '#ffffff' : t.vars['--link'];
    vars['--me-meta'] = text === '#ffffff' ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)';
  }
  if (/^#[0-9a-f]{6}$/i.test(a.bubbleThem || '')) {
    vars['--bubble-them'] = a.bubbleThem;
    vars['--them-text'] = readableText(a.bubbleThem);
  }

  const wp = a.wallpaper || { kind: 'theme' };
  let scene = null;
  if (wp.kind === 'theme') scene = t.wp ? getWallpaper(t.wp) : null;
  else if (wp.kind === 'preset') scene = getWallpaper(wp.id);

  if (scene) {
    vars['--wp-image'] = wallpaperUrl(scene);
    vars['--wp-color'] = scene.color;
    vars['--wp-size'] = 'cover';
    vars['--wp-repeat'] = 'no-repeat';
    vars['--wp-pos'] = 'center';
  } else if (wp.kind === 'image' && typeof wp.dataUrl === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(wp.dataUrl)) {
    vars['--wp-image'] = `url("${wp.dataUrl}")`;
    vars['--wp-color'] = vars['--wallpaper'];
    vars['--wp-size'] = 'cover';
    vars['--wp-repeat'] = 'no-repeat';
    vars['--wp-pos'] = 'center';
  } else {
    vars['--wp-image'] = 'none';
    vars['--wp-color'] = vars['--wallpaper'];
    vars['--wp-size'] = 'auto';
    vars['--wp-repeat'] = 'repeat';
    vars['--wp-pos'] = '0 0';
  }

  const font = a.font !== 'theme' && FONTS[a.font] ? FONTS[a.font] : { stack: t.font, scale: 1 };
  vars['--font-stack'] = font.stack;
  const size = Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, Number(a.fontSize) || DEFAULT_APPEARANCE.fontSize));
  vars['--fs'] = Math.round(size * font.scale * 10) / 10 + 'px';

  const compact = a.density === 'compact';
  vars['--pad-y'] = compact ? '3px' : '5px';
  vars['--pad-b'] = compact ? '2px' : '4px';
  vars['--row-pad'] = compact ? '0px' : '1px';
  vars['--first-gap'] = compact ? '3px' : '7px';
  vars['--chip-pt'] = compact ? '6px' : '10px';
  return vars;
}
