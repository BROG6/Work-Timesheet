import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // CRITICAL for Capacitor WebViews
  plugins: [
    react()
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
