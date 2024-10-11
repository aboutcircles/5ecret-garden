import {sveltekit} from '@sveltejs/kit/vite';
import {defineConfig} from 'vite';
import {nodePolyfills} from 'vite-plugin-node-polyfills';

export default defineConfig({
    build: {
        rollupOptions: {
            external: ['vite-plugin-node-polyfills/shims/global',
                'vite-plugin-node-polyfills/shims/process',
                'vite-plugin-node-polyfills/shims/buffer',
                'process'], // Externalize the shim directly
        },
    },
    plugins: [
        nodePolyfills({
            exclude: ['fs'],
            globals: {
                Buffer: true,
                global: true,
                process: true
            },
            protocolImports: true
        }),
        sveltekit()
    ]
});
