import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api and /uploads to the Express server so the
// browser sees a single origin — no CORS preflight, and the httpOnly refresh
// cookie is sent on same-origin requests without extra configuration.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  // `vite preview` serves the production build locally; proxying here means the
  // built bundle can be smoke-tested against the real API without a rebuild.
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          editor: ['react-quill'],
        },
      },
    },
  },
});
