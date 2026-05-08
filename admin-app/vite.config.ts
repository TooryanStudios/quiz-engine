import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

function resolveManualChunk(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, '/')

  if (normalizedId.includes('/src/lib/workhubRepo')) {
    return 'workhub-repo'
  }

  if (normalizedId.includes('/src/components/EmojiPickerPopover')) {
    return 'workhub-emoji'
  }

  if (
    normalizedId.includes('/src/pages/workhub/components/WorkhubDocEditor')
    || normalizedId.includes('/src/pages/workhub/hooks/useWorkhubDocEditorHandlers')
  ) {
    return 'workhub-doc-editor'
  }

  if (
    normalizedId.includes('/src/pages/workhub/components/MoodBoardDialog')
    || normalizedId.includes('/src/components/flowboard/')
  ) {
    return 'workhub-moodboard'
  }

  if (!normalizedId.includes('/node_modules/')) return undefined

  if (
    normalizedId.includes('/node_modules/react/')
    || normalizedId.includes('/node_modules/react-dom/')
    || normalizedId.includes('/node_modules/react-router-dom/')
  ) {
    return 'react-vendor'
  }

  if (
    normalizedId.includes('/node_modules/firebase/app/')
    || normalizedId.includes('/node_modules/firebase/auth/')
  ) {
    return 'firebase-app'
  }

  if (normalizedId.includes('/node_modules/firebase/firestore/')) {
    return 'firebase-firestore'
  }

  if (normalizedId.includes('/node_modules/@xyflow/')) {
    return 'workhub-flow'
  }

  if (
    normalizedId.includes('/node_modules/@tinymce/')
    || normalizedId.includes('/node_modules/tinymce/')
  ) {
    return 'workhub-tinymce'
  }

  if (normalizedId.includes('/node_modules/@excalidraw/')) {
    return 'workhub-excalidraw'
  }

  if (normalizedId.includes('/node_modules/pagedjs/')) {
    return 'pagedjs-vendor'
  }

  return undefined
}

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
  plugins: [react(), tailwindcss(), tinymceStaticMiddleware],
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'remotion',
      '@remotion/player',
      '@remotion/renderer',
      '@remotion/media-parser',
      '@remotion/google-fonts',
      '@remotion/streaming',
      '@remotion/licensing',
    ],
    alias: {
      components: path.resolve(rootDir, 'src/components'),
      react: path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(rootDir, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(rootDir, 'node_modules/react/jsx-dev-runtime.js'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
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
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: resolveManualChunk,
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
