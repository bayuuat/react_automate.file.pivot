import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [devtools(), viteReact(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Proxy semua request /api/* ke Go service lokal (default port 8080)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Hilangkan prefix /api jika Go tidak menggunakannya
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
