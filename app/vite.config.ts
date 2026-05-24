import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Verbum Vitae',
        short_name: 'Verbum',
        description: 'Memorização bíblica com repetição espaçada',
        theme_color: '#0f1117',
        background_color: '#0f1117',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['**/bible-*.json', '**/bible-*.json.br'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: '/offline.html',
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 } },
          },
          {
            urlPattern: /\/bible-.+\.json(\.br)?$/,
            handler: 'CacheFirst',
            options: { cacheName: 'bible-data', expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|ico|webp)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/@tanstack/react-router') ||
            id.includes('node_modules/@tanstack/react-query')
          )
            return 'vendor'
          if (id.includes('node_modules/ts-fsrs')) return 'srs'
          if (id.includes('node_modules/dexie')) return 'dexie'
        },
      },
    },
  },
})
