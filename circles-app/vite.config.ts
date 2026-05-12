import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      exclude: ['fs'],
      globals: {
        Buffer: true,
        process: true,
      },
      protocolImports: true,
    }) as PluginOption,
    sveltekit() as PluginOption,
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
  ssr: {
    // @safe-global/protocol-kit is CJS and its internal require('abitype')
    // gets converted to a default import that ESM-only abitype doesn't export.
    // Externalizing lets Node handle the interop at runtime.
    // The app is SSR-disabled (ssr:false) so these aren't needed server-side.
    external: ['@safe-global/protocol-kit', '@safe-global/safe-core-sdk-types', 'abitype'],
  },
  build: {
    rollupOptions: {
      // With adapter-node, polyfill shims can be externalized (Node resolves at runtime).
      // With adapter-static, they MUST be bundled — browsers can't resolve bare specifiers.
      ...(process.env.ADAPTER === 'node'
        ? { external: (id: string) => id.includes('vite-plugin-node-polyfills/shims') }
        : {}),
    },
  },
});
