import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 50002,
    proxy: {
      '/api': {
        target: 'http://localhost:30003',
        changeOrigin: true,
      },
    },
  },
});
