import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// Vite 7 tries to run its CSS transform pipeline on every *.css request, including
// ones that TinyMCE's runtime makes for its own skin assets in /public/tinymce/.
// Those requests arrive with Vite's "?direct" query param appended, which causes Vite
// to throw "This file is in /public … should not be imported from source code".
// Stripping any query string from /tinymce/** paths before the transform middleware
// runs makes Vite serve them as plain static files instead.
const tinymceStaticMiddleware = {
  name: 'tinymce-static',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && req.url.startsWith('/tinymce/') && req.url.includes('?')) {
        req.url = req.url.split('?')[0]
      }
      next()
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tinymceStaticMiddleware],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(rootDir, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(rootDir, 'node_modules/react/jsx-dev-runtime.js'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/runtime': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:3001',
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
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
      },
    },
    assetsInlineLimit: 4096,
  },
})
