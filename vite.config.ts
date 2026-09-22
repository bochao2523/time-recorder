import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: '每日时间追踪',
        short_name: '时间站',
        description: '记录每天投入在学习、阅读和生活任务上的时间。',
        lang: 'zh-CN',
        start_url: './#/',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#e8dfc8',
        theme_color: '#063f32',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        importScripts: ['notification-sw.js'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
})
