import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // воркер maplibre — ES-модуль (его создают с type: "module")
  worker: { format: "es" },
})
