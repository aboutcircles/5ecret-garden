const daisyui = require('daisyui');

module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        dmSans: ['DM Sans', 'sans-serif'],
        sans: ['"Inter Tight"', '"Inter"', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#38318b',
          secondary: '#4052d6',
          accent: '#37cdbe',
          neutral: '#3d4451',
          'base-100': '#ffffff',
        },
        'circles-clean': {
          primary: '#5849D4',
          'primary-content': '#FFFFFF',
          secondary: '#352899',
          'secondary-content': '#FFFFFF',
          accent: '#7BA887',
          'accent-content': '#FFFFFF',
          neutral: '#0F0A1E',
          'neutral-content': '#FBFAF7',
          'base-100': '#FFFFFF',
          'base-200': '#F6F5F2',
          'base-300': '#EFEDE7',
          'base-content': '#2A1F4A',
          info: '#5849D4',
          'info-content': '#FFFFFF',
          success: '#2D8A52',
          'success-content': '#FFFFFF',
          warning: '#B07014',
          'warning-content': '#FFFFFF',
          error: '#C44430',
          'error-content': '#FFFFFF',
          '--rounded-box': '14px',
          '--rounded-btn': '10px',
          '--rounded-badge': '9999px',
          '--tab-border': '1px',
          '--border-btn': '1px',
        },
      },
      'dark',
      'cupcake',
    ],
    darkTheme: 'light',
  },
};
