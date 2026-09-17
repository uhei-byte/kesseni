import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * Dua entry berasingan:
 *   index.html        → Portal Ahli  (ringan — tiada carta, tiada modul admin)
 *   admin/index.html  → Panel Admin  (penuh)
 * Rollup memisahkan bundle secara automatik mengikut entry.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        portal: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'carta'
            if (id.includes('react-router')) return 'router'
            return 'react'
          }
        }
      }
    }
  }
})
