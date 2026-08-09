import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://bioguard-api-lkvnq.ondigitalocean.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
