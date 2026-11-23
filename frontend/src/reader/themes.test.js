import { describe, it, expect } from 'vitest';
import { DEFAULT_APPEARANCE, FONTS, THEMES, WALLPAPERS, buildStyle, daylightThemeId, getTheme, readableText, resolveTheme } from './themes.js';

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const isHex = (s) => /^#[0-9a-f]{6}$/i.test(s);
const at = (h) => new Date(2026, 10, 21, h, 0);

describe('themes', () => {
  it('has romantic and familiar themes with unique ids', () => {
    const names = THEMES.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['Golden Hour', 'Candlelight', 'Love Letters', 'Moonlit', 'Fireflies', 'Monsoon', 'Peony', 'Lavender Dusk', 'Through the Day', 'WhatsApp Light', 'WhatsApp Dark', 'Classic', 'iMessage']));
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(THEMES.filter((t) => t.group === 'romantic').length).toBe(9);
    expect(THEMES.filter((t) => t.group === 'familiar').length).toBe(4);
  });

  it('defines the same set of variables in every theme, so none can be left half-styled', () => {
    const keys = Object.keys(THEMES[0].vars).sort();
    for (const t of THEMES) expect(Object.keys(t.vars).sort()).toEqual(keys);
  });

  it('only uses valid colors and a known color scheme', () => {
    for (const t of THEMES) {
      expect(['light', 'dark']).toContain(t.vars['--scheme']);
      for (const k of ['--wallpaper', '--bubble-me', '--bubble-them', '--text', '--panel', '--bar']) expect(t.vars[k]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('keeps text readable: every theme meets contrast targets', () => {
    const checks = [['--them-text', '--bubble-them', 4.5], ['--me-text', '--bubble-me', 4.5], ['--text', '--panel', 4.5], ['--muted', '--bubble-them', 4.5], ['--me-meta', '--bubble-me', 4.5], ['--muted', '--chip', 4.5], ['--link', '--bubble-them', 4.5], ['--me-link', '--bubble-me', 4.5], ['--bar-text', '--bar', 4.5], ['--accent', '--panel', 3]];
    for (const t of THEMES) {
      for (const [fg, bg, min] of checks) {
        if (!isHex(t.vars[fg]) || !isHex(t.vars[bg])) continue; // translucent values are checked by eye
        expect(ratio(t.vars[fg], t.vars[bg]), `${t.id}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
      }
      for (const stop of t.vars['--bar-img'].match(/#[0-9a-f]{6}/gi) || []) expect(ratio(t.vars['--bar-text'], stop), `${t.id}: header text on ${stop}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps menus and drawers readable and tinted rather than plain white', () => {
    for (const t of THEMES) {
      const v = t.vars;
      for (const bg of [v['--menu-bg'], v['--menu-bg2']]) {
        expect(ratio(v['--menu-text'], bg), `${t.id}: menu text on ${bg}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(v['--menu-muted'], bg), `${t.id}: menu muted on ${bg}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(v['--menu-accent'], bg), `${t.id}: menu accent on ${bg}`).toBeGreaterThanOrEqual(3);
        expect(ratio(v['--danger'], bg), `${t.id}: warning color on ${bg}`).toBeGreaterThanOrEqual(3.5);
      }
      expect(v['--menu-bg'].toLowerCase(), t.id).not.toBe('#ffffff');
      expect(v['--menu-bg2'].toLowerCase(), t.id).not.toBe('#ffffff');
    }
  });

  it('falls back to WhatsApp Light for an unknown id, and understands themes from earlier versions', () => {
    expect(getTheme('does-not-exist').id).toBe('whatsapp-light');
    expect(getTheme('rose').id).toBe('peony');
    expect(getTheme('sepia').id).toBe('love-letters');
    expect(getTheme('midnight').id).toBe('moonlit');
  });

  it('gives every romantic theme its own wallpaper scene', () => {
    for (const t of THEMES.filter((x) => x.group === 'romantic' && x.id !== 'daylight')) expect(WALLPAPERS.some((w) => w.id === t.wp), t.id).toBe(true);
  });
});

describe('Through the Day', () => {
  it('follows the hour: dawn, day, dusk, night', () => {
    expect([6, 9].map((h) => daylightThemeId(at(h)))).toEqual(['peony', 'peony']);
    expect([10, 15].map((h) => daylightThemeId(at(h)))).toEqual(['golden-hour', 'golden-hour']);
    expect([16, 19].map((h) => daylightThemeId(at(h)))).toEqual(['lavender-dusk', 'lavender-dusk']);
    expect([20, 23, 0, 4].map((h) => daylightThemeId(at(h)))).toEqual(['moonlit', 'moonlit', 'moonlit', 'moonlit']);
  });

  it('builds the look of the theme for the current hour', () => {
    expect(resolveTheme('daylight', at(12)).id).toBe('golden-hour');
    expect(buildStyle({ theme: 'daylight' }, at(22))['--wallpaper']).toBe(getTheme('moonlit').vars['--wallpaper']);
    expect(buildStyle({ theme: 'daylight' }, at(12))['--wallpaper']).toBe(getTheme('golden-hour').vars['--wallpaper']);
  });
});

describe('wallpaper scenes', () => {
  it('are small, self-contained SVG pictures', () => {
    expect(WALLPAPERS.length).toBe(8);
    for (const w of WALLPAPERS) {
      expect(w.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), w.id).toBe(true);
      expect(w.svg.length, w.id).toBeLessThan(60000);
      expect(w.svg).not.toMatch(/<script|onload=|<image|xlink:href|href=/i);
      expect(w.svg.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:/);
      expect(w.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('buildStyle', () => {
  it('uses the theme\'s own wallpaper by default, and plain for familiar themes', () => {
    expect(buildStyle({ theme: 'moonlit' })['--wp-image']).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(buildStyle({ theme: 'moonlit' })['--wp-color']).toBe('#0a0f2c');
    expect(buildStyle({ theme: 'whatsapp-light' })['--wp-image']).toBe('none');
  });

  it('maps a theme, font, size and density to variables', () => {
    const v = buildStyle({ ...DEFAULT_APPEARANCE, theme: 'love-letters', fontSize: 18, density: 'compact' });
    expect(v['--wallpaper']).toBe('#f2e4c9');
    expect(v['--font-stack']).toContain('Lora');
    expect(v['--fs']).toBe('18px');
    expect(v['--pad-y']).toBe('3px');
    expect(v['--chip-style']).toBe('italic');
  });

  it('lets an explicit font override the theme font, and sizes small typefaces up', () => {
    expect(buildStyle({ ...DEFAULT_APPEARANCE, theme: 'love-letters', font: 'mono' })['--font-stack']).toBe(FONTS.mono.stack);
    expect(buildStyle({ ...DEFAULT_APPEARANCE, font: 'nonsense' })['--font-stack']).toBe(getTheme('whatsapp-light').font);
    expect(buildStyle({ ...DEFAULT_APPEARANCE, font: 'hand', fontSize: 15 })['--fs']).toBe('19.2px');
    expect(buildStyle({ ...DEFAULT_APPEARANCE, font: 'elegant', fontSize: 15 })['--fs']).toBe('17.7px');
  });

  it('clamps the font size', () => {
    expect(buildStyle({ ...DEFAULT_APPEARANCE, fontSize: 99 })['--fs']).toBe('22px');
    expect(buildStyle({ ...DEFAULT_APPEARANCE, fontSize: 2 })['--fs']).toBe('13px');
    expect(buildStyle({ ...DEFAULT_APPEARANCE, fontSize: 'abc' })['--fs']).toBe('15px');
  });

  it('applies custom bubble colors with readable text, and ignores invalid ones', () => {
    const v = buildStyle({ ...DEFAULT_APPEARANCE, bubbleMe: '#000000', bubbleThem: '#ffffff' });
    expect(v['--bubble-me']).toBe('#000000');
    expect(v['--me-text']).toBe('#ffffff');
    expect(v['--them-text']).toBe('#111b21');
    expect(buildStyle({ ...DEFAULT_APPEARANCE, bubbleMe: 'red; background: url(x)' })['--bubble-me']).toBe(getTheme('whatsapp-light').vars['--bubble-me']);
  });

  it('handles wallpapers: plain, a chosen scene, an uploaded photo, and unsafe values', () => {
    expect(buildStyle({ theme: 'moonlit', wallpaper: { kind: 'none' } })['--wp-image']).toBe('none');
    expect(buildStyle({ theme: 'moonlit', wallpaper: { kind: 'none' } })['--wp-color']).toBe('#0d1230');
    const petals = buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'preset', id: 'petals' } });
    expect(petals['--wp-image']).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'preset', id: 'missing' } })['--wp-image']).toBe('none');
    const ok = buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'image', dataUrl: 'data:image/jpeg;base64,AAAA' } });
    expect(ok['--wp-image']).toBe('url("data:image/jpeg;base64,AAAA")');
    expect(buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'image', dataUrl: 'javascript:alert(1)' } })['--wp-image']).toBe('none');
    expect(buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'image', dataUrl: 'data:image/png;base64,AA");}body{display:none' } })['--wp-image']).toBe('none');
  });

  it('survives missing or partial saved settings', () => {
    expect(() => buildStyle(undefined)).not.toThrow();
    expect(buildStyle({ theme: 'peony' })['--accent']).toBe('#b83a6d');
  });
});

describe('readableText', () => {
  it('picks dark text on light colors and white on dark colors', () => {
    expect(readableText('#ffffff')).toBe('#111b21');
    expect(readableText('#ffd1dc')).toBe('#111b21');
    expect(readableText('#0a84ff')).toBe('#ffffff');
    expect(readableText('#005c4b')).toBe('#ffffff');
    expect(readableText('not-a-color')).toBe('#111b21');
  });
});
