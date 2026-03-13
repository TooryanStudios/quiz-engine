import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/play': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/runtime': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-app': ['firebase/app', 'firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
        },
      },
    },
  },
})
