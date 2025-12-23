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
      // Proxy semua request /api/* ke Go service lokal (unik port 18080)
      '/api': {
        target: 'http://localhost:18080',
        changeOrigin: true,
        // Hilangkan prefix /api jika Go tidak menggunakannya
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
