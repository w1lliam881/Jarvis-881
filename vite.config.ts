import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "preview"-läget bygger allt till en enda HTML-fil (för förhandsvisning som Artifact).
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
  base: './',
  build: { outDir: mode === 'preview' ? 'dist-preview' : 'dist' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
}));
