import { mergeConfig } from 'vite'
import config from './vite.config'

// Publish the standalone WorkHub bundle alongside existing hosting assets.
export default mergeConfig(config, {
  base: '/workhub-app/',
  publicDir: false,
  build: { outDir: '../../dist-workhub-hosting', emptyOutDir: true },
})
