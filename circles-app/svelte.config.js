import adapter from '@sveltejs/adapter-auto';
import adapterNetlify from '@sveltejs/adapter-netlify';
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
    adapter: process.env.NETLIFY_BUILD === 'true' 
      ? adapterNetlify() 
      : adapter({
          pages: 'build',
          assets: 'build',
          fallback: 'index.html', 
          precompress: false,
          strict: true
        }),
  },
};

export default config;
