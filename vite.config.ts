import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './client',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
  server: {
    port: 5005,
    // Allow local hostname used in deployment/test environments
    allowedHosts: ['crm.ubva.com.br', 'localhost', '127.0.0.1', '192.168.3.39'],
    proxy: {
      '/api': {
        target: 'http://localhost:5006',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5006',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
