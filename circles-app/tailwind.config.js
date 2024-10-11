/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        dmSans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: false,
    darkTheme: "light"
  }
}

