// Circles Core — Design tokens
export const T = {
  page:         '#F6F5F2',
  pageDeep:     '#EFEDE7',
  surface:      '#FFFFFF',
  surfaceAlt:   '#FBFAF7',
  hairline:     'rgba(31,17,70,0.08)',
  hairlineSoft: 'rgba(31,17,70,0.05)',
  overlay:      'rgba(15,10,30,0.45)',

  ink:          '#0F0A1E',
  inkBody:      '#2A1F4A',
  inkMuted:     'rgba(15,10,30,0.62)',
  inkSubtle:    'rgba(15,10,30,0.40)',
  inkFaint:     'rgba(15,10,30,0.20)',

  primary:      '#5849D4',
  primaryHover: '#4A3CC2',
  primaryDeep:  '#352899',
  primarySoft:  '#EAE7FB',
  primaryFaint: '#F4F2FE',

  coral:        '#E8896A',  coralSoft:  '#FBE3D8',
  butter:       '#F4D27A',  butterSoft: '#FBEFCB',
  sage:         '#7BA887',  sageSoft:   '#DCEBDF',
  rose:         '#D4789F',  roseSoft:   '#F5DCE6',
  lilac:        '#B8AEEA',  lilacSoft:  '#EEEBFA',

  positive:     '#2D8A52',  positiveSoft: '#E1F1E7',
  negative:     '#C44430',  negativeSoft: '#FBE2DC',
  warning:      '#B07014',  warningSoft:  '#F8ECCC',

  fontDisplay:  '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  fontSans:     '"Inter Tight", "Inter", -apple-system, "SF Pro Text", system-ui, sans-serif',
  fontMono:     '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',

  radius: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 9999 },

  shadow: {
    xs: '0 1px 2px rgba(15,10,30,0.04)',
    sm: '0 1px 2px rgba(15,10,30,0.05), 0 2px 6px rgba(15,10,30,0.04)',
    md: '0 2px 6px rgba(15,10,30,0.06), 0 12px 28px rgba(15,10,30,0.08)',
    lg: '0 6px 16px rgba(15,10,30,0.08), 0 30px 70px rgba(15,10,30,0.14)',
    ring: '0 0 0 4px rgba(88,73,212,0.15)',
  },
};

export type TokenKey = keyof typeof T;
