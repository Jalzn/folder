import { describe, expect, it } from 'vitest';
import { placeLabel } from './place-label';

describe('placeLabel', () => {
  it('joins the project and the folder, or names the project alone at its root', () => {
    expect(placeLabel('Tinyfold', { name: 'MCP' })).toBe('Tinyfold › MCP');
    expect(placeLabel('Tinyfold', null)).toBe('Tinyfold');
    expect(placeLabel('Tinyfold', undefined)).toBe('Tinyfold');
  });
});
