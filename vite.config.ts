import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: 'web',
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:5777' }
  }
})
