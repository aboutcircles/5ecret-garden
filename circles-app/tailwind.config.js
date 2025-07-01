import daisyui from 'daisyui';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        dmSans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        'circles-purple': '#251B9F',
        'circles-orange': '#FF491B',
        'circles-bg': '#FFF9F8',
        'circles-card': '#FFECE7',
        'circles-text': '#0F0B3B',
        'circles-text-muted': 'rgba(15, 11, 59, 0.4)',
        'circles-text-light': 'rgba(15, 11, 59, 0.65)',
        'circles-border': 'rgba(15, 11, 59, 0.1)',
        'circles-danger': '#EF4444',
        'circles-danger-bg': '#FEE2E2',
        'circles-danger-text': '#521A0D',
      },
      borderRadius: {
        'circles-input': '8px',
        'circles-button': '12px',
      },
      spacing: {
        'circles-padding': '12px',
        'circles-gap': '24px',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#251B9F',
          secondary: '#FF491B',
          accent: '#37cdbe',
          neutral: '#0F0B3B',
          'base-100': '#ffffff',
          'base-200': '#FFF9F8',
          'base-300': '#FFECE7',
          info: '#4052d6',
          success: '#37cdbe',
          warning: '#fbbd23',
          error: '#EF4444',
        },
      },
      'dark',
      'cupcake',
    ],
    darkTheme: 'light',
  },
};
