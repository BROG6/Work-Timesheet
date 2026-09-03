import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
    })
  ]
});
