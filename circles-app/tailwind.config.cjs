const daisyui = require('daisyui');

module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        dmSans: ['DM Sans', 'sans-serif'],
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
          primary: '#4F46E5',
          secondary: '#7C3AED',
          accent: '#10B981',
          neutral: '#1F2937',
          'base-100': '#FFFFFF',
          'base-200': '#F8FAFC',
          'base-300': '#E5E7EB',
          info: '#38BDF8',
          success: '#16A34A',
          warning: '#F59E0B',
          error: '#EF4444',
          '--rounded-box': '12px',
          '--rounded-btn': '10px',
          '--tab-border': '1px',
        },
      },
      'dark',
      'cupcake',
    ],
    darkTheme: 'light',
  },
};