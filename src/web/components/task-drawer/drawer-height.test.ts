import { describe, expect, it } from 'vitest';
import { clampShare, DRAWER_HEIGHT, drawerPixels, nextPreset, parseDrawerShare, shareText } from './drawer-height';

describe('drawer height', () => {
  it('keeps the share between 25% and 85%, and anything else is the initial 55%', () => {
    expect(clampShare(0.1)).toBe(0.25);
    expect(clampShare(0.95)).toBe(0.85);
    expect(clampShare(0.6)).toBe(0.6);
    expect(clampShare(Number.NaN)).toBe(DRAWER_HEIGHT.initial);
    expect(clampShare('0.6')).toBe(DRAWER_HEIGHT.initial);
  });

  it('is never under 320 px and always leaves 120 px of the page', () => {
    expect(drawerPixels(0.55, 1000)).toBe(550);
    expect(drawerPixels(0.25, 800)).toBe(320);
    expect(drawerPixels(0.85, 1000)).toBe(850);
    expect(drawerPixels(0.85, 600)).toBe(480);
    expect(drawerPixels(0.55, 300)).toBe(200);
  });

  it('steps through 35%, 55% and 80%, and stops at the ends', () => {
    expect(nextPreset(0.55, 1)).toBe(0.8);
    expect(nextPreset(0.55, -1)).toBe(0.35);
    expect(nextPreset(0.6, -1)).toBe(0.55);
    expect(nextPreset(0.8, 1)).toBeNull();
    expect(nextPreset(0.35, -1)).toBeNull();
  });

  it('reads the device value leniently', () => {
    expect(parseDrawerShare(JSON.stringify({ height: 0.7 }))).toBe(0.7);
    expect(parseDrawerShare(JSON.stringify({ height: 2 }))).toBe(0.85);
    expect(parseDrawerShare('{')).toBe(DRAWER_HEIGHT.initial);
    expect(parseDrawerShare(null)).toBe(DRAWER_HEIGHT.initial);
  });

  it('says the height in whole percent', () => {
    expect(shareText(0.551)).toBe('Gaveta em 55% da altura');
  });
});
