/**
 * The theme-independent part of the Sumário system (docs/interface/visual.md §3, §4 and §7): type scale,
 * spacing, radii, heights, durations and easing.
 */

export const fontFamilies = {
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
} as const;

export interface TextRole {
  size: number;
  line: number;
  /** A number, or `ui` for the theme's interface weight (450 dark, 400 light). */
  weight: number | 'ui';
  /** Letter spacing in em, from Inter's dynamic metrics. */
  tracking: number;
  family?: keyof typeof fontFamilies;
}

/** The roles of visual.md §3, by class name: `.t-<role>`. There is no weight 700. */
export const textRoles = {
  title: { size: 30, line: 36, weight: 600, tracking: -0.021 },
  'task-title': { size: 20, line: 28, weight: 600, tracking: -0.017 },
  h1: { size: 24, line: 32, weight: 600, tracking: -0.02 },
  h2: { size: 19, line: 26, weight: 600, tracking: -0.016 },
  h3: { size: 16, line: 24, weight: 600, tracking: -0.011 },
  body: { size: 15, line: 24, weight: 400, tracking: -0.009 },
  desc: { size: 14, line: 22, weight: 400, tracking: -0.006 },
  ui: { size: 13, line: 20, weight: 'ui', tracking: -0.003 },
  card: { size: 13, line: 18, weight: 500, tracking: -0.003 },
  label: { size: 12, line: 16, weight: 500, tracking: 0 },
  meta: { size: 12, line: 16, weight: 'ui', tracking: 0 },
  micro: { size: 11, line: 14, weight: 500, tracking: 0.005 },
  mono: { size: 13, line: 20, weight: 400, tracking: 0, family: 'mono' },
} as const satisfies Record<string, TextRole>;

/** The 4 px grid. */
export const spacing = [4, 8, 12, 16, 24, 32, 48] as const;

/** Radii by role: chip, kbd and checkbox; buttons, fields and rows; cards and toasts; menus; dialogs. */
export const radii = { xs: 4, sm: 6, md: 8, lg: 10, xl: 12 } as const;

export const heights = {
  'sidebar-row': 28,
  'menu-item': 30,
  'list-row': 36,
  button: 28,
  'button-dense': 24,
  field: 32,
  'field-dense': 28,
  header: 44,
  'drawer-header': 52,
} as const;

/** Milliseconds, visual.md §7. With reduced motion only fades of up to `reduced` remain. */
export const durations = {
  hover: 100,
  popover: 140,
  palette: 160,
  scrim: 120,
  section: 120,
  move: 150,
  'drawer-in': 200,
  'drawer-out': 160,
  'toast-in': 180,
  'toast-out': 140,
  save: 120,
  reduced: 80,
} as const;

export const easings = {
  standard: 'cubic-bezier(.2, .8, .2, 1)',
  out: 'ease-out',
} as const;
