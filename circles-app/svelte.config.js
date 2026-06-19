import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { execFileSync } from 'node:child_process';

// Build identifier surfaced in the UI (sidebar → Environment popup) and used by SvelteKit's
// version-change detection. Prefer the deploy commit Netlify exposes as COMMIT_REF, fall back
// to the local git short hash (via execFileSync — no shell, fixed args, no injection surface),
// then to 'dev'. A short SHA maps to an actual commit — unlike the default Date.now()
// timestamp, which is meaningless to a reader.
function buildId() {
  const ref = process.env.COMMIT_REF;
  if (ref) return ref.slice(0, 7);
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

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
    version: {
      name: buildId(),
    },
  },
};

export default config;
