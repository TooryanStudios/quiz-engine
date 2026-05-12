import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = path.resolve(appDir, '../..')

export default defineConfig({
  root: appDir,
  envDir: repoRoot,
  publicDir: path.resolve(repoRoot, 'public'),
  cacheDir: path.resolve(repoRoot, 'node_modules/.vite-videdit'),
  plugins: [react(), tailwindcss()],
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
      '@qyan/api-client/http-renderer': path.resolve(repoRoot, 'packages/api-client/src/http-renderer.ts'),
      '@qyan/firebase-client': path.resolve(repoRoot, 'packages/firebase-client/src/index.ts'),
      '@qyan/platform-constants': path.resolve(repoRoot, 'packages/platform-constants/src/index.ts'),
      '@qyan/shared-types': path.resolve(repoRoot, 'packages/shared-types/src/index.ts'),
      components: path.resolve(repoRoot, 'src/components'),
      react: path.resolve(repoRoot, 'node_modules/react'),
      'react-dom': path.resolve(repoRoot, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(repoRoot, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(repoRoot, 'node_modules/react/jsx-dev-runtime.js'),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: path.resolve(repoRoot, 'dist-videdit'),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})