import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Работа без интернета в браузере: сервис-воркер кэширует само приложение,
    // фото туров и ответы базы. Карта кэшируется отдельно (src/offlineMap.js).
    // В приложении Capacitor файлы и так лежат на телефоне.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // свой public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        globIgnores: ['**/splash*.mp4'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // фото туров: с сайтов агентств и из хранилища supabase
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'osh-img', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 24 * 3600 } },
          },
          {
            // чтение туров/фактов: свежее из сети, без сети — последнее
            urlPattern: ({ url, request }) => request.method === 'GET' && url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'osh-api', networkTimeoutSeconds: 5, expiration: { maxEntries: 100, maxAgeSeconds: 14 * 24 * 3600 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'api.open-meteo.com',
            handler: 'NetworkFirst',
            options: { cacheName: 'osh-weather', networkTimeoutSeconds: 5, expiration: { maxEntries: 10, maxAgeSeconds: 2 * 24 * 3600 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'osh-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 3600 } },
          },
        ],
      },
    }),
  ],
  // воркер maplibre — ES-модуль (его создают с type: "module")
  worker: { format: "es" },
})
