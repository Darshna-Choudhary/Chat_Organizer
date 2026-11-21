import { describe, it, expect } from 'vitest';
import { DEFAULT_APPEARANCE, FONTS, THEMES, WALLPAPERS, buildStyle, getTheme, readableText } from './themes.js';

describe('themes', () => {
  it('has the requested themes with unique ids', () => {
    expect(THEMES.map((t) => t.name)).toEqual(expect.arrayContaining(['WhatsApp Light', 'WhatsApp Dark', 'Classic', 'iMessage', 'Sepia Diary']));
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(THEMES.length).toBeGreaterThanOrEqual(7);
  });

  it('defines the same set of variables in every theme, so none can be left half-styled', () => {
    const keys = Object.keys(THEMES[0].vars).sort();
    for (const t of THEMES) expect(Object.keys(t.vars).sort()).toEqual(keys);
  });

  it('only uses valid colors and a known color scheme', () => {
    for (const t of THEMES) {
      expect(['light', 'dark']).toContain(t.vars['--scheme']);
      expect(t.vars['--wallpaper']).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.vars['--bubble-me']).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('falls back to the first theme for an unknown id', () => {
    expect(getTheme('does-not-exist').id).toBe('whatsapp-light');
  });
});

describe('buildStyle', () => {
  it('maps a theme, font, size and density to variables', () => {
    const v = buildStyle({ ...DEFAULT_APPEARANCE, theme: 'sepia', fontSize: 18, density: 'compact' });
    expect(v['--wallpaper']).toBe('#f4ecd8');
    expect(v['--font-stack']).toContain('Georgia'); // sepia's own font
    expect(v['--fs']).toBe('18px');
    expect(v['--pad-y']).toBe('3px');
  });

  it('lets an explicit font override the theme font', () => {
    expect(buildStyle({ ...DEFAULT_APPEARANCE, theme: 'sepia', font: 'mono' })['--font-stack']).toBe(FONTS.mono.stack);
    expect(buildStyle({ ...DEFAULT_APPEARANCE, font: 'nonsense' })['--font-stack']).toBe(getTheme('whatsapp-light').font);
  });

  it('clamps the font size', () => {
    expect(buildStyle({ ...DEFAULT_APPEARANCE, fontSize: 99 })['--fs']).toBe('22px');
    expect(buildStyle({ ...DEFAULT_APPEARANCE, fontSize: 2 })['--fs']).toBe('13px');
    expect(buildStyle({ ...DEFAULT_APPEARANCE, fontSize: 'abc' })['--fs']).toBe('15px');
  });

  it('applies custom bubble colors with readable text', () => {
    const v = buildStyle({ ...DEFAULT_APPEARANCE, bubbleMe: '#000000', bubbleThem: '#ffffff' });
    expect(v['--bubble-me']).toBe('#000000');
    expect(v['--me-text']).toBe('#ffffff');
    expect(v['--them-text']).toBe('#111b21');
  });

  it('ignores invalid custom colors', () => {
    const v = buildStyle({ ...DEFAULT_APPEARANCE, bubbleMe: 'red; background: url(x)' });
    expect(v['--bubble-me']).toBe(getTheme('whatsapp-light').vars['--bubble-me']);
  });

  it('handles wallpapers: none, preset, uploaded image, and unsafe values', () => {
    expect(buildStyle(DEFAULT_APPEARANCE)['--wp-image']).toBe('none');
    const p = WALLPAPERS[0];
    expect(buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'preset', id: p.id } })['--wp-image']).toBe(p.image);
    expect(buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'preset', id: 'missing' } })['--wp-image']).toBe('none');
    const ok = buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'image', dataUrl: 'data:image/jpeg;base64,AAAA' } });
    expect(ok['--wp-image']).toBe('url("data:image/jpeg;base64,AAAA")');
    expect(ok['--wp-size']).toBe('cover');
    const bad = buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'image', dataUrl: 'javascript:alert(1)' } });
    expect(bad['--wp-image']).toBe('none');
    const bad2 = buildStyle({ ...DEFAULT_APPEARANCE, wallpaper: { kind: 'image', dataUrl: 'data:image/png;base64,AA");}body{display:none' } });
    expect(bad2['--wp-image']).toBe('none');
  });

  it('survives missing or partial saved settings', () => {
    expect(() => buildStyle(undefined)).not.toThrow();
    expect(buildStyle({ theme: 'rose' })['--accent']).toBe('#e8537a');
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
