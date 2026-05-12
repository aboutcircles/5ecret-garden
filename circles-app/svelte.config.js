import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
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
    adapter: process.env.ADAPTER === 'node'
      ? adapterNode()
      : adapterStatic({ fallback: '200.html' }),
  },
};

export default config;
