import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.svx'],
  compilerOptions: {
    runes: true,
  },
  preprocess: [vitePreprocess(), mdsvex()],
  kit: {
    adapter: adapter({
      // No custom options needed; defaults are sufficient
    })
  }
};

export default config;
