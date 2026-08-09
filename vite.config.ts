import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'WBGT Check — Heat Safety Planner',
        short_name: 'WBGT Check',
        description:
          'WBGT forecast with state heat-policy activity flags for coaches and marching band directors.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0c0f14',
        theme_color: '#0c0f14',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['assets/index-*.{js,css}', '*.{ico,png}'],
        globIgnores: ['index.html'],
        navigateFallback: null,
        navigateFallbackDenylist: [/\.\w+$/],
        // No gtag runtime caching: CacheFirst on a cross-origin opaque
        // response can pin a failed fetch for its full TTL, and GA4 is the
        // success gauge for this experiment — let the network own it.
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'js-chunks',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Cache CSS with the same policy as JS. Caching only JS created a
            // mixed stale state after a redeploy: cached entry JS boots while
            // the old hashed stylesheet 404s, rendering the app unstyled.
            urlPattern: /\/assets\/.+\.css$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'css-chunks',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
