import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
  server: {
    allowedHosts: ['6f38c989-0379-48bd-9530-d8ad7a4a547a-00-1irbrbkggz0ze.kirk.replit.dev'],
  },
});
