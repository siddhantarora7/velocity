import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend's CORS allowlist only permits localhost:5173 and :3000,
// so pin the dev server to 5173 and fail loudly if it's taken.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
})
