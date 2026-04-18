import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiBaseUrl = process.env.VITE_API_BASE_URL

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: apiBaseUrl ? {} : { '/api': 'http://localhost:3001' },
  },
})