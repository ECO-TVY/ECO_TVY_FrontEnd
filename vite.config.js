import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import mdiIcons from './build/mdiIcons.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // 코드에 쓰인 mdi-* 아이콘만 SVG로 번들 (src/plugins/icons.generated.js 생성)
    mdiIcons({ srcDir: 'src', outFile: 'src/plugins/icons.generated.js' }),
    vue(),
    vueDevTools(),
    vuetify({ autoImport: true }),
    // 홈 화면 설치 + 앱 화면(정적 파일) 오프라인 캐시. API 응답은 캐시하지 않는다.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'ECO_TVY — AI 분리배출 도우미',
        short_name: 'ECO_TVY',
        description: '사진 한 장으로 쓰레기 종류와 우리 동네 배출 요일을 알려드려요.',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F6F4',
        theme_color: '#2E7D32',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Spring Boot가 dist를 함께 서빙할 때 백엔드 주소로의 이동까지 SPA로 가로채지 않도록
        navigateFallbackDenylist: [/^\/api\//, /^\/swagger/, /^\/v3\/api-docs/, /^\/actuator/, /^\/oauth2\//, /^\/login\/oauth2\//],
        cleanupOutdatedCaches: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
