import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.monkeycode-ai.live'],
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      '/quran-audio': {
        target: 'https://cdn.islamic.network/quran/audio',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/quran-audio/, ''),
      },
    },
  },
})
