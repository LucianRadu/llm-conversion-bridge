import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import macros from 'unplugin-parcel-macros';

export default defineConfig(({ mode }) => ({
  plugins: [
    macros.vite(),
    react(),
    basicSsl()  // Auto-generates self-signed certificate for HTTPS
  ],
  envPrefix: ['VITE_', 'LCB_'],  // Expose LCB_ variables to client
  build: {
    target: ['es2022'],
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/\/macro-(.*)\.css$/.test(id) || /\/@react-spectrum\/s2\/.*\.css$/.test(id)) {
            return 's2-styles';
          }
        }
      }
    }
  },
  server: {
    port: parseInt(process.env.LCB_UI_FRONTEND_PORT || '4545', 10),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.LCB_UI_BACKEND_PORT || '3000'}`,
        changeOrigin: true,
        secure: false,  // Allow proxy to work with HTTP backend
      },
    },
  },
}));
