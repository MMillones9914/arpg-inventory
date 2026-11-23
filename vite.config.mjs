import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/module.mjs',
      formats: ['es'],
      fileName: () => 'module.mjs'
    },
    rollupOptions: {
      // Foundry provides these as globals; do not bundle them.
      external: ['foundry', 'game', 'Hooks', 'ui', 'canvas', 'CONFIG', 'CONST', 'Handlebars']
    }
  }
});
