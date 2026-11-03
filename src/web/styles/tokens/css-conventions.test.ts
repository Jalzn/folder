import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The conventions of the web's CSS (TT-5, TT-19), as a ratchet: no new raw font, no variable that is neither a
 * token nor defined in the app, and no breakpoint outside the agreed ones. What breaks them today is listed
 * below, one exception at a time with its reason; wave 6 of stage 12 takes them out, and an exception that no
 * longer matches anything must leave the list.
 */

const web = fileURLToPath(new URL('../../', import.meta.url));
/** Outputs and copies, never written by hand. */
const SKIPPED = /(^|\/)(node_modules|dist|public)(\/|$)/;

const files = (readdirSync(web, { recursive: true }) as string[]).filter((file) => !SKIPPED.test(file)).sort();
const read = (file: string) => readFileSync(`${web}${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const stylesheets = files.filter((file) => file.endsWith('.css'));

interface Declaration {
  file: string;
  selector: string;
  property: string;
  value: string;
}

/** The declarations of a stylesheet, each with the innermost rule's selector. */
function declarations(file: string): Declaration[] {
  const found: Declaration[] = [];
  const preludes: string[] = [];
  let text = '';
  const declare = () => {
    const declaration = text.trim();
    text = '';
    const colon = declaration.indexOf(':');
    if (colon < 0 || preludes.length === 0) return;
    const selector = preludes.findLast((prelude) => !prelude.startsWith('@')) ?? '';
    const property = declaration.slice(0, colon).trim();
    found.push({ file, selector, property, value: declaration.slice(colon + 1).trim() });
  };
  for (const character of read(file)) {
    if (character === '{') {
      preludes.push(text.trim().replace(/\s+/g, ' '));
      text = '';
    } else if (character === '}') {
      declare();
      preludes.pop();
    } else if (character === ';') declare();
    else text += character;
  }
  return found;
}

const all = stylesheets.flatMap(declarations);

/** A font written in px instead of a type token. */
const rawFonts = all
  .filter(({ property, value }) => (property === 'font' || property === 'font-size') && /\dpx/.test(value))
  .map(({ file, selector, property, value }) => `${file} | ${selector} | ${property}: ${value}`);

/** The variables the app defines: the tokens, the custom properties of its CSS and those its code sets inline. */
const tokens = [...read('styles/tokens.css').matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]);
const inCss = all.filter(({ property }) => property.startsWith('--')).map(({ property }) => property);
const inCode = files
  .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
  .flatMap((file) => [...read(file).matchAll(/['"`](--[\w-]+)['"`]/g)].map((match) => match[1]));
const defined = new Set([...tokens, ...inCss, ...inCode]);
const unknownVariables = [
  ...new Set(
    all.flatMap(({ file, value }) =>
      [...value.matchAll(/var\(\s*(--[\w-]+)/g)]
        .map((match) => match[1])
        .filter((name) => !defined.has(name))
        .map((name) => `${file} | ${name}`),
    ),
  ),
];

/** The breakpoints of the layout (TT-19): below 720 px, as use-layout-mode.ts, and the page's 760 px. */
const BREAKPOINTS = ['719.98px', '760px'];
const strayBreakpoints = stylesheets.flatMap((file) =>
  [...read(file).matchAll(/@media([^{]*)\{/g)]
    .map((match) => (match[1] ?? '').trim())
    .filter((query) =>
      [...query.matchAll(/(?:max|min)-width:\s*([\d.]+px)/g)].some((width) => !BREAKPOINTS.includes(width[1] ?? '')),
    )
    .map((query) => `${file} | ${query}`),
);

const OWN_SIZE = 'a size of its own, with no role in the type scale (TT-5)';

/** The raw fonts of today, each with its reason. */
const RAW_FONT_EXCEPTIONS: Record<string, string> = {
  'components/inline-math.css | .inline-math-help, .inline-math-error | font-size: 12px': OWN_SIZE,
  'components/inline-math.css | .inline-math-dialog-preview | font-size: 14px': OWN_SIZE,

  'components/task-drawer/drawer.css | .task-description .block-editor .bn-editor | font: var(--weight-ui) 14px / 22px var(--font-sans)':
    "the description's 14/22, --type-desc, whose weight in the dark theme is decision 7 (W6.2a)",

  'components/task-drawer/drawer.css | .due-calendar__grid th | font: var(--weight-ui) 11px / 16px var(--font-sans)':
    OWN_SIZE,

  'components/task-drawer/drawer.css | .task-drawer__props .task-source .task-source__excerpt | font: var(--weight-ui) 12px / 18px var(--font-sans)':
    OWN_SIZE,

  'editor/blocks/embeds.css | .embed-card__title | font: 500 14px / 20px var(--font-sans)': OWN_SIZE,

  'pages/document/document.css | .document__content .bn-block-content | font-size: 15px':
    "the editor's content size over BlockNote's own, which --editor-type will carry (TT-6)",
  'pages/document/document.css | .document__content .bn-block-content | font-size: 16px':
    "the editor's content size on a phone, which --editor-type will carry (TT-6)",
  'pages/profile/profile.css | .profile-row__meta code | font-size: 12px': OWN_SIZE,
  'pages/profile/profile.css | .created-token__copy .input | font-size: 16px':
    'the 16 px that keeps iOS from zooming into a focused field',

  'shell/command-palette/command-palette.css | .palette__input | font: var(--weight-ui) 15px / 22px var(--font-sans)':
    OWN_SIZE,
  'shell/command-palette/command-palette.css | .palette-row__archived | font: 11px / 16px var(--font-sans)': OWN_SIZE,
  'shell/layout.css | .top-bar__project | font: 600 13px / 20px var(--font-sans)': OWN_SIZE,
  'shell/sidebar/sidebar-panel.css | .sidebar-header__switcher | font: 600 13px / 20px var(--font-sans)': OWN_SIZE,

  'ui/button.css | .btn[data-size="sm"] | font-size: 12px': OWN_SIZE,

  'ui/glyphs/glyphs.css | .project-mark | font: 600 11px / 1 var(--font-sans)': OWN_SIZE,
  'ui/glyphs/glyphs.css | .project-mark[data-size="16"] | font-size: 10px': OWN_SIZE,
  'ui/glyphs/glyphs.css | .logo__name | font: 600 18px / 24px var(--font-sans)': OWN_SIZE,
  'ui/toast.css | .toast | font: 450 13px / 20px var(--font-sans)':
    'the interface size at 450 in both themes, unlike --type-ui (TT-5)',
};

/** Variables that come from outside the app. */
const VARIABLE_EXCEPTIONS: Record<string, string> = {
  'ui/select.css | --trigger-width': "React Aria sets it on a popover to its trigger's width",
};

const NARROW_719 = 'below 720 px written as 719px, which misses widths between 719 and 720 (TT-19)';

/** The breakpoints of today outside BREAKPOINTS, each with its reason. */
const BREAKPOINT_EXCEPTIONS: Record<string, string> = {
  'components/item-page/editor.css | (max-width: 719px)': NARROW_719,
  'components/task-drawer/drawer.css | (max-width: 719px)': NARROW_719,
  'editor/blocks/embeds.css | (max-width: 719px)': NARROW_719,
  'pages/board/board.css | (max-width: 719px)': NARROW_719,
  'pages/document/document.css | (max-width: 719px)': NARROW_719,
  'shell/layout.css | (max-width: 719px)': NARROW_719,
  'ui/menu.css | (max-width: 719px)': NARROW_719,
  'pages/profile/profile.css | (max-width: 600px)': 'the token forms stack below 600 px',
  'pages/project/trash/trash.css | (max-width: 559.98px)': 'the trash rows stack their actions below 560 px',
  'shell/keyboard/shortcuts-dialog.css | (max-width: 640px)': 'the shortcuts dialog goes to one column below 640 px',
};

/** What is found and not excepted, and the exceptions that no longer match anything. */
function ratchet(found: readonly string[], exceptions: Record<string, string>) {
  return {
    unexpected: found.filter((key) => !(key in exceptions)),
    stale: Object.keys(exceptions).filter((key) => !found.includes(key)),
  };
}

describe('the CSS conventions', () => {
  it('reads the stylesheets of the app', () => {
    expect(stylesheets.length).toBeGreaterThan(40);
    expect(all.length).toBeGreaterThan(1000);
  });

  it('writes fonts with the type tokens, save the exceptions of today', () => {
    expect(ratchet(rawFonts, RAW_FONT_EXCEPTIONS)).toEqual({ unexpected: [], stale: [] });
  });

  it('reads only variables the app defines, save the ones from outside', () => {
    expect(ratchet(unknownVariables, VARIABLE_EXCEPTIONS)).toEqual({ unexpected: [], stale: [] });
  });

  it('breaks the layout only at 720 and 760 px, save the exceptions of today', () => {
    expect(ratchet(strayBreakpoints, BREAKPOINT_EXCEPTIONS)).toEqual({ unexpected: [], stale: [] });
  });
});
