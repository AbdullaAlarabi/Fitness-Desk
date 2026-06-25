import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/fitness-desk/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'media/brand/fitness_desk_app_icon.png'],
      manifest: {
        name: 'Fitness Desk',
        short_name: 'Fitness Desk',
        description: 'Personal fitness dashboard for workouts, runs, body metrics, and consistency.',
        theme_color: '#061414',
        background_color: '#d2d3ce',
        display: 'standalone',
        start_url: '/fitness-desk/',
        icons: [
          {
            src: 'media/brand/fitness_desk_app_icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'media/brand/fitness_desk_app_icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'media/brand/fitness_desk_app_icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
});
