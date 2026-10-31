import { type Palette, palette } from './palette';
import { durations, easings, fontFamilies, heights, radii, type TextRole, textRoles } from './scale';

export const GENERATED_HEADER = '/* Gerado por `pnpm tokens`. Não editar. */';

/** Biome's CSS style, so the generated file passes `pnpm lint` as it is written. */
function formatValue(value: string) {
  return value
    .replace(/#[0-9A-Fa-f]{3,8}\b/g, (hex) => hex.toLowerCase())
    .replace(/(^|[\s(,/])\.(\d)/g, '$10.$2')
    .replace(/(\d\.\d*[1-9])0+(?!\d)/g, '$1')
    .replaceAll("'", '"');
}

function declarations(entries: [string, string | number][], indent: string) {
  return entries.map(([name, value]) => `${indent}--${name}: ${formatValue(String(value))};`).join('\n');
}

function textRoleEntries(): [string, string][] {
  const roles: Record<string, TextRole> = textRoles;
  return Object.entries(roles).flatMap(
    ([role, { size, line, weight, tracking, family = 'sans' }]): [string, string][] => [
      [`type-${role}`, `${weight === 'ui' ? 'var(--weight-ui)' : weight} ${size}px / ${line}px var(--font-${family})`],
      [`tracking-${role}`, tracking === 0 ? '0' : `${tracking}em`],
    ],
  );
}

function scaleEntries(): [string, string][] {
  const named = (prefix: string, values: Record<string, number>, unit: string) =>
    Object.entries(values).map(([name, value]): [string, string] => [`${prefix}-${name}`, `${value}${unit}`]);
  return [
    ...Object.entries(fontFamilies).map(([name, value]): [string, string] => [`font-${name}`, value]),
    ...textRoleEntries(),
    ...named('radius', radii, 'px'),
    ...named('height', heights, 'px'),
    ...named('duration', durations, 'ms'),
    ...Object.entries(easings).map(([name, value]): [string, string] => [`ease-${name}`, value]),
  ];
}

function themeBlock(colorScheme: 'light' | 'dark', values: Palette, indent: string) {
  return `${indent}color-scheme: ${colorScheme};\n${declarations(Object.entries(values), indent)}`;
}

/**
 * The generated tokens.css. The light theme is the default; `data-theme`, which public/theme.js always
 * sets, chooses one. The media query only applies without JavaScript.
 */
export function tokensCss() {
  return `${GENERATED_HEADER}
:root {
${declarations(scaleEntries(), '  ')}
}
:root,
:root[data-theme="light"] {
${themeBlock('light', palette.light, '  ')}
}
:root[data-theme="dark"] {
${themeBlock('dark', palette.dark, '  ')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
${themeBlock('dark', palette.dark, '    ')}
  }
}
`;
}
