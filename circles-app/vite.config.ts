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
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  resolve: {
    alias: {
      // Fix SDK runner import of vite polyfill shims
      'vite-plugin-node-polyfills/shims/global': 'vite-plugin-node-polyfills/shims/global',
    },
  },
  build: {
    rollupOptions: {
      // Don't bundle vite-plugin-node-polyfills shims - let vite handle them
      external: (id) => id.includes('vite-plugin-node-polyfills/shims'),
    },
  },
});
