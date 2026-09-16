import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/today/',
  plugins: [react()],
  server: {
    port: 5173,
    open: '/today/',
  },
  preview: {
    port: 4173,
  },
})
