import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL('./index.html', import.meta.url)),
        content: fileURLToPath(new URL('./src/content/content.ts', import.meta.url)),
        background: fileURLToPath(new URL('./src/background.ts', import.meta.url)),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
})
