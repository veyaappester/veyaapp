/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Must match the GitHub repository name, because GitHub Pages serves the app
// from https://<user>.github.io/<repo>/. Override with VEYA_BASE if needed.
const base = process.env.VEYA_BASE ?? '/veyaapp/';

export default defineConfig({
  base,
  // React + Dexie + router are ~155 KB gzipped together; OCR is split out and loaded on Scan only.
  build: { chunkSizeWarningLimit: 600 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Veya — Dit liv. Ét overblik.',
        short_name: 'Veya',
        description: 'Køb, kvitteringer, abonnementer, regninger og frister samlet ét sted.',
        lang: 'da',
        start_url: base,
        scope: base,
        id: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        categories: ['finance', 'productivity', 'lifestyle'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell is precached; the large OCR files are cached the first time Scan uses them.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['ocr/**'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith(`${base}ocr/`),
            handler: 'CacheFirst',
            options: { cacheName: 'veya-ocr', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
