import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The project lives in OneDrive, which can swallow file-change events, so the
    // dev server sometimes missed saves. Polling checks files on a timer instead.
    watch: { usePolling: true, interval: 300 },
  },
})
