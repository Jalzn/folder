import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, contrastRules } from './contrast';
import { tokensCss } from './css';
import { type Palette, palette, type ThemeName, type TokenName } from './palette';

const themes: ThemeName[] = ['light', 'dark'];

/** The Portuguese names of docs/interface/prototipo/tokens.py and their CSS tokens. */
const specNames: Record<string, TokenName> = {
  lateral: 'side',
  fundo: 'bg',
  'nivel-1': 'raised-1',
  'nivel-2': 'raised-2',
  'nivel-3': 'raised-3',
  hover: 'hover',
  'hover-nivel': 'hover-raised',
  ativo: 'pressed',
  selecao: 'selected',
  fio: 'line',
  'fio-forte': 'line-strong',
  'borda-campo': 'field-border',
  texto: 'text',
  'texto-2': 'text-2',
  'texto-3': 'text-3',
  icone: 'icon',
  acento: 'accent',
  'acento-solido': 'accent-solid',
  'acento-solido-hover': 'accent-solid-hover',
  'sobre-acento': 'on-accent',
  atraso: 'late',
  'atraso-bg': 'late-bg',
  ok: 'ok',
  'ok-bg': 'ok-bg',
  aviso: 'warn',
  'aviso-bg': 'warn-bg',
  conflito: 'conflict',
  'conflito-bg': 'conflict-bg',
  perigo: 'danger',
  toast: 'toast',
  'sobre-toast': 'on-toast',
  'acento-25': 'accent-25',
  'acento-35': 'accent-35',
  'sel-texto': 'text-selection',
  veu: 'scrim',
  'sombra-card': 'shadow-card',
  'sombra-card-hover': 'shadow-card-hover',
  sombra: 'shadow-float',
  'sombra-gaveta': 'shadow-drawer',
  luz: 'top-light',
  'w-ui': 'weight-ui',
  'card-hover': 'card-hover',
  'barra-a-fundo': 'sidebar-bg',
  'barra-a-hover': 'sidebar-hover',
  'barra-a-ativo': 'sidebar-active',
  'campo-b': 'field-bg',
  'lb-mcp': 'label-blue',
  'lb-backend': 'label-slate',
  'lb-editor': 'label-purple',
  'lb-kanban': 'label-teal',
  'lb-operacao': 'label-amber',
  'lb-fornecedores': 'label-coral',
  'lb-compras': 'label-lime',
  'mk-violeta-bg': 'mark-violet-bg',
  'mk-violeta-fg': 'mark-violet-fg',
  'mk-ocre-bg': 'mark-ochre-bg',
  'mk-ocre-fg': 'mark-ochre-fg',
  'mk-cinza-bg': 'mark-gray-bg',
  'mk-cinza-fg': 'mark-gray-fg',
  'mk-verde-bg': 'mark-green-bg',
  'mk-verde-fg': 'mark-green-fg',
};

/** The LIGHT and DARK dictionaries of tokens.py, read as `name='value'` and `'name': 'value'` pairs. */
function approvedTokens(): Record<ThemeName, Record<string, string>> {
  const source = readFileSync(new URL('../../../../docs/interface/prototipo/tokens.py', import.meta.url), 'utf8');
  const section = (start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end));
  const pairs = (text: string) =>
    Object.fromEntries(
      [...text.matchAll(/(?:^|[\s,{(])'?([a-z0-9-]+)'?(?:=|: )'([^']*)'/g)].map((match) => [match[1], match[2]]),
    );
  return { light: pairs(section('LIGHT = dict(', 'DARK = dict(')), dark: pairs(section('DARK = dict(', 'def block')) };
}

describe('Sumário tokens', () => {
  it('keeps tokens.css as tokensCss() writes it', () => {
    const file = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
    expect(file, 'Rode `pnpm tokens` para gerar de novo.').toBe(tokensCss());
  });

  it('defines every token in both themes', () => {
    expect(Object.keys(palette.dark)).toEqual(Object.keys(palette.light));
    for (const theme of themes) for (const value of Object.values(palette[theme])) expect(value.trim()).not.toBe('');
  });

  it.each(themes)('keeps the approved values of tokens.py in the %s theme', (theme) => {
    const approved = approvedTokens()[theme];
    expect(Object.keys(approved).sort()).toEqual(Object.keys(specNames).sort());
    const expected = Object.fromEntries(Object.entries(approved).map(([name, value]) => [specNames[name], value]));
    expect(palette[theme]).toEqual(expected as Palette);
  });

  it.each(themes)('meets every required contrast in the %s theme', (theme) => {
    const failures = contrastRules.flatMap(({ foregrounds, backgrounds, minimum }) =>
      foregrounds.flatMap((foreground) =>
        backgrounds.flatMap((background) => {
          const ratio = contrastRatio(palette[theme][foreground], palette[theme][background]);
          return ratio < minimum ? [`--${foreground} sobre --${background}: ${ratio.toFixed(2)} < ${minimum}`] : [];
        }),
      ),
    );
    expect(failures).toEqual([]);
  });
});
