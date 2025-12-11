import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    nodePolyfills({
      exclude: ['fs'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    sveltekit(),
  ],
  resolve: {
    alias: {
      // Map the local SDK package for dev/build without publishing
      '@circles-market/sdk': fileURLToPath(new URL('../circles-market-sdk/src/index.ts', import.meta.url)),
    },
  },
});
