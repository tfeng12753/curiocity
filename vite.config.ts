import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Lets the frontend always call a relative /api/speak; in dev that's
      // this proxy, in prod it's VITE_API_ENDPOINT pointing at the real host.
      '/api': 'http://localhost:8787',
    },
  },
});
