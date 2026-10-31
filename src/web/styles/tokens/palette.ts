/**
 * The Sumário colour, shadow and weight tokens, approved in docs/interface/visual.md and generated in OKLCH by
 * docs/interface/prototipo/tokens.py. The hex values here are those of tokens.py; the comment after each
 * token keeps its OKLCH coordinates (light / dark) to guide a future change of palette, which updates both
 * files and records the decision.
 *
 * Names are CSS custom properties without the leading dashes. The specifications' Portuguese names map to
 * these in docs/etapas/08-fundacao.md ("Nomes").
 */

export type ThemeName = 'light' | 'dark';

interface ThemedValue {
  light: string;
  dark: string;
}

const tokens = {
  // Surfaces
  side: { light: '#F5F7FA', dark: '#0E1116' }, // 0.975 0.005 262 / 0.175 0.012 262
  bg: { light: '#FDFDFE', dark: '#13161C' }, // 0.995 0.005 262 / 0.200 0.012 262
  'raised-1': { light: '#FFFFFF', dark: '#191D22' }, // 1.000 0.000 262 / 0.228 0.012 262
  'raised-2': { light: '#FFFFFF', dark: '#1F2228' }, // 1.000 0.000 262 / 0.252 0.012 262
  'raised-3': { light: '#FFFFFF', dark: '#24272D' }, // 1.000 0.000 262 / 0.272 0.012 262
  hover: { light: '#F0F2F5', dark: '#1C1F25' }, // 0.960 0.005 262 / 0.240 0.012 262
  'hover-raised': { light: '#F2F3F7', dark: '#25292E' }, // 0.965 0.005 262 / 0.278 0.012 262
  pressed: { light: '#E9EBEF', dark: '#23262C' }, // 0.940 0.005 262 / 0.268 0.012 262
  selected: { light: '#E8EEFF', dark: '#202941' }, // 0.950 0.025 268 / 0.285 0.045 268
  line: { light: '#E1E3E6', dark: '#2B2E34' }, // 0.915 0.005 262 / 0.300 0.012 262
  'line-strong': { light: '#CFD1D4', dark: '#383C42' }, // 0.860 0.005 262 / 0.355 0.012 262
  'field-border': { light: '#8A8C8F', dark: '#6F737A' }, // 0.640 0.005 262 / 0.555 0.012 262

  // Text and icons
  text: { light: '#18191C', dark: '#ECF0F8' }, // 0.215 0.005 262 / 0.955 0.012 262
  'text-2': { light: '#47494C', dark: '#BEC3CA' }, // 0.405 0.005 262 / 0.815 0.012 262
  'text-3': { light: '#636568', dark: '#9A9FA6' }, // 0.505 0.005 262 / 0.700 0.012 262
  icon: { light: '#595B5E', dark: '#ADB1B9' }, // 0.470 0.005 262 / 0.760 0.012 262

  // Accent
  accent: { light: '#3856C8', dark: '#86A5FB' }, // 0.500 0.180 268 / 0.735 0.130 268
  'accent-solid': { light: '#3856C8', dark: '#4B6BD4' }, // 0.500 0.180 268 / 0.560 0.165 268
  'accent-solid-hover': { light: '#2F4ABA', dark: '#4260C8' }, // 0.460 0.180 268 / 0.525 0.165 268
  'on-accent': { light: '#FFFFFF', dark: '#FAFCFF' }, // 1.000 0.000 262 / 0.990 0.012 262

  // States and their bands
  late: { light: '#C22826', dark: '#F98078' }, // 0.530 0.190 27 / 0.735 0.150 25
  'late-bg': { light: '#FEF0EE', dark: '#3D1D1B' }, // 0.965 0.022 27 / 0.275 0.050 25
  ok: { light: '#21763C', dark: '#6AD18A' }, // 0.500 0.120 150 / 0.780 0.140 152
  'ok-bg': { light: '#E8F9EB', dark: '#152E1C' }, // 0.965 0.025 150 / 0.275 0.045 152
  warn: { light: '#8F5A04', dark: '#F2B95A' }, // 0.515 0.110 70 / 0.820 0.130 78
  'warn-bg': { light: '#FFF4E2', dark: '#342611' }, // 0.970 0.030 80 / 0.280 0.040 78
  conflict: { light: '#982F93', dark: '#E38FDB' }, // 0.500 0.180 330 / 0.760 0.140 330
  'conflict-bg': { light: '#FDEEFB', dark: '#352033' }, // 0.965 0.022 330 / 0.280 0.045 330
  danger: { light: '#C22826', dark: '#CA3638' }, // 0.530 0.190 27 / 0.560 0.185 25
  toast: { light: '#202224', dark: '#2B2E34' }, // 0.250 0.005 262 / 0.300 0.012 262
  'on-toast': { light: '#F8FAFE', dark: '#EDF2FA' }, // 0.985 0.005 262 / 0.960 0.012 262

  // Translucent accent, text selection and the dialog scrim
  'accent-25': { light: 'rgb(56 86 200 / .25)', dark: 'rgb(134 165 251 / .25)' },
  'accent-35': { light: 'rgb(56 86 200 / .35)', dark: 'rgb(134 165 251 / .35)' },
  'text-selection': { light: 'rgb(56 86 200 / .22)', dark: 'rgb(134 165 251 / .30)' },
  scrim: { light: 'rgb(16 18 27 / .18)', dark: 'rgb(4 6 10 / .55)' },

  // Elevation: shadows in the light theme, luminosity and a top light in the dark one
  'shadow-card': { light: '0 1px 0 rgb(16 18 27 / .04)', dark: '0 0 #0000' },
  'shadow-card-hover': { light: '0 1px 3px rgb(16 18 27 / .08)', dark: '0 0 #0000' },
  'shadow-float': {
    light: '0 4px 16px rgb(16 18 27 / .08), 0 1px 3px rgb(16 18 27 / .06)',
    dark: '0 8px 24px rgb(0 0 0 / .45)',
  },
  'shadow-drawer': { light: '0 -8px 24px rgb(16 18 27 / .08)', dark: '0 -12px 32px rgb(0 0 0 / .40)' },
  'top-light': { light: '0 0 #0000', dark: 'inset 0 1px 0 rgb(255 255 255 / .05)' },

  // Weight of interface text: light text on dark looks thinner
  'weight-ui': { light: '400', dark: '450' },

  // Fields and cards
  'card-hover': { light: '#FFFFFF', dark: '#25292E' },
  'field-bg': { light: '#F0F2F5', dark: '#191D22' },

  // Sidebar, variant A (docs/interface/sidebar.md)
  'sidebar-bg': { light: '#F2F4F9', dark: '#0E1116' },
  'sidebar-hover': { light: '#E9EBEF', dark: '#161A1F' },
  'sidebar-active': { light: '#E3E5EA', dark: '#1D2126' },

  // Label palette, for stage 10's labels: only a 7 px square takes the colour
  'label-blue': { light: '#1577C8', dark: '#6FB6FE' },
  'label-slate': { light: '#6B7587', dark: '#A7B2C5' },
  'label-purple': { light: '#835CBE', dark: '#BE9DF7' },
  'label-teal': { light: '#048681', dark: '#0DCBC3' },
  'label-amber': { light: '#A06604', dark: '#E5A14B' },
  'label-coral': { light: '#BA4E25', dark: '#F69370' },
  'label-lime': { light: '#4A871B', dark: '#8CC36D' },

  // Project marks: background and letter of each brand colour
  'mark-violet-bg': { light: '#EEE7FF', dark: '#382B4D' },
  'mark-violet-fg': { light: '#68449C', dark: '#C2A7F4' },
  'mark-ochre-bg': { light: '#FBE8D3', dark: '#462D0B' },
  'mark-ochre-fg': { light: '#7E4F04', dark: '#E5AB66' },
  'mark-gray-bg': { light: '#E5E8ED', dark: '#31363D' },
  'mark-gray-fg': { light: '#474D58', dark: '#B7BECB' },
  'mark-green-bg': { light: '#DCF2DF', dark: '#193B22' },
  'mark-green-fg': { light: '#046E30', dark: '#82CB92' },
} satisfies Record<string, ThemedValue>;

export type TokenName = keyof typeof tokens;
export type Palette = Record<TokenName, string>;

function theme(name: ThemeName): Palette {
  return Object.fromEntries(Object.entries(tokens).map(([token, value]) => [token, value[name]])) as Palette;
}

/** Every token's value in each theme. */
export const palette: Record<ThemeName, Palette> = { light: theme('light'), dark: theme('dark') };
