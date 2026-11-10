import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async ({ command, mode }) => {
  const isVercel = process.env.VERCEL === 'true';
  let pwaPlugin = null;

  // Only import and initialize VitePWA if NOT building on Vercel
  if (!isVercel) {
    const { VitePWA } = await import('vite-plugin-pwa');
    pwaPlugin = VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SJR Builders Timesheets',
        short_name: 'SJR Time',
        description: 'Offline Timesheet & Job Tracking Tool for SJR Builders',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: 'https://via.placeholder.com/192',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://via.placeholder.com/512',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    });
  }

  return {
    base: './', // CRITICAL for Capacitor WebViews
    plugins: [
      react(),
      pwaPlugin
    ].filter(Boolean)
  };
});
